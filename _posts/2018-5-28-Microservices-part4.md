---
layout: post
title: Microservices and Docker with .Net Core and Azure Service Fabric - Part four
comments: true
excerpt: In the last post, we had the opportunity to made real our Microservices architecture and everything that we’ve talked about in these series of posts about this interesting topic, we implemented a solution using DDD, CQRS and Event Sourcing with the help of .Net Core, RabbitMQ, Dapper, Polly, etc., also, we analyzed the key points in our code in order to understand how works all pieces together and lastly, we took a look at Docker configuration and how it works in our local environment. In this last post, we’re going to talk about how to deploy our solution in a production environment using Azure Service Fabric as a microservices orchestrator and using other resources on the cloud, like Azure Service Bus, Sql Databases, and CosmosDB.
keywords: "asp.net core, Docker, Docker compose, linux, C#, c-sharp, DDD, .net core, dot net core, .net core 2.0, dot net core 2.0, .netcore2.0, asp.net, entity framework, entity framework core, EF Core, domain driven design, CQRS, command and query responsibility segregation, azure, microsoft azure, azure service fabric, service fabric, cosmos db, mongodb, sql server, rabbitmq, rabbit mq, amqp, asp.net web api, azure service bus, service bus"
published: false
---

In the [last post](http://elvanydev.com/Microservices-part3/), we had the opportunity to made real our Microservices architecture and everything that we've talked about in these series of posts about this interesting topic, we implemented a solution using [DDD](https://en.wikipedia.org/wiki/Domain-driven_design), [CQRS](https://martinfowler.com/bliki/CQRS.html) and [Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html) with the help of [.Net Core](https://dotnet.github.io/), [RabbitMQ](https://www.rabbitmq.com/), [Dapper](https://github.com/StackExchange/Dapper), [Polly](https://github.com/App-vNext/Polly), etc., also, we analyzed the key points in our code in order to understand how works all pieces together and lastly, we took a look at [Docker](https://www.Docker.com/) configuration and how it works in our local environment. In this last post, we're going to talk about how to deploy our solution in a production environment using [Azure Service Fabric](https://azure.microsoft.com/en-us/services/service-fabric/) as a microservices orchestrator and using other resources on the cloud, like [Azure Service Bus](https://docs.microsoft.com/en-us/azure/service-bus-messaging/service-bus-fundamentals-hybrid-solutions), [Sql Databases,](https://azure.microsoft.com/en-us/services/sql-database/) and [CosmosDB](https://docs.microsoft.com/en-us/azure/cosmos-db/introduction).

> You're going to need a Microsoft Azure account, if you don't have one, you can get it joining to [Visual Studio Dev Essentials](https://www.visualstudio.com/dev-essentials) program.

## Deploying Cloud Resources

The first step is to deploy our resources on Microsoft Azure to use in a production environment, in our case, the Service Bus, the *Invoice* and *Web Site* SQL databases, the *Trip* MongoDB and of course the Service Fabric cluster. So, for simplicity, we're going to use [Azure CLI 2.0](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli?view=azure-cli-latest) to run pre-configured scripts and deploy these resources on Microsoft Azure. The first thing is to log in with *Azure CLI*, the easiest way is using the [interactive log-in](https://docs.microsoft.com/en-us/cli/azure/authenticate-azure-cli?view=azure-cli-latest#interactive-log-in) through the `az login` command. After we’re logged in successfully we can run the deployment scripts, which are located in the [deploy](https://github.com/vany0114/microservices-dotnetcore-docker-servicefabric/tree/master/deploy) folder.

In order to execute the following scripts you need to open a command window pointing to the `deploy` folder. I also recommend you create a [Resource Group](https://docs.microsoft.com/en-us/azure/architecture/cloud-adoption-guide/adoption-intro/resource-group-explainer) to group all these resources that we're going to create. For example, I created a resource called `duber-rs-group`, which is the one that I used to create the service bus, databases, etc. If you don't want to do that, you should specify the resource location and the script automatically will create the resource group as well: `create-resources.cmd servicebus\sbusdeploy duber-rs-group -c westus`

### Service Bus

Basically, this script creates a Service Bus namespace, a Service Bus topic and three Service Bus subscriptions to that topic (Trip, Invoice, and WebSite). You can create it from [Azure Portal](https://docs.microsoft.com/en-us/azure/service-bus-messaging/service-bus-dotnet-how-to-use-topics-subscriptions) if you prefer and also you can modify the script as you need it.

`create-resources.cmd servicebus\sbusdeploy duber-rs-group`

### SQL Databases

This script creates one SQL Server and two databases (InvoiceDb and WebSiteDb). Additionally, it creates firewall rules to allow to connect from your database client from any IP. (This is just for simplicity, but for a real production environment you might don't want to do that, instead, you should create specific rules for specific IPs). You can create it from [Azure Portal](https://docs.microsoft.com/en-us/azure/sql-database/sql-database-get-started-portal) if you prefer and also you can modify the script as you need it.

`create-resources.cmd sql\sqldeploy duber-rs-group`

### Cosmos Database

This script just creates the MongoDB which is used by Trip microservice. You can create it from [Azure Portal](https://docs.microsoft.com/en-us/azure/cosmos-db/create-mongodb-dotnet) if you prefer and also you can modify the script as you need it.

`create-resources.cmd cosmos\deploycosmos duber-rs-group`

## Building and publishing Docker Images

The next step is to build and publish the images to a [Docker Registry](https://hub.docker.com), in this case, we're going to use the public one, but if you have to keep private your images you can use a private registry on Docker or even in [Azure Container Registry](https://azure.microsoft.com/en-us/services/container-registry/). So, a registry is basically a place where you store and distribute your Docker images. 

Unlike the development environment where we were using an image for every component (SQL Server, RabbitMQ, MongoDB, WebSite, Payment Api, Trip Api and Invoice Api, in total 7 images), in our production environment we only going to have 2 images, which are going to be our microservices, the *Trip* and *Invoice* API's which in the end are going to be deployed in every node in our Service Fabric cluster.

First of all, we need to take in mind that there are several images that we're using to build our own images, either for develop and production environments. So, for Asp.Net Core applications, Microsoft has mainly two different images, [aspnetcore](https://hub.docker.com/r/microsoft/aspnetcore/) and [aspnetcore-build](https://hub.docker.com/r/microsoft/aspnetcore-build/), the main difference is the first one is optimized for production environments since it only has the runtime, while the other one contains the .Net Core SDK, Nuget Package client, Node.js, Bower and Gulp, so, for obvious reasons, the second one is much larger than the first one. Having said that, in a development environment the size of the image doesn't matter, but in production environment, when the cluster is going to be constantly creating instances dynamically to scale up, we need the size of the image will be small enough in order to improve the network performance when the Docker host is pulling the image down from Docker registry, also the docker host shouldn't spend time restore packages and compile at runtime, it's the opposite, it should be ready to run the container and that's it. Fortunately, Visual Studio takes care of that for us, let’s going to understand the  `DockerFile`.

```docker
FROM microsoft/aspnetcore:2.0 AS base
WORKDIR /app
EXPOSE 80

FROM microsoft/aspnetcore-build:2.0 AS build
WORKDIR /src
COPY microservices-netcore-docker-servicefabric.sln ./
COPY src/Application/Duber.Trip.API/Duber.Trip.API.csproj src/Application/Duber.Trip.API/
RUN dotnet restore -nowarn:msb3202,nu1503
COPY . .
WORKDIR /src/src/Application/Duber.Trip.API
RUN dotnet build -c Release -o /app

FROM build AS publish
RUN dotnet publish -c Release -o /app

FROM base AS final
WORKDIR /app
COPY --from=publish /app .
ENTRYPOINT ["dotnet", "Duber.Trip.API.dll"]
```
Visual Studio uses a [Docker Multi-Stage build](https://docs.docker.com/develop/develop-images/multistage-build/) which is the easiest and recommended way to build an optimized image avoiding create intermediate images and reducing significantly the complexity. So, every `FROM` is a stage of the build and each `FROM` can use a different base image. In this example, we have four stages, the first one pulls down the `microsoft/aspnetcore:2.0` image, the second one, performs the packages restore and build the solution, the third one, publish the artifacts and the final stage, it's actually the one that builds the image, the important thing here, is that it's using the `base` stage as the base image, which is actually the optimized one, and it's taking the binaries (compiled artifacts) from `publish` stage.

So, before to build the images, we need to set properly the environment variables that we're using in the `docker-compose.override.yml` file, which are mainly our connection strings for the cloud resources which we already deployed. To do that we need set them in a file called `.env`.

```docker
APP_ENVIRONMENT=Production
SERVICE_BUS_ENABLED=True
AZURE_INVOICE_DB=Your connection string
AZURE_SERVICE_BUS=Your connection string
PAYMENT_SERVICE_URL=Your Url
AZURE_TRIP_DB=Your connection string
AZURE_WEBSITE_DB=Your connection string
TRIP_SERVICE_BASE_URL=Your Url
```
>**TRIP_SERVICE_BASE_URL** should be the Service Fabric Cluster Url + the Port which we are using for *Trip* API, we're going to explain it later.

After we set these variables correctly, we can build the images, we can do that through the `docker-compose up` command, or we can let's Visual Studio do the work for us just building the solution in `release` mode. The main difference when you build your Docker project in `release` or `debug` mode, is that in `release` mode, the application build output is copied to the docker image
from `obj/Docker/publish/` folder, but in `debug` mode, the build output is not copied to the image, instead, a volume mount is created to the application project folder, and another one which contains debugging tools, that's why we can debug the Docker Containers in our local environment, and that's why we need to share the disk with Docker, because the docker container needs direct access to the project folder on your local disk in order to enable debugging.

Now that we already know the key points about Docker images and how Visual Studio manage them, we’re going to deploy them to Docker Registry. So, the first step is tagging the image, for example, you can tag your image with the current version or what do you want, in our case, I’m going to tag them with `prod`, to indicate they are the images for our production environment.

```docker
docker tag duber/trip.api vany0114/duber.trip.api:prod
docker tag duber/invoice.api vany0114/duber.invoice.api:prod
```
`duber/trip.api` and `duber/invoice.api` are the name of the images that we build locally, if you run `docker ps` or `docker images` commands, you can see them. `vany0114` is my user on Docker registry and the thing after `/` is the repository which I want to store the image, and at the end, you can see the tag, in this case, is `prod`.

```docker
docker push vany0114/duber.trip.api:prod
docker push vany0114/duber.invoice.api:prod
```
Finally, we push the images to Docker Registry, you can see these images on my [Doker profile](https://hub.docker.com/u/vany0114/).

> Build and publish images process should be done in your CI and CD process, and not manually like we’re doing it here.

## Creating the Service Fabric Cluster

