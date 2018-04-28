---
layout: post
title: Microservices and Doker with .Net Core and Azure Service Fabric - Part three
comments: true
excerpt: In the previous post, we reviewed an approach, where we have two “different” architectures, one for the development environment and another one to the production environment, why that approach could be useful, and how Doker can help us to implement them. Also, we talk about the benefits to use Docker and why .Net Core is the better option to start to work with microservices. Besides, we talked about of the most popular microservices orchestrator and why we choose Azure Service Fabric. Finally, we explained how Command and Query Responsibility Segregation (CQRS) and Event Sourcing comes into play in our architecture. In the end, we made decisions about what technologies we were going to use to implement our architecture, and the most important thing, why. So in this post we’re going to understand the code, finally!
keywords: "asp.net core, Doker, Doker compose, linux, C#, c-sharp, DDD, .net core, dot net core, .net core 2.0, dot net core 2.0, .netcore2.0, asp.net, entity framework, domain driven design, CQRS, command and query responsibility segregation, azure, microsoft azure, azure service fabric, service fabric, cosmos db, mongodb, sql server, rabbitmq, rabbit mq, amqp, asp.net web api, azure service bus, service bus"
published: false
---

In the [previous post](http://elvanydev.com/Microservices-part2/), we reviewed an approach, where we have two “different” architectures, one for the development environment and another one to the production environment, why that approach could be useful, and how [Doker](https://www.Doker.com/) can help us to implement them. Also, we talk about the benefits to use Docker and why [.Net Core](https://dotnet.github.io/) is the better option to start to work with microservices. Besides, we talked about of the most popular microservice orchestrators and why we choose [Azure Service Fabric](https://azure.microsoft.com/en-us/services/service-fabric/). Finally, we explained how [Command and Query Responsibility Segregation (CQRS)](https://martinfowler.com/bliki/CQRS.html) and [Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html) comes into play in our architecture. In the end, we made decisions about what technologies we were going to use to implement our architecture, and the most important thing, why. So in this post we're going to understand the code, finally!

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
*  **Repository:** Contains our repositories (fully [Repository pattern](https://martinfowler.com/eaaCatalog/repository.html) applied), which consumes the *Persistence* layer objects, that by the way, you only must have ***one repository*** per *aggregate*.
*  **Model:** Holds the objects which take care of our business logic, such as Entities, Aggregates, Value Objects, etc.
*  **Events:** Here are placed all the domain events which our Aggregates or Entities triggers in order to communicate with other aggregates or whoever what's interested to listen to those events.
*  **Services:** A standalone operation within the context of your domain, are usually accesses to external resources and they should be stateless. A good trick to define a service, is when you have an operation which its responsibility hasn’t a clear owner, for example, our *Invoice* aggregate needs the payment information, but is it responsible to perform the payment itself? so, it seems we have a service candidate.
*  **Commands:** You can't see it on the image, but in our *Trip* domain, we implement CQRS, so we have some commands and command handlers there, which manage the interaction between the *Event Store* and our domain through the *Aggregates*.

### Dependencies

Dependencies definitively matter when we're working with microservices and you should pay attention in the way you manage their dependencies if you don't want to end up killing the autonomy of the microservice. So, speaking about implementation details, there are people who likes that everything is together in the same project which contains the microservice itself, even, there are people who likes to have a solution per microservice. In my case, I like to have a separate project for pure domain stuff, because it gives you more flexibility and achieve total decouple between your domain and the microservice implementation itself. In the end, the important thing is that your microservice ***doesn't have dependencies with other domains***, so, in our case, *Duber.Invoice.API* and *Duber.Trip.API* only have a dependency with *Duber.Domain.Invoice* and *Duber.Domain.Trip* respectively. (Also, you can have infrastructure dependencies if you need, such as service bus stuff, etc) Regarding have a solution per microservice, I think it depends on how big your team are, but if your team is small enough (5 or 6 people) I think is easier just have them together in one solution.

### Shared Kernel

Now we're talking about dependencies, it's important to clarify the *Shared Kernel* concept. One of the downsides of DDD is the duplicate code, I mean, things like, events, value objects, enums, etc, (POCO or objects without behavior) because of the nature of DDD and the idea to make independent every bounded context, but, most of the times, it's not about duplicate code at all, since you can have, let's say, an *Invoice* object for the *Invoice context* and an *Invoice* object for *User context*, but, for both of them, the object itself is different because the needs and behavior for both context, are completely different. But, sometimes, you need a kind of contract in order all interested parties can talk the same "language", more than to avoid to duplicate code, for example in our domain, the inclusion/deletion of *Trip* status or the inclusion/deletion of *Payment* method, could introduce a lot of validations or business rules in our entire domain, which can span over bounded contexts not only the Trip but the Invoice, User and Driver bounded contexts. So, it's not about to avoid duplicate code, but to keep our domain consistent, so you would want to share those kind of things that represent the core of your system. Eric Evan says in his book: ***The Shared Kernel cannot be changed as freely as other parts of the design. Decisions involve consultation with another team***, because that kind of changes are not trivial, and as I said, it's not about to reduce duplication at all, it's about to make the integration between subsystem works consistently.

### Anti-Corruption layer

[ACL (Anti-Corruption layer)](https://docs.microsoft.com/en-us/azure/architecture/patterns/anti-corruption-layer) is also a concept from DDD, and it help us to communicate with other systems or sub-systems which obviously are outside of our domain model, such as legacy or external systems, keeping our domain consistent and avoiding the domain becomes [anemic](https://martinfowler.com/bliki/AnemicDomainModel.html). So, basically this layer translates our domain requests as the other system requires them and translates the response from the external system back in terms of our domain, keeping our domain isolated from other systems and consistent. So, to make it happens, we're just using an [Adapter](https://en.wikipedia.org/wiki/Adapter_pattern) and a Translator/Mapper and that's it, (you will need an adapter per sub-system/external-system) also, you might need a Facade if you interact with many systems to encapsulate those complexity there and keep simple that communication from domain perspective.

Let's take a look at our Adapter (don't worries about  `_httpInvoker` object, we're going to explain it later)
```c#
public class PaymentServiceAdapter : IPaymentServiceAdapter
{
    ...

    public async Task<PaymentInfo> ProcessPaymentAsync(int userId, string reference)
    {
        // consumes Payment system
        var response = await _httpInvoker.InvokeAsync(async () =>
        {
            var client = new RestClient(_paymentServiceBaseUrl);
            var request = new RestRequest(ThirdPartyServices.Payment.PerformPayment(), Method.POST);
            request.AddUrlSegment(nameof(userId), userId);
            request.AddUrlSegment(nameof(reference), reference);

            return await client.ExecuteTaskAsync(request);
        });

        if (response.StatusCode != HttpStatusCode.OK)
            throw new InvalidOperationException("There was an error trying to perform the payment.", response.ErrorException);

        // translates payment system response to our domain model
        return PaymentInfoTranslator.Translate(response.Content);
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

Now we know how to communicate with external systems, take a look at our fake payment system.

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

As you can see it's pretty simple, it just simulate the external payment system.

### Implementing CQRS + Event Sourcing

As we know, we decided to use CQRS and Event Sourcing in our *Trip* microservice, so first of all, I have to say that I was looking for a good package to help me avoid to re-invent the wheel, and I found these nice packages, [Weapsy.CQRS](https://github.com/Weapsy/Weapsy.CQRS) and [Weapsy.Cqrs.EventStore.CosmosDB.MongoDB](https://www.nuget.org/packages/Weapsy.Cqrs.EventStore.CosmosDB.MongoDB) which helped me a lot and by the way, they're very easy to use. Let's get start it from the API, that's where the flow start.

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
    [Route("create")]
    [HttpPost]
    [ProducesResponseType(typeof(Guid), (int)HttpStatusCode.Created)]
    [ProducesResponseType((int)HttpStatusCode.BadRequest)]
    [ProducesResponseType((int)HttpStatusCode.InternalServerError)]
    public async Task<IActionResult> CreateTrip([FromBody]ViewModel.CreateTripCommand command)
    {
        ...
        await _dispatcher.SendAndPublishAsync<CreateTripCommand, Domain.Trip.Model.Trip>(domainCommand);
        return Created(HttpContext.Request.GetUri().AbsoluteUri, tripId);
    }
}
```

The most important thing here is the `_dispatcher` object, which takes care of enqueue our commands (in this case, in memory), triggers the command handlers, which interacts with our domain, through the Aggregates, and then, publish our domain events triggered from Aggregates and Entities in order publish them in our Message Broker. No worries if it sounds a kind of complicated, let's check every step.

* **Command Handlers**

```c#
public class CreateTripCommandHandlerAsync : ICommandHandlerWithAggregateAsync<CreateTripCommand>
{
    public async Task<IAggregateRoot> HandleAsync(CreateTripCommand command)
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
        return trip;
    }
}
```

So, this is our command handler where we manage the creation of a Trip when the `Dispatcher` triggers it. As you can see, we explicitly create a `Trip` object, but it's beyond that, since it's not just a regular object, is an Aggregate. Let's take a look at what happens into the Aggregate.

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

So, the `AddEvent` method, enqueue a domain event which is published when the `Dispatcher` processes the command and save the event in our *Event Store*, in this case into MongoDB. So, when the event is published, we process that event through the *Domain Event Handlers*, let's check it out.

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

Therefore, after a Trip is created we want to notify all the interested parties through the `Event Bus`. We need to map the `TripCreatedDomainEvent` to `TripCreatedIntegrationEvent` due to the first one is an implementation of *Weapsy.CQRS* library and the second one, it's the implementation of the integration events which our Event Bus expect it.

> It's important to remember that using an Event Store we don't save the object state as usual in a RDBMS or NoSQL database, we save a series of events that enable us to retrieve the current state of the object or even a certain state within a some point of the time.

When we retrieve an object from our Event Store, we're re-building the object with all the past events, behind the scenes. That's why we have some methods called `Apply` into the aggregates, because that's how, in this case, *Weapsy.Cqrs.EventStore* re-creates the object, calling these methods for every event of the aggregate.

```c#
public class UpdateTripCommandHandlerAsync : ICommandHandlerWithAggregateAsync<UpdateTripCommand>
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

> As a bonus code, I made an [API](https://github.com/vany0114/microservices-dotnetcore-docker-servicefabric/blob/master/src/Application/Duber.Trip.API/Controllers/EventStoreController.cs) to take advantage to our Event Store (remember, Event Store is read-only, is immutable, it's a source of truth), so think about how helpful and worthwhile it could be, take a look at this [awesome post](https://docs.microsoft.com/en-us/azure/architecture/patterns/event-sourcing) to understand the pros and cons about Event Sourcing.

* **Domain Event Handlers with MediatR**

As I said earlier, we are using `Weapsy.CQRS` in our *Trip* microservice to manage CQRS stuff, among them, domain events/handlers. But we still to manage domain events/handlers in our *Invoice* microservice, that's why we're going to use [MediatR](https://github.com/jbogard/MediatR) to manage them. So, the idea is the same as described earlier, we have domain events which are dispatched through a dispatcher to all interested parties. So, the idea is pretty simple, we have an abstraction of an `Entity` who is the one that publish domain events in our domain model (remember, an `Aggregate` is an `Entity` as well). So, every time an *Entity* calls `AddDomainEvent` method, we're just storing the event in memory.

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
        var result = await _connection.ExecuteAsync(sql, parameters, null, timeOut, commandType);

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

### Implementing Resilience



