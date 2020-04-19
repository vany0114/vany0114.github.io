---
layout: post
title: Microservices and Docker with .Net Core and Azure Service Fabric - Part three
comments: true
excerpt: In the previous post, we reviewed an approach, where we have two “different” architectures, one for the development environment and another one for the production environment, why that approach could be useful, and how Docker can help us to implement them. Also, we talked about the benefits of using Docker and why .Net Core is the better option to start working with microservices. Besides, we talked about of the most popular microservices orchestrator and why we choose Azure Service Fabric. Finally, we explained how Command and Query Responsibility Segregation (CQRS) and Event Sourcing comes into play in our architecture. In the end, we made decisions about what technologies we were going to use to implement our architecture, and the most important thing, why. So in this post we’re going to understand the code, finally!
keywords: "asp.net core, Docker, Docker compose, linux, C#, c-sharp, DDD, .net core, dot net core, .net core 3.1, dot net core 3.1, .netcore3.1, asp.net, entity framework, entity framework core, EF Core, domain driven design, CQRS, command and query responsibility segregation, azure, microsoft azure, azure service fabric, service fabric, cosmos db, mongodb, sql server, rabbitmq, rabbit mq, amqp, asp.net web api, azure service bus, service bus, kubernetes, k8s, signalR, signalr, redis, microservices example, microservices .net core example, microservices dotnet core example, microservices dotnet example, microservices .net example"
---

> I recently made some refactor/enhancements, take a look at the [ChangeLog](https://github.com/vany0114/microservices-dotnetcore-docker-servicefabric/blob/master/ChangeLog.md) to view the details. TL;DR: upgrades to .Net Core 3.1, Kubernetes support, add a new notifications service, Health checks implementation.

In the [previous post](http://elvanydev.com/Microservices-part2/), we reviewed an approach, where we have two “different” architectures, one for the development environment and another one for the production environment, why that approach could be useful, and how [Docker](https://www.Docker.com/) can help us to implement them. Also, we talked about the benefits of using Docker and why [.Net Core](https://dotnet.github.io/) is the better option to start working with microservices. Besides, we talked about of the most popular microservice orchestrators and why we choose [Azure Service Fabric](https://azure.microsoft.com/en-us/services/service-fabric/). Finally, we explained how [Command and Query Responsibility Segregation (CQRS)](https://martinfowler.com/bliki/CQRS.html) and [Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html) comes into play in our architecture. In the end, we made decisions about what technologies we were going to use to implement our architecture, and the most important thing, why. So in this post we're going to understand the code, finally!

## Demo

#### Prerequisites and Installation Requirements
1. Install [Docker for Windows](https://docs.docker.com/docker-for-windows/install/).
2. Install [.NET Core SDK](https://www.microsoft.com/net/download/windows).
3. Install [Visual Studio 2019](https://www.visualstudio.com/downloads/) 16.4 or later.
4. Share drives in Docker settings (In order to deploy and debug with Visual Studio 2019)
5. Clone this [Repo](https://github.com/vany0114/microservices-dotnetcore-docker-servicefabric)
6. Set `docker-compose` project as startup project. (it's already set by default)
7. Press F5 and that's it!

> Note: The first time you hit F5 it'll take a few minutes, because in addition to compile the solution, it needs to pull/download the base images (SQL for Linux Docker, ASPNET, MongoDb and RabbitMQ images) and register them in the local image repo of your PC. The next time you hit F5 it'll be much faster.

## Understanding the Code

I would like to start explaining the solution structure, as I said in the earlier posts, we were going to use [Domain Driven Design (DDD)](https://en.wikipedia.org/wiki/Domain-driven_design), so, the solution structure is based on DDD philosophy, let's take a look at that:

### Solution structure

<figure>
  <img src="{{ '/images/Duber_solution_structure.png' | prepend: site.baseurl }}" alt=""> 
  <figcaption>Fig1. - Solution Structure</figcaption>
</figure>

*  **Application layer:** contains our microservices, they're Asp.Net Web API projects. It's also a *tier* (physical layer) which will be deployed as Docker images, into a node(s) of an Azure Service Fabric cluster(s).
*  **Domain layer:** It's the core of the system and holds the business logic. Each domain project ***represents*** a *bounded context*.
*  **Infrastructure layer:** It's a transversal layer which takes care of cross-cutting concerns.
*  **Presentation layer:** It's simply, the frontend of our system, which consumes the microservices. (It's also a *tier* as well)

### Domain project structure

<figure>
  <img src="{{ '/images/Duber_domain_project_structure.png' | prepend: site.baseurl }}" alt=""> 
  <figcaption>Fig2. - Domain project Structure</figcaption>
</figure>

*  **Persistence:** Contains the object(s) which takes care of persisting/read the data, they could be a [DAO](https://en.wikipedia.org/wiki/Data_access_object), EF Context, or whatever you need to interact with your data store.
*  **Repository:** Contains our repositories (fully [Repository pattern](https://martinfowler.com/eaaCatalog/repository.html) applied), which consumes the *Persistence* layer objects, that by the way, you must have only ***one repository*** per *aggregate*.
*  **Model:** Holds the objects which take care of our business logic, such as Entities, Aggregates, Value Objects, etc.
*  **Events:** Here are placed all the domain events which our Aggregates or Entities trigger in order to communicate with other aggregates or whoever is interested to listen to those events.
*  **Services:** A standalone operation within the context of your domain, are usually accesses to external resources and they should be stateless. A good trick to define a service, is when you have an operation which its responsibility hasn’t a clear owner, for example, our *Invoice* aggregate needs the payment information, but is it responsible to perform the payment itself? so, it seems we have a service candidate.
*  **Commands:** You can't see it on the image, but in our *Trip* domain, we implement CQRS, so we have some commands and command handlers there, which manage the interaction between the *Event Store* and our domain through the *Aggregates*.

### Dependencies

Dependencies definitively matter when we're working with microservices and you should pay attention in the way you manage their dependencies if you don't want to end up killing the autonomy of the microservice. So, speaking about implementation details, there are people who like everything together in the same project which contains the microservice itself, even, there are people who like to have a solution per microservice. In my case, I like to have a separate project for pure domain stuff, because it gives you more flexibility and achieve total decoupling between your domain and the microservice implementation itself. In the end, the important thing is that your microservice ***has no dependencies with other domains***, so, in our case, *Duber.Invoice.API* and *Duber.Trip.API* only have a dependency with *Duber.Domain.Invoice* and *Duber.Domain.Trip* respectively. (Also, you can have infrastructure dependencies if you need, such as service bus stuff, etc) Regarding having a solution per microservice, I think it depends on how big your team is, but if your team is small enough (5 or 6 people) I think is just easier to have them together in one solution.

### Shared Kernel

Now that we're talking about dependencies, it's important to clarify the *Shared Kernel* concept. One of the downsides of DDD is the duplicate code, I mean, things like, events, value objects, enums, etc, (POCO or objects without behavior) because of the nature of DDD and the idea to make independent every bounded context, but, most of the times, it's not about duplicate code at all, since you can have, let's say, an *Invoice* object for the *Invoice context* and an *Invoice* object for *User context*, but, for both of them, the object itself is different because the needs and behavior for both context, are completely different. But, sometimes, you need kind of contract so all interested parties can talk the same "language", more than avoiding duplicate code, for example in our domain, the inclusion/deletion of *Trip* status or the inclusion/deletion of *Payment* method, could introduce a lot of validations or business rules in our entire domain, which can span over bounded contexts, not only the Trip but the Invoice, User and Driver bounded contexts. So, it's not about avoiding duplicate code, but keeping our domain consistent, so you would want to share those kind of things that represent the core of your system. Eric Evan says in his book: ***"The Shared Kernel cannot be changed as freely as other parts of the design. Decisions involve consultation with another team"***, because that kind of changes are not trivial, and as I said, it's not about reducing duplication at all, it's about making the integration between subsystem works consistently.

### Anti-Corruption layer

[ACL (Anti-Corruption layer)](https://docs.microsoft.com/en-us/azure/architecture/patterns/anti-corruption-layer) is also a concept from DDD, and it help us to communicate with other systems or sub-systems which obviously are outside of our domain model, such as legacy or external systems, keeping our domain consistent and avoiding the domain becomes [anemic](https://martinfowler.com/bliki/AnemicDomainModel.html). So, basically this layer translates our domain requests as the other system requires them and translates the response from the external system back in terms of our domain, keeping our domain isolated from other systems and consistent. So, to make it happen, we're just using an [Adapter](https://en.wikipedia.org/wiki/Adapter_pattern) and a Translator/Mapper and that's it (you will need an adapter per sub-system/external-system) also, you might need a Facade if you interact with many systems to encapsulate those complexity there and keep simple the communication from the domain perspective.

Let's take a look at our Adapter:

```c#
public class PaymentServiceAdapter : IPaymentServiceAdapter
{
    ...

    public async Task<PaymentInfo> ProcessPaymentAsync(int userId, string reference)
    {
        var uri = new Uri(
            new Uri(_paymentServiceBaseUrl),
            string.Format(ThirdPartyServices.Payment.PerformPayment(), userId, reference));

        var request = new HttpRequestMessage(HttpMethod.Post, uri);
        var response = await _httpClient.SendAsync(request);

        response.EnsureSuccessStatusCode();
        return PaymentInfoTranslator.Translate(await response.Content.ReadAsStringAsync());
    }
}
```
Translator is just an interpreter, so it needs to know the "language" of the external system, in order to translate the answer. This is just an example format.
```c#
public class PaymentInfoTranslator
{
    public static PaymentInfo Translate(string responseContent)
    {
        var paymentInfoList = JsonConvert.DeserializeObject<List<string>>(responseContent);
        if (paymentInfoList.Count != 5)
            throw new InvalidOperationException("The payment service response is not consistent.");

        return new PaymentInfo(
            int.Parse(paymentInfoList[3]),
            Enum.Parse<PaymentStatus>(paymentInfoList[0]),
            paymentInfoList[2],
            paymentInfoList[1]
        );
    }
}
```

### External System

Now that we know how to communicate with external systems, take a look at our fake payment system.

```c#
public class PaymentController : Controller
{
    private readonly List<string> _paymentStatuses = new List<string> { "Accepted", "Rejected" };
    private readonly List<string> _cardTypes = new List<string> { "Visa", "Master Card", "American Express" };

    [HttpPost]
    [Route("performpayment")]
    public IEnumerable<string> PerformPayment(int userId, string reference)
    {
        // just to add some latency
        Thread.Sleep(500);

        // let's say that based on the user identification the payment system is able to retrieve the user payment information.
        // the payment system returns the response in a list of string like this: payment status, card type, card number, user and reference
        return new[]
        {
            _paymentStatuses[new Random().Next(0, 2)],
            _cardTypes[new Random().Next(0, 3)],
            Guid.NewGuid().ToString(),
            userId.ToString(),
            reference
        };
    }
}
```

As you can see it's pretty simple, it just to simulate the external payment system.

### Implementing CQRS + Event Sourcing

As we know, we decided to use CQRS and Event Sourcing in our *Trip* microservice, so first of all, I have to say that I was looking for a good package to help me to not re-invent the wheel, and I found these nice packages, [Kledex](https://github.com/lucabriguglia/Kledex)(formerly Weapsy.CQRS/OpenCQRS) and [Kledex.Store.Cosmos.Mongo](https://www.nuget.org/packages/Kledex.Store.Cosmos.Mongo) which helped me a lot and by the way, they're very easy to use. Let's get started with the API, that's where the flow start.

```c#
[Route("api/v1/[controller]")]
public class TripController : Controller
{
    private readonly IDispatcher _dispatcher;

    ...

    /// <summary>
    /// Creates a new trip.
    /// </summary>
    /// <param name="command"></param>
    /// <returns>Returns the newly created trip identifier.</returns>
    /// <response code="201">Returns the newly created trip identifier.</response>
    [HttpPost]
    [ProducesResponseType(typeof(Guid), (int)HttpStatusCode.Created)]
    [ProducesResponseType((int)HttpStatusCode.BadRequest)]
    [ProducesResponseType((int)HttpStatusCode.InternalServerError)]
    public async Task<IActionResult> CreateTrip([FromBody]ViewModel.CreateTripCommand command)
    {
        // TODO: make command immutable
        // BadRequest and InternalServerError could be throw in HttpGlobalExceptionFilter
        var tripId = Guid.NewGuid();
        var domainCommand = _mapper.Map<CreateTripCommand>(command);
        domainCommand.AggregateRootId = tripId;
        domainCommand.Source = Source;
        domainCommand.UserId = _fakeUser;

        await _dispatcher.SendAsync(domainCommand);
        return Created(HttpContext.Request.GetUri().AbsoluteUri, tripId);
    }
}
```

The most important thing here is the `_dispatcher` object, which takes care of queuing our commands (in this case, in memory), triggers the command handlers, which interacts with our domain, through the Aggregates, and then, publish our domain events triggered from Aggregates/Entities in order to publish them in our Message Broker. No worries if it sounds kind of complicated, let's check every step.

* **Command Handlers**

```c#
public class CreateTripCommandHandlerAsync : ICommandHandlerAsync<CreateTripCommand>
{
    public async Task<CommandResponse> HandleAsync(CreateTripCommand command)
    {
        var trip = new Model.Trip(
            command.AggregateRootId,
            command.UserTripId,
            command.DriverId,
            command.From,
            command.To,
            command.PaymentMethod,
            command.Plate,
            command.Brand,
            command.Model);
        
        await Task.CompletedTask;
        return new CommandResponse
        {
            Events = trip.Events
        };
    }
}
```

So, this is our command handler where we manage the creation of a Trip when the `Dispatcher` triggers it. As you can see, we explicitly create a `Trip` object, but it's beyond that, since it's not just a regular object, it's an Aggregate. Let's take a look at what happens into the Aggregate.

* **Aggregate**

```c#
public class Trip : AggregateRoot
{
    ...

    public Trip(Guid id, int userId, int driverId, Location from, Location to, PaymentMethod paymentMethod, string plate, string brand, string model) : base(id)
    {
        if (userId <= 0) throw new TripDomainArgumentNullException(nameof(userId));
        if (driverId <= 0) throw new TripDomainArgumentNullException(nameof(driverId));
        if (string.IsNullOrWhiteSpace(plate)) throw new TripDomainArgumentNullException(nameof(plate));
        if (string.IsNullOrWhiteSpace(brand)) throw new TripDomainArgumentNullException(nameof(brand));
        if (string.IsNullOrWhiteSpace(model)) throw new TripDomainArgumentNullException(nameof(model));
        if (from == null) throw new TripDomainArgumentNullException(nameof(from));
        if (to == null) throw new TripDomainArgumentNullException(nameof(to));

        if (Equals(from, to)) throw new TripDomainInvalidOperationException("Destination and origin can't be the same.");

        _paymentMethod = paymentMethod ?? throw new TripDomainArgumentNullException(nameof(paymentMethod));
        _create = DateTime.UtcNow;
        _status = TripStatus.Created;
        _userId = userId;
        _driverId = driverId;
        _from = from;
        _to = to;
        _vehicleInformation = new VehicleInformation(plate, brand, model);

        AddEvent(new TripCreatedDomainEvent
        {
            AggregateRootId = Id,
            VehicleInformation = _vehicleInformation,
            UserTripId = _userId,
            DriverId = _driverId,
            From = _from,
            To = _to,
            PaymentMethod = _paymentMethod,
            TimeStamp = _create,
            Status = _status
        });
    }
}
```

So, the `AddEvent` method, queues a domain event which is published when the `Dispatcher` processes the command and save the event in our *Event Store*, in this case into MongoDB. So, when the event is published, we process that event through the *Domain Event Handlers*, let's check it out.

* **Domain Event Handlers**

```c#
public class TripCreatedDomainEventHandlerAsync : IEventHandlerAsync<TripCreatedDomainEvent>
{
    private readonly IEventBus _eventBus;
    private readonly IMapper _mapper;

    public async Task HandleAsync(TripCreatedDomainEvent @event)
    {
        var integrationEvent = _mapper.Map<TripCreatedIntegrationEvent>(@event);

        // to update the query side (materialized view)
        _eventBus.Publish(integrationEvent); // TODO: make an async Publish method.

        await Task.CompletedTask;
    }
}
```

Therefore, after a Trip is created we want to notify all the interested parties through the `Event Bus`. We need to map the `TripCreatedDomainEvent` to `TripCreatedIntegrationEvent` the first one is an implementation of *Kledex* library and the second one, it's the implementation of the integration events which our Event Bus expects.

> It's important to remember that using an Event Store we don't save the object state as usual in a RDBMS or NoSQL database, we save a series of events that enable us to retrieve the current state of the object or even a certain state at some point in time.

When we retrieve an object from our Event Store, we're re-building the object with all the past events, behind the scenes. That's why we have some methods called `Apply` into the aggregates, because that's how, in this case, *Kledex.Store.Cosmos.Mongo* re-creates the object, calling these methods for every event of the aggregate.

```c#
public class UpdateTripCommandHandlerAsync : ICommandHandlerAsync<UpdateTripCommand>
{
    private readonly IRepository<Model.Trip> _repository;

    public async Task<IAggregateRoot> HandleAsync(UpdateTripCommand command)
    {
        // this method, internally re-construct the Trip with all the events.
        var trip = await _repository.GetByIdAsync(command.AggregateRootId);
        ...
    }
    ...
}

public class Trip : AggregateRoot
{
    ...

    private void Apply(TripUpdatedDomainEvent @event)
    {
        _start = @event.Started;
        _end = @event.Ended;
        _status = @event.Status;
        _currentLocation = @event.CurrentLocation;
    }
}
```

> As a bonus code, I made an [API](https://github.com/vany0114/microservices-dotnetcore-docker-servicefabric/blob/master/src/Application/Duber.Trip.API/Controllers/EventStoreController.cs) to take advantage of our Event Store (remember, Event Store is read-only, is immutable, it's a source of truth), so think about how helpful and worthwhile it could be, take a look at this [awesome post](https://docs.microsoft.com/en-us/azure/architecture/patterns/event-sourcing) to understand the pros and cons about Event Sourcing.

* **Domain Event Handlers with MediatR**

As I said earlier, we are using `Kledex` in our *Trip* microservice to manage CQRS stuff, among them, domain events/handlers. But we still have to manage domain events/handlers in our *Invoice* microservice, that's why we're going to use [MediatR](https://github.com/jbogard/MediatR) to manage them. So, the idea is the same as described earlier, we have domain events which are dispatched through a dispatcher to all interested parties. So, the idea is pretty simple, we have an abstraction of an `Entity` which is the one that publishes domain events in our domain model (remember, an `Aggregate` is an `Entity` as well). So, every time an *Entity* calls `AddDomainEvent` method, we're just storing the event in memory.

```c#
public abstract class Entity
{
    private List<INotification> _domainEvents;
    public List<INotification> DomainEvents => _domainEvents;

    public void AddDomainEvent(INotification eventItem)
    {
        _domainEvents = _domainEvents ?? new List<INotification>();
        _domainEvents.Add(eventItem);
    }

    public void RemoveDomainEvent(INotification eventItem)
    {
        if (_domainEvents is null) return;
        _domainEvents.Remove(eventItem);
    }
}
```

So, the next step is publishing those events, but when? well, usually you might want to publish them only when you are sure the event itself just happened, since an event is about past actions. That's why we're publishing them just after save the data into the data base.

```c#
public class InvoiceContext : IInvoiceContext
{
    ...
    
    public async Task<int> ExecuteAsync<T>(T entity, string sql, object parameters = null, int? timeOut = null, CommandType? commandType = null)
        where T : Entity, IAggregateRoot
    {
        _connection = GetOpenConnection();
        var result = await _resilientSqlExecutor.ExecuteAsync(async () => await _connection.ExecuteAsync(sql, parameters, null, timeOut, commandType));

        // ensures that all events are dispatched after the entity is saved successfully.
        await _mediator.DispatchDomainEventsAsync(entity);
        return result;
    }
}

public static class MediatorExtensions
{
    public static async Task DispatchDomainEventsAsync(this IMediator mediator, Entity entity)
    {
        var domainEvents = entity.DomainEvents?.ToList();
        if (domainEvents == null || domainEvents.Count == 0)
            return;

        entity.DomainEvents.Clear();
        var tasks = domainEvents
            .Select(async domainEvent =>
            {
                await mediator.Publish(domainEvent);
            });

        await Task.WhenAll(tasks);
    }
}
```

As you can see, we're calling `DispatchDomainEventsAsync` method just after save the data into the data base. By the way, `InvoiceContext` was implemented using [Dapper](https://github.com/StackExchange/Dapper).

### Making our system resilient

Handling temporary errors properly in a distributed system is a key piece in order to guarantee resilience, and even more, when it comes to a cloud architecture. 

* **EF Core:** So, let's start talking about [EF Core](https://docs.microsoft.com/en-us/dotnet/standard/microservices-architecture/implement-resilient-applications/implement-resilient-entity-framework-core-sql-connections), that by the way, it's pretty easy, due to its Retrying Execution Strategy. (We're using EF Core in our User and Driver bounded context, and also to implement our materialized view)

```c#
services.AddDbContext<UserContext>(options =>
{
    options.UseSqlServer(
        configuration["ConnectionStrings:WebsiteDB"],
        sqlOptions =>
        {
            ...
            sqlOptions.EnableRetryOnFailure(maxRetryCount: 5, maxRetryDelay: TimeSpan.FromSeconds(30), errorNumbersToAdd: null);
        });
});
```
Also, you can customize [your own execution strategies](https://docs.microsoft.com/en-us/ef/core/miscellaneous/connection-resiliency#custom-execution-strategy) if you need it.

* **Taking advantage of Polly:** [Polly](https://github.com/App-vNext/Polly) it's a pretty cool library which help us to create our own policies in order to manage strategies for transient errors, such as retry, circuit breaker, timeout, fallback, etc. So, in our case, we're using *Polly* to improve the Http communication in order to communicate our frontend with our *Trip* microservice, and as you saw earlier, to communicate the *Invoice* microservice with the *Payment* external system. So, I followed the pattern I proposed in my other post [Building resilient applications with Polly](http://elvanydev.com/resilience-with-polly/) in order to build a specific resilience strategy, in our case an Azure SQL Server one. We're also using and [HttpClient + Polly](https://docs.microsoft.com/en-us/dotnet/architecture/microservices/implement-resilient-applications/implement-http-call-retries-exponential-backoff-polly) to make more resilient the HTTP calls.

```c#
// Resilient Async SQL Executor configuration.
services.AddSingleton<IPolicyAsyncExecutor>(sp =>
{
    var sqlPolicyBuilder = new SqlPolicyBuilder();
    return sqlPolicyBuilder
        .UseAsyncExecutor()
        .WithDefaultPolicies()
        .Build();
});

// Create (and register with DI) a policy registry containing some policies we want to use.
var policyRegistry = services.AddPolicyRegistry();
policyRegistry[ResiliencePolicy] = GetHttpResiliencePolicy(configuration);

// Resilient Http Invoker onfiguration.
// Register a typed client via HttpClientFactory, set to use the policy we placed in the policy registry.
services.AddHttpClient<ResilientHttpClient>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(50);
}).AddPolicyHandlerFromRegistry(ResiliencePolicy);
```

The other place where we're using *Polly* is in our `InvoiceContext`, which is implemented with [Dapper](https://github.com/StackExchange/Dapper).In this case, we're handling a very specific `SqlException`s throug our [SqlPolicyBuilder](https://github.com/vany0114/microservices-dotnetcore-docker-servicefabric/blob/master/src/Infrastructure/Duber.Infrastructure.Resilience.Sql/SqlPolicyBuilder.cs), which are the most common [SQL transient errors](https://docs.microsoft.com/en-us/azure/sql-database/sql-database-develop-error-messages).

```c#
public class InvoiceContext : IInvoiceContext
{
    private readonly IPolicyAsyncExecutor _resilientSqlExecutor;
    ...

    public async Task<IEnumerable<T>> QueryAsync<T>(string sql, object parameters = null, int? timeOut = null, CommandType? commandType = null)
        where T : Entity, IAggregateRoot
    {
        _connection = GetOpenConnection();
        return await _resilientSqlExecutor.ExecuteAsync(async () => await _connection.QueryAsync<T>(sql, parameters, null, timeOut, commandType));
    }
}
```

* **Service Bus:** The use of a message broker doesn't guarantee resilience itself, but it could help us a lot if we use it in a correct way. Usually message brokers have features to manage the *Time to live* for messages and also the *Message acknowledgment*, in our case, we're using [RabbitMQ](https://www.rabbitmq.com/) and [Azure Service Bus](https://docs.microsoft.com/en-us/azure/service-bus-messaging/service-bus-fundamentals-hybrid-solutions), both of them, offer us those capabilities. So, basically the *Time to live* feature allows us to keep our messages stored in the queues for a determined time and the *Message acknowledgment* feature allows us to make sure when really the consumer processed correctly the message, and then, only in that case, the message broker should get rid of that message. So, think about this, you could have a problem with your workers which read the queues, or clients which are subscribed to the topics, or even, those clients could receive the messages but something went wrong and the message couldn't be processed, thus, we wouldn't like to lose those messages, we would like to preserve those messages and process them successfully when we have fixed the problem or the transient error has gone.

```c#
public class EventBusRabbitMQ : IEventBus, IDisposable
{
    ...

    public void Publish(IntegrationEvent @event)
    {
        ...
        var policy = Policy.Handle<BrokerUnreachableException>()
            .Or<SocketException>()
            .WaitAndRetry(_retryCount, retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)), (ex, time) =>
            {
                _logger.LogWarning(ex.ToString());
            });

        using (var channel = _persistentConnection.CreateModel())
        {
            ...
            // to avoid lossing messages
            var properties = channel.CreateBasicProperties();
            properties.Persistent = true;
            properties.Expiration = "60000";

            policy.Execute(() =>
            {
                channel.BasicPublish(exchange: BROKER_NAME,
                                    routingKey: eventName,
                                    basicProperties: properties,
                                    body: body);
            });
        }
    }

    private IModel CreateConsumerChannel()
    {
        ...
        _queueName = channel.QueueDeclare().QueueName;
        var consumer = new EventingBasicConsumer(channel);
        consumer.Received += async (model, ea) =>
        {
            var eventName = ea.RoutingKey;
            var message = Encoding.UTF8.GetString(ea.Body);

            try
            {
                await ProcessEvent(eventName, message);

                // to avoid losing messages
                channel.BasicAck(deliveryTag: ea.DeliveryTag, multiple: false);
            }
            catch
            {
                // try to process the message again.
                var policy = Policy.Handle<InvalidOperationException>()
                    .Or<Exception>()
                    .WaitAndRetryAsync(_retryCount, retryAttempt => TimeSpan.FromSeconds(1),
                        (ex, time) => { _logger.LogWarning(ex.ToString()); });

                await policy.ExecuteAsync(() => ProcessEvent(eventName, message));
            }
        };

        ...
    }
}
```
Notice that we have a TTL of one minute for messages: `properties.Expiration = "60000"` and also we are performing a Message acknowledgment: `channel.BasicAck(deliveryTag: ea.DeliveryTag, multiple: false);`. Also, notice that we are using Polly as well to introduce more resilience.

> In our example we're using a direct communication from consumer to microservice, because it's a simple solution and we only have two microservices, but in more complex scenarios with dozens or more microservices, you should consider the use of a [Service Mesh](https://www.nginx.com/blog/what-is-a-service-mesh/) or an [API Gateway](http://microservices.io/patterns/apigateway.html).

### Updating the Materialized view

Remember that the materialized view is our *Query* side of CQRS implementation, the *Command* side is performed from *Trip* microservice. So, we have a materialized view into *Duber Website Database*, which summarizes in one single record per trip, all the information related with the trip, such as user, driver, invoice, payment and obviously the trip information. That's why the `Duber.WebSite` project has subscribed to the integrations events which comes from *Trip* and *Invoice* microservices.

```c#
public class Startup
{
    ...

    protected virtual void ConfigureEventBus(IApplicationBuilder app)
    {
        var eventBus = app.ApplicationServices.GetRequiredService<IEventBus>();
        eventBus.Subscribe<TripCreatedIntegrationEvent, TripCreatedIntegrationEventHandler>();
        eventBus.Subscribe<TripUpdatedIntegrationEvent, TripUpdatedIntegrationEventHandler>();
        eventBus.Subscribe<InvoiceCreatedIntegrationEvent, InvoiceCreatedIntegrationEventHandler>();
        eventBus.Subscribe<InvoicePaidIntegrationEvent, InvoicePaidIntegrationEventHandler>();
    }
}
```

As you can see, we're receiving notifications when a *Trip* is **created** or **updated**, also when an *Invoice* is **created** or **paid**. Let's take a look at some event handlers which take care of updating the materialized view.

```c#
public class InvoiceCreatedIntegrationEventHandler: IIntegrationEventHandler<InvoiceCreatedIntegrationEvent>
{
    ...

    public async Task Handle(InvoiceCreatedIntegrationEvent @event)
    {
        var trip = await _reportingRepository.GetTripAsync(@event.TripId);

        // we throw an exception in order to don't send the Acknowledgement to the service bus, probably the consumer read 
        // this message before that the created one.
        if (trip == null)
            throw new InvalidOperationException($"The trip {@event.TripId} doesn't exist. Error trying to update the materialized view.");

        trip.InvoiceId = @event.InvoiceId;
        trip.Fee = @event.Fee;
        trip.Fare = @event.Total - @event.Fee;

        try
        {
            await _reportingRepository.UpdateTripAsync(trip);
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Error trying to update the Trip: {@event.TripId}", ex);
        }
    }
}

public class TripCreatedIntegrationEventHandler : IIntegrationEventHandler<TripCreatedIntegrationEvent>
{
    ...

    public async Task Handle(TripCreatedIntegrationEvent @event)
    {
        var existingTrip = _reportingRepository.GetTrip(@event.TripId);
        if (existingTrip != null) return;

        var driver = _driverRepository.GetDriver(@event.DriverId);
        var user = _userRepository.GetUser(@event.UserTripId);

        var newTrip = new Trip
        {
            Id = @event.TripId,
            Created = @event.CreationDate,
            PaymentMethod = @event.PaymentMethod.Name,
            Status = "Created",
            Model = @event.VehicleInformation.Model,
            Brand = @event.VehicleInformation.Brand,
            Plate = @event.VehicleInformation.Plate,
            DriverId = @event.DriverId,
            DriverName = driver.Name,
            From = @event.From.Description,
            To = @event.To.Description,
            UserId = @event.UserTripId,
            UserName = user.Name
        };

        try
        {
            _reportingRepository.AddTrip(newTrip);
            await Task.CompletedTask;
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Error trying to create the Trip: {@event.TripId}", ex);
        }
    }
}
```

Notice that we're throwing an `InvalidOperationException` in order to tell the `EventBus` that we couldn't process the message. So, all the information we show from `Duber.WebSite` comes from the materialized view, which is more efficient than retrieving the information every time we need it from the microservices Api's, process it, map it and display it.

### A glance into a Docker Compose

I won't go deep with Docker Compose, in the next and last post, we'll talk more about that, but basically, [Docker Compose](https://docs.docker.com/compose/) help us to group and build all the images that compose our system. Also, we can configure dependencies between those images, environment variables, ports, etc.

```yml
version: '3'

services:
  duber.invoice.api:
      image: duber/invoice.api:${TAG:-latest}
      build:
        context: .
        dockerfile: src/Application/Duber.Invoice.API/Dockerfile
      depends_on:
      - sql.data
      - rabbitmq

  duber.trip.api:
    image: duber/trip.api:${TAG:-latest}
    build:
      context: .
      dockerfile: src/Application/Duber.Trip.API/Dockerfile
    depends_on:
      - nosql.data
      - rabbitmq

  duber.website:
    image: duber/website:${TAG:-latest}
    build:
      context: .
      dockerfile: src/Web/Duber.WebSite/Dockerfile
    depends_on:
      - duber.invoice.api
      - duber.trip.api
      - sql.data
      - rabbitmq

  sql.data:
    image: microsoft/mssql-server-linux:2017-latest

  nosql.data:
    image: mongo

  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - "15672:15672"
      - "5672:5672"

  externalsystem.payment:
    image: externalsystem/paymentservice:${TAG:-latest}
    build:
      context: .
      dockerfile: ExternalSystem/PaymentService/Dockerfile
```

As you can see, the `duber.website` image depends on `duber.invoice.api`, `duber.trip.api`, `sql.data` and `rabbitmq` images, which means, `duber.website` will not start until all those containers have already started. Also, with Docker Compose you can target multiple environments, for now, we're going to take a look at the `docker-compose.override.yml` which is for development environments by default.

```yml
services:
  duber.invoice.api:
    environment:
      - ASPNETCORE_ENVIRONMENT=Development
      - ConnectionString=${AZURE_INVOICE_DB:-Server=sql.data;Database=Duber.InvoiceDb;User Id=sa;Password=Pass@word}
      - EventBusConnection=${AZURE_SERVICE_BUS:-rabbitmq}
      - PaymentServiceBaseUrl=${PAYMENT_SERVICE_URL:-http://externalsystem.payment}
    ports:
      - "32776:80"

  duber.trip.api:
    environment:
      - ASPNETCORE_ENVIRONMENT=Development
      - EventStoreConfiguration__ConnectionString=${AZURE_TRIP_DB:-mongodb://nosql.data}
      - EventBusConnection=${AZURE_SERVICE_BUS:-rabbitmq}
    ports:
      - "32775:80"

  duber.website:
    environment:
      - ASPNETCORE_ENVIRONMENT=Development
      - ConnectionString=${AZURE_WEBSITE_DB:-Server=sql.data;Database=Duber.WebSiteDb;User Id=sa;Password=Pass@word}
      - EventBusConnection=${AZURE_SERVICE_BUS:-rabbitmq}
      - TripApiSettings__BaseUrl=${TRIP_SERVICE_BASE_URL:-http://duber.trip.api}
    ports:
      - "32774:80"

  sql.data:
    environment:
      - MSSQL_SA_PASSWORD=Pass@word
      - ACCEPT_EULA=Y
      - MSSQL_PID=Developer
    ports:
      - "5433:1433"

  nosql.data:
    ports:
      - "27017:27017"

  externalsystem.payment:
    environment:
      - ASPNETCORE_ENVIRONMENT=Development
    ports:
      - "32777:80"
```

>All environment variables defined here, will override the ones defined in the settings file on their respective projects.

So, in the end, this is only a containerized application, for now, but, have in mind that this way, our solution is ready to be deployed and consumed as microservices, as we followed all patterns and good practices to work successfully with distributed systems as microservices. So, stay tuned, because in our [next and last post](http://elvanydev.com/Microservices-part4/), we’re going to deploy our application using *Azure Service Fabric* and others resources on cloud, such as *Azure Service Bus*, *Azure Sql Database* and *CosmosDB*. I hope you’re enjoying this topic as much as me and also hope it will be helpful!
