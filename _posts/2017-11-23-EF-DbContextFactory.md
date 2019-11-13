---
layout: post
title: EF.DbContextFactory
comments: true
excerpt: I have worked with Entity Framework in a lot of projects, it’s very useful, it can make you more productive and it has a lot of great features that make it an awesome ORM, but like everything in the world, it has its downsides or issues. Sometime I was working in a project with concurrency scenarios, reading a queue from a message bus, sending messages to another bus with SignalR and so on. Everything was going good until I did a real test with multiple users connected at the same time, it turns out Entity Framework doesn’t work fine in that scenario. I did know that DbContext is not thread safe therefore I was injecting my DbContext instance per request following the Microsoft recommendatios so every request would has a new instance and then avoid problems sharing the contexts and state’s entities inside the context.
keywords: "asp.net core, EF.DbContextFactory, DbContextFactory, C#, c-sharp, entity framework core, .net core, dot net core, .net core 2.0, dot net core 2.0, .netcore2.0, asp.net core mvc, asp.net, entity framework, ninject, structuremap, unity
csharp, dotnet, dotnet-core, dotnetcore, entity-framework, entity-framework-core, entityframework, ninject, ninject-extension, dbcontext, netframework, concurrency, multiple-threads, nuget, efcore, factory, webapi, webapi2"
---

I have worked with Entity Framework in a lot of projects, it’s very useful, it can make you more productive and it has a lot of great features that make it an awesome ORM, but like everything in the world, it has its downsides or issues. Sometime I was working on a project with concurrency scenarios, reading a queue from a message bus, sending messages to another bus with SignalR and so on. Everything was going good until I did a real test with multiple users connected at the same time, it turns out Entity Framework doesn’t work fine in that scenario. I did know that `DbContext` is not thread safe therefore I was injecting my `DbContext` instance per request following the Microsoft recommendatios so every request would has a new instance and then avoid problems sharing the contexts and state’s entities inside the context, but it doesn't work in concurrency scenarios. I really had a problem, beause I didn’t want to hardcode `DbContext` creation inside my repository using the ***using*** statement to create and dispose inmediatly, but I had to support concurrency scenarios with Entity Framework in a proper way. So I remembered sometime studying the awesome [CQRS Journey](https://github.com/MicrosoftArchive/cqrs-journey) Microsoft project, where those guys were injecting their repositories like a factory and one of them explained me why. This was his answer:

> ***This is to avoid having a permanent reference to an instance of the context. Entity Framework context life cycles should be as short as possible. Using a delegate, the context is instantiated and disposed inside the class it is injected in and on every needs.***

So that's why after searching an standard and good solution without finding it (e.g a package to manage it easily), I decided to create my first open source project and contribute to this great community creating the [EF.DbContextFactory](https://github.com/vany0114/EF.DbContextFactory) that I am going to explain you bellow, what’s and how it works. By the way, I’m pretty glad about it and I hope it will be useful for you all!

## What EF.DbContextFactory is and How it works

With [EF.DbContextFactory](https://github.com/vany0114/EF.DbContextFactory) you can resolve easily your `DbContext` dependencies in a safe way injecting a factory instead of an instance itself, enabling you to work in [multi-thread contexts](https://msdn.microsoft.com/en-us/library/jj729737(v=vs.113).aspx?f=255&mspperror=-2147217396#Anchor_3) with Entity Framework or just work safest with DbContext following the Microsoft recommendations about the [DbContext lifecycle](https://msdn.microsoft.com/en-us/library/jj729737(v=vs.113).aspx?f=255&mspperror=-2147217396#Anchor_1) but keeping your code clean and testable using dependency injection pattern.

## The Problem
The Entity Framework DbContext has a well-known problem: it’s not thread safe. So it means, you can’t get an instance of the same entity class tracked by multiple contexts at the same time. For example, if you have a realtime, collaborative, concurrency or reactive application/scenario, using, for instance, SignalR or multiple threads in background (which are common characteristics in modern applications). I bet you have faced this kind of exception:

> ***"The context cannot be used while the model is being created. This exception may be thrown if the context is used inside the OnModelCreating method or if the same context instance is accessed by multiple threads concurrently. Note that instance members of DbContext and related classes are not guaranteed to be thread safe"***

## The Solutions
There are multiple solutions to manage concurrency scenarios from data perspective, the most common patterns are *Pessimistic Concurrency (Locking)* and *Optimistic Concurrency*, actually Entity Framework has an implementation of [Optimistic Concurrency](https://docs.microsoft.com/en-us/aspnet/mvc/overview/getting-started/getting-started-with-ef-using-mvc/handling-concurrency-with-the-entity-framework-in-an-asp-net-mvc-application). So these solutions are implemented usually on the database side or even in both, backend and database sides, but the problem with DbContext is that it is happening on memory, not even in the database. An approach that allows you to keep your code clean, follow good practices and keep on using Entity Framework and obviously works fine in multiple threads, is injecting a factory in your repositories/unit of work (or whatever you're using it ~~code smell~~) insetead of the instance itself and use it and dispose it as soon as possible.

## Key points
* Dispose DbContext immediately.
* Less consume of memory.
* Create the instance and connection database only when you really need it.
* Works in concurrency scenarios.
* Without locking.

## Getting Started

EF.DbContextFactory provides you extensions to inject the `DbContext` as a factory using the Microsoft default implementation of dependency injection for `Microsoft.Extensions.DependencyInjection` as well as integration with most popular dependency injection frameworks such as [Unity](https://github.com/unitycontainer/unity), [Ninject](http://www.ninject.org/), [Structuremap](http://structuremap.github.io/) ans [Simple Injector](https://simpleinjector.org/index.html). So there are five Nuget packages so far listed above that you can use like an extension to inject your DbContext as a factory.

All of nuget packages add a generic extension method to the dependency injection framework container called `AddDbContextFactory`. It needs the derived DbContext Type and as an optional parameter, the name or the connection string itself. ***If you have the default one (DefaultConnection) in the configuration file, you dont need to specify it***

You just need to inject your DbContext as a factory instead of the instance itself:

```cs
public class OrderRepositoryWithFactory : IOrderRepository
{
    private readonly Func<OrderContext> _factory;

    public OrderRepositoryWithFactory(Func<OrderContext> factory)
    {
        _factory = factory;
    }
    .
    .
    .
}
``` 

And then just use it when you need it executing the factory, you can do that with the `Invoke` method or implicitly just using the parentheses and that's it!

```cs
public class OrderRepositoryWithFactory : IOrderRepository
{
    .
    .
    .
    public void Add(Order order)
    {
        using (var context = _factory.Invoke())
        {
            context.Orders.Add(order);
            context.SaveChanges();
        }
    }
    
    public void DeleteById(Guid id)
    {
        // implicit way way
        using (var context = _factory())
        {
            var order = context.Orders.FirstOrDefault(x => x.Id == id);
            context.Entry(order).State = EntityState.Deleted;
            context.SaveChanges();
        }
    }
}
``` 

### EFCore.DbContextFactory
If you are using the Microsoft DI container you only need to install [EFCore.DbContextFactory](https://www.nuget.org/packages/EFCore.DbContextFactory/) nuget package. After that, you are able to access to the extension method from the `ServiceCollection` object. 

>`EFCore.DbContextFactory` supports `netstandard2.0` and `netstandard2.1`

The easiest way to resolve your DbContext factory is using the extension method called `AddSqlServerDbContextFactory`. It automatically configures your DbContext to use SqlServer and you can pass it optionally  the name or the connection string itself ***If you have the default one (DefaultConnection) in the configuration file, you dont need to specify it*** and your `ILoggerFactory`, if you want.

```cs
using EFCore.DbContextFactory.Extensions;
.
.
.
services.AddSqlServerDbContextFactory<OrderContext>();
``` 

Also you can use the known method `AddDbContextFactory` with the difference that it receives the `DbContextOptionsBuilder` object so you’re able to build your DbContext as you need.

```cs
var dbLogger = new LoggerFactory(new[]
{
    new ConsoleLoggerProvider((category, level)
        => category == DbLoggerCategory.Database.Command.Name
           && level == LogLevel.Information, true)
});

// ************************************sql server**********************************************
// this is like if you had called the AddSqlServerDbContextFactory method.
services.AddDbContextFactory<OrderContext>(builder => builder
    .UseSqlServer(Configuration.GetConnectionString("DefaultConnection"))
    .UseLoggerFactory(dbLogger));

// ************************************sqlite**************************************************
services.AddDbContextFactory<OrderContext>(builder => builder
    .UseSqlite(Configuration.GetConnectionString("DefaultConnection"))
    .UseLoggerFactory(dbLogger));

// ************************************in memory***********************************************
services.AddDbContextFactory<OrderContext>(builder => builder
    .UseInMemoryDatabase("OrdersExample")
    .UseLoggerFactory(dbLogger));
``` 

> You can find more examples [here](https://github.com/vany0114/EF.DbContextFactory.Samples)

### Ninject Asp.Net Mvc and Web Api
If you are using Ninject as DI container into your Asp.Net Mvc or Web Api project you must install [EF.DbContextFactory.Ninject](https://www.nuget.org/packages/EF.DbContextFactory.Ninject/) nuget package. After that, you are able to access to the extension method from the `Kernel` object from Ninject.

```cs
using EF.DbContextFactory.Ninject.Extensions;
.
.
.
kernel.AddDbContextFactory<OrderContext>();
``` 

### StructureMap Asp.Net Mvc and Web Api
If you are using StructureMap as DI container into your Asp.Net Mvc or Web Api project you must install [EF.DbContextFactory.StructureMap](https://www.nuget.org/packages/EF.DbContextFactory.StructureMap/) nuget package. After that, you are able to access the extension method from the `Registry` object from StructureMap.

```cs
using EF.DbContextFactory.StructureMap.Extensions;
.
.
.
this.AddDbContextFactory<OrderContext>();
``` 

### StructureMap 4.1.0.361 Asp.Net Mvc and Web Api or WebApi.StructureMap
If you are using StructureMap >= `4.1.0.361` as DI container or or WebApi.StructureMap for Web Api projects you must install [EF.DbContextFactory.StructureMap.WebApi](https://www.nuget.org/packages/EF.DbContextFactory.StructureMap.WebApi/) nuget package. After that, you are able to access the extension method from the `Registry` object from StructureMap. (In my opinion this StructureMap version is cleaner)

```cs
using EF.DbContextFactory.StructureMap.WebApi.Extensions;
.
.
.
this.AddDbContextFactory<OrderContext>();
``` 

### Unity Asp.Net Mvc and Web Api
If you are using Unity as DI container into your Asp.Net Mvc or Web Api project you must install [EF.DbContextFactory.Unity](https://www.nuget.org/packages/EF.DbContextFactory.Unity/) nuget package. After that, you are able to access the extension method from the `UnityContainer` object from Unity.

```cs
using EF.DbContextFactory.Unity.Extensions;
.
.
.
container.AddDbContextFactory<OrderContext>();
``` 

### SimpleInjector Asp.Net Mvc and Web Api
If you are using SimpleInjector as DI container into your Asp.Net Mvc or Web Api project you must install [EF.DbContextFactory.SimpleInjector](https://www.nuget.org/packages/EF.DbContextFactory.SimpleInjector/) nuget package. After that, you are able to access the extension method from the `Container` object from SimpleInjector.

```cs
using EF.DbContextFactory.SimpleInjector.Extensions;
.
.
.
container.AddDbContextFactory<OrderContext>();
``` 

## Examples :metal:

You can take a look at the [examples](https://github.com/vany0114/EF.DbContextFactory/tree/master/src/Examples) to see every extension in action, all you need is to run the migrations and that's it. Every example project has two controllers, one to receive a repository that implements the `DbContextFactory` and another one that doesn't, and every one creates and deletes orders at the same time in different threads to simulate the concurrency. So you can see how the one that doesn't implement the `DbContextFactory` throws errors related to concurrency issues.

<figure>
  <img src="{{ '/images/example.gif' | prepend: site.baseurl }}" alt=""> 
  <figcaption>Fig1. - EF.DbContextFactory in action!</figcaption>
</figure>

I hope will be useful for you all, I encourage you to contribute with the project if you like it, feel free to improve it or create new extensions for others dependency injection frameworks! 

You can take a look at the code from my GitHub repository: <https://github.com/vany0114/EF.DbContextFactory>
