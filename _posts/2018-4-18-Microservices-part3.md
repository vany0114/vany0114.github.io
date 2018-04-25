---
layout: post
title: Microservices and Doker with .Net Core and Azure Service Fabric - Part three
comments: true
excerpt: In the previous post, we reviewed an approach, where we have two “different” architectures, one for the development environment and another to the production environment, why that approach could be useful, and how Doker can help us to implement them. Also, we talk about the benefits to use Docker and why .Net Core is the better option to start to work with microservices. Besides, we talked about of the most popular microservices orchestrator and why we choose Azure Service Fabric. Finally, we explained how Command and Query Responsibility Segregation (CQRS) and Event Sourcing comes into play in our architecture. In the end, we made decisions about what technologies we were going to use to implement our architecture, and the most important thing, why. So in this post we’re going to understand the code, finally!
keywords: "asp.net core, Doker, Doker compose, linux, C#, c-sharp, DDD, .net core, dot net core, .net core 2.0, dot net core 2.0, .netcore2.0, asp.net, entity framework, domain driven design, CQRS, command and query responsibility segregation, azure, microsoft azure, azure service fabric, service fabric, cosmos db, mongodb, sql server, rabbitmq, rabbit mq, amqp, asp.net web api, azure service bus, service bus"
published: false
---

In the [previous post](http://elvanydev.com/Microservices-part2/), we reviewed an approach, where we have two “different” architectures, one for the development environment and another to the production environment, why that approach could be useful, and how [Doker](https://www.Doker.com/) can help us to implement them. Also, we talk about the benefits to use Docker and why [.Net Core](https://dotnet.github.io/) is the better option to start to work with microservices. Besides, we talked about of the most popular microservice orchestrators and why we choose [Azure Service Fabric](https://azure.microsoft.com/en-us/services/service-fabric/). Finally, we explained how [Command and Query Responsibility Segregation (CQRS)](https://martinfowler.com/bliki/CQRS.html) and [Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html) comes into play in our architecture. In the end, we made decisions about what technologies we were going to use to implement our architecture, and the most important thing, why. So in this post we're going to understand the code, finally!

## Demo

#### Prerequisites and Installation Requirements
1. Install [Docker for Windows](https://docs.docker.com/docker-for-windows/install/).
2. Install [.NET Core SDK](https://www.microsoft.com/net/download/windows)
3. Install [Visual Studio 2017](https://www.visualstudio.com/downloads/) 15.5 or later.
4. Share drives in Docker settings (In order to deploy and debug with Visual Studio 2017)
5. Clone this [Repo](https://github.com/vany0114/microservices-dotnetcore-docker-servicefabric)
6. Set `docker-compose` project as startup project. (it's already set by default)
7. Press F5 and that's it!

> Note: The first time you hit F5 it'll take a few minutes, because in addition to compile the solution, it needs to pull/download the base images (SQL for Linux Docker, ASPNET, MongoDb and RabbitMQ images) and register them in the local image repo of your PC. The next time you hit F5 it'll be much faster.

## Understanding the Code

I would like to start explaining the solution structure, as I said in the earlier posts, we were going to use [Domain Driven Design (DDD)](https://en.wikipedia.org/wiki/Domain-driven_design), so the solution structure is based on DDD philosophy, let's take a look at that:

<figure>
  <img src="{{ '/images/Duber_solution_structure.png' | prepend: site.baseurl }}" alt=""> 
  <figcaption>Fig1. - Solution Structure</figcaption>
</figure>

*  **Application layer:** contains the microservices theirself, they're Asp.Net Web API projects. It's also a *tier* (physical layer) which will be deployed as a node(s) into an Azure Service Fabric cluster(s).
*  **Domain layer:** It's the core of the system, and holds the business logic. Each domain project represents a *bounded context*.
*  **Infrastructure layer:** It's a transversal layer which takes care of cross-cutting concerns.
*  **Presentation layer:** It's simply, the frontend of our system, which consumes the microservices.