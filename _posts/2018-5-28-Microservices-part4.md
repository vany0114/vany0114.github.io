---
layout: post
title: Microservices and Docker with .Net Core and Azure Service Fabric - Part four
comments: true
excerpt: In the last post, we had the opportunity to made real our Microservices architecture and everything that we’ve talked about in these series of posts about that interesting topic, we implemented a solution using DDD, CQRS and Event Sourcing with the help of .Net Core, RabbitMQ, Dapper, Polly, etc., also, we analyzed the key points in our code in order to understand how works all pieces together and lastly, we took a look at Docker configuration and how it works in our local environment. In this last post, we’re going to talk about how to deploy our solution in a production environment using Azure Service Fabric as a microservices orchestrator and using other resources on the cloud, like Azure Service Bus, Sql Databases, and CosmosDB.
keywords: "asp.net core, Docker, Docker compose, linux, C#, c-sharp, DDD, .net core, dot net core, .net core 2.0, dot net core 2.0, .netcore2.0, asp.net, entity framework, entity framework core, EF Core, domain driven design, CQRS, command and query responsibility segregation, azure, microsoft azure, azure service fabric, service fabric, cosmos db, mongodb, sql server, rabbitmq, rabbit mq, amqp, asp.net web api, azure service bus, service bus"
published: false
---

In the [last post](http://elvanydev.com/Microservices-part3/), we had the opportunity to made real our Microservices architecture and everything that we've talked about in these series of posts about that interesting topic, we implemented a solution using [DDD](https://en.wikipedia.org/wiki/Domain-driven_design), [CQRS](https://martinfowler.com/bliki/CQRS.html) and [Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html) with the help of [.Net Core](https://dotnet.github.io/), [RabbitMQ](https://www.rabbitmq.com/), [Dapper](https://github.com/StackExchange/Dapper), [Polly](https://github.com/App-vNext/Polly), etc., also, we analyzed the key points in our code in order to understand how works all pieces together and lastly, we took a look at [Docker](https://www.Docker.com/) configuration and how it works in our local environment. In this last post, we're going to talk about how to deploy our solution in a production environment using [Azure Service Fabric](https://azure.microsoft.com/en-us/services/service-fabric/) as a microservices orchestrator and using other resources on the cloud, like [Azure Service Bus](https://docs.microsoft.com/en-us/azure/service-bus-messaging/service-bus-fundamentals-hybrid-solutions), [Sql Databases,](https://azure.microsoft.com/en-us/services/sql-database/) and [CosmosDB](https://docs.microsoft.com/en-us/azure/cosmos-db/introduction).

> You're going to need a Microsoft Azure account, if you don't have one, you can get it joining to [Visual Studio Dev Essentials](https://www.visualstudio.com/dev-essentials) program.

## Deploying Cloud Resources

The first step is to deploy our resources on Azure to use in a production environment, in our case, the Service Bus, the *Invoice* and *Web Site* SQL databases, the *Trip* MongoDB and of course the Service Fabric cluster. So, for simplicity, we're going to use [Azure CLI 2.0](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli?view=azure-cli-latest) to run pre-configured scripts and deploy these resources on Azure. The first thing is to log in with *Azure CLI*, the easiest way is using the [interactive log-in](https://docs.microsoft.com/en-us/cli/azure/authenticate-azure-cli?view=azure-cli-latest#interactive-log-in) through the `az login` command. After we’re logged in successfully we can run the deployment scripts, which are located in the [deploy](https://github.com/vany0114/microservices-dotnetcore-docker-servicefabric/tree/master/deploy) folder.

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

