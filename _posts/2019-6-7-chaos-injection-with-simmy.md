---
layout: post
title: Simmy, the monkey for making chaos
comments: true
image: Simmy_jumbo.png
excerpt: Simmy is a chaos-engineering and fault-injection tool based on the idea of the Netflix Simian Army, integrating with the Polly resilience project for .NET. Simmy allows you to introduce a chaos-injection policy or policies at any location where you execute code through Polly.
keywords: "chaos engineering, resilience, resiliency, resiliency testing, fault injection, polly resilience, fault tolerance, fault based testing, fault tolerant, distributed systems, microservices, simmy, polly simmy, monkey, monkeys, chaos, simian army, inject latency, inject behavior, inject result, inject exception, chaos policies, monkey policies, transient-fault-handling, error-handling, transient fault handling, error handling, retry, circuit-breaker, circuit breaker, timeout, bulkhead isolation, fallback, PolicyWrap, netflix, simian, simian army, netflix simian army, .net, .net core, dotnet, dotnet core"
published: false
---

It's been a while since my [last post](http://elvanydev.com/resilience-with-polly/) (a lot of time I'd say) but the reason is that I’ve been working on very cool stuff ever since, one those is a new library/tool called [Simmy](https://github.com/Polly-Contrib/Simmy), which [we](#credits) started to develop more or less by that time (September 2018), so let me introduce that guy to you all!

## What Is Simmy?
[Simmy](https://github.com/Polly-Contrib/Simmy) is a chaos-engineering and fault-injection tool based on the idea of the [Netflix Simian Army](https://github.com/Netflix/SimianArmy), integrating with the [Polly](https://github.com/App-vNext/Polly) resilience project for .NET, so Simmy takes advantage of the power of Polly to helps you to answer these questions:

* Is my system resilient enough?
* Am I handling the right exceptions/scenarios?
* How will my system behave if X happens?
* How can I test without waiting for a handled (or even unhandled) exception to happen in my production environment?

## Why "Simmy"?
It's an analogy with Simian, rhyme with Polly and also give us the idea that the library ***Sim***ulates faults.

<p style="text-align: center !important; margin-bottom: 0px;">
    <img src="{{ '/assets/img/Simmy_monkey.png' | prepend: site.baseurl }}" alt=""> 
</p>

So, Simmy is a pirate monkey, like [Jack the monkey](https://disney.fandom.com/wiki/Jack_the_Monkey) from Pirates of the Caribbean, it's unstoppable :stuck_out_tongue_winking_eye:

## What is Chaos Engineering?
> [Chaos Engineering](http://principlesofchaos.org/) is the discipline of experimenting on a distributed system in order to build confidence in the system’s capability to withstand turbulent conditions in production. 

Given that distributed architectures nowadays leverage the most critical systems and most popular applications which we use every day, the chaos engineering and [its principles](http://principlesofchaos.org/) have become in an important matter, so much so that it's considered as a discipline and I'd say that for almost every SRE team, being aware of those principles is a must when it comes to truly guarantee the resilience and reliability of the systems.

As I mentioned earlier, Netflix is one of the most important contributors in the matter with its [Simian Army project](https://netflix.github.io/chaosmonkey/) which in a nutshell, is a framework to inject faults randomly in a production environment, such as stop instances, introduce latency or even simulates an outage of an entire availability zone allowing you to detect abnormal conditions and test the ability to survive them.

Another interesting project is [Waterbear](https://engineering.linkedin.com/blog/2017/11/resilience-engineering-at-linkedin-with-project-waterbear) from LinkedIn, which offers tools pretty similar than the Simian Army, but also things like simulate network, disk, CPU and memory failures, DNS pollution, Rack fails, etc. There are also a lot of [resources and tools](https://github.com/dastergon/awesome-chaos-engineering#notable-tools) out there that you can find very useful and compatible with the main cloud providers.

## How Simmy works?

As I said earlier, Simmy is based on Polly, so at the end of the day the building block of this little simian are the policies as well, which we've called ***Monkey Policies*** (or chaos policies), which means, as well as a *Policy* is the minimum unit of resilience for Polly, a *MonkeyPolicy* is the minimum unit of chaos for Simmy.

In other words, Simmy allows you to introduce a chaos-injection policy (Monkey Policy) or policies at any location where you execute code through Polly. So, for now, Simmy offers three chaos policies:

* **[Fault](https://github.com/Polly-Contrib/Simmy#Inject-fault):** Injects exceptions or substitute results, to fake faults in your system.
* **[Latency](https://github.com/Polly-Contrib/Simmy#inject-latency):** Injects latency into executions before the calls are made.
* **[Behavior](https://github.com/Polly-Contrib/Simmy#inject-behavior):** Allows you to inject any extra behaviour, before a call is placed.

All chaos policies (Monkey policies) are designed to inject behavior randomly (faults, latency or custom behavior), so a Monkey policy allows you to specify an injection rate between 0 and 1 (0-100%) thus, the higher is the injection rate the higher is the probability to inject them. Also it allows you to specify whether or not the random injection is enabled, that way you can release/hold (turn on/off) the monkeys regardless of injection rate you specify, it means, if you specify an injection rate of 100% but you tell to the policy that the random injection is disabled, it will do nothing.

## How can Simmy help me out?

It's well known that Polly helps us a ton to introduce resilience to our system making it more reliable, but I don't want to have to wait for expected or even unexpected failures to test it out. My resilience could be wrongly implemented because most of the time we handle transient errors, which is totally fine, but let's be honest, how many times we've seen those errors while we develop/debugging? then how are we making sure that the behavior after those kinds of errors is the one that we expect? through the unit test, hopefully? so, are unit tests enough to make sure that the whole workflow is working fine and the underlying chain of calls/dependencies are going to degrade gracefully? Also, testing all the scenarios or mocking failure of some dependencies is not straight forward, for example, a cloud SaaS or PaaS service.

So, how can Simmy help us to make sure that we’re doing right with our resilience strategies? the answer is too simple: making chaos! by simulating adverse conditions in our environments (ideally in environments different than development) and watching how our system behaves under those conditions without making assumptions, that way, we're going to realize if our resilience strategies are well implemented thus, we'll find out if our system is capable to withstand chaotic conditions.

Using Simmy, we can easily make things that usually aren't straight forward to do, such as:

* Mock failures of dependencies (any service dependency for example).
* Define when to fail based on some external factors - maybe global configuration or some rule.
* A way to revert easily, to control the blast radius.
* Production grade, to run this in a production or near-production system with automation.

So, no more introduction, it's time to see Simmy in action!

## Hands-on Lab
In order to stay this handy and funny as possible, let's base on the DUber [problem](http://elvanydev.com//Microservices-part1/#the-problem) and [solution](http://elvanydev.com/Microservices-part2/#production-environment-architecture) which is, as you know, a distributed architecture based on microservices using [.Net Core](https://dotnet.github.io/), [Docker](https://www.docker.com/), [Azure Service Fabric](https://azure.microsoft.com/en-us/services/service-fabric/), etc that I previously walked you through [four posts](http://elvanydev.com/Microservices-part1/).

### The example
We're going to see an example/approach of how to use Simmy in a kind of *real* but *simple* scenario over a distributed architecture to inject chaos in our system in a configurable and automatic way.

So, we're going to demonstrate the following patterns with Simmy:

* Configuring StartUp so that Simmy chaos policies are only introduced in builds for certain environments.
* Configuring Simmy chaos policies to be injected into the app without changing any code, using a UI/API to update/get the chaos configuration.
* Injecting faults or chaos automatically by using a *[WatchMonkey](#watchmonkey)* specifying a frequency and duration of the chaos.

> I based myself on the great [Dylan's example](https://github.com/Polly-Contrib/Polly.Contrib.SimmyDemo_WebApi) in order to configure Simmy chaos policies on StartUp, however, there are significant differences that I’ll explain later.

### The Architecture

<figure>
  <img src="{{ '/images/Simmy-Example-Architecture.png' | prepend: site.baseurl }}" alt=""> 
  <figcaption>Fig9. - DUber Architecture using Simmy</figcaption>
</figure>

As you can see, there are a couple of new components in the architecture (respect to the [old one](http://elvanydev.com/Microservices-part2/#production-environment-architecture)), let's see:

#### Chaos Settings Microservice
It's a Web API which takes care of to store and get the [chaos settings](#the-chaos-ui) using [Azure Redis Cache](https://azure.microsoft.com/en-in/services/cache/) as a repository. This is one of the main differences I mentioned earlier; instead of using `IOptionsSnapshot<>` to get the chaos settings, we're getting the settings from the API, which is more convenient in a distributed architecture where you have deployed your services in a cluster over dozens, hundreds or even thousands of instances of your services, so in that case it's not suitable/easy just changing the `appsettings` file in every instance deployed.

#### WatchMonkey
Is an [Azure Function](https://docs.microsoft.com/en-us/azure/azure-functions/functions-overview) with a [timer trigger](https://docs.microsoft.com/en-us/azure/azure-functions/functions-bindings-timer) which is executed every 5 minutes (value set arbitrarily for this example) in order to watch the monkeys (chaos settings/policies) set up trhough the [chaos UI](#the-chaos-ui). So, if the automatic chaos injection is enabled it releases all the monkeys for the given frequency within the time window configured (Max Duration), after that time window all the monkeys are caged (disabled) again. It also watches monkeys with a specific duration, allowing you to disable specific faults in a smaller time window.

>You can find the whole explanation about DUber architecture [here](http://elvanydev.com/Microservices-part2/).

### The Chaos UI
Is the monkeys administrator, which allows us to set up the [general chaos settings](#general-chaos-settings) and also [settings at operation level](#operations-chaos-settings). The UI uses the [Chaos Settings API](#chaos-settings-microservice) to store and get the settings.

#### General Chaos Settings

<figure>
  <img src="{{ '/images/Simmy-Example-general-chaos-settings.png' | prepend: site.baseurl }}" alt=""> 
  <figcaption>Fig9. - General chaos settings window</figcaption>
</figure>

***Enable Automatic Chaos Injection:***
Allows you to inject the chaos automatically based on a frequency and maximum chaos time duration.

***Frequency:***
A `Timespan` indicating how often the chaos should be injected.

***Max Duration:***
A `Timespan` indicating how long the chaos should take once is injected.

***Enable Cluster Chaos:***
Allows you to inject chaos at cluster level. (This example uses Azure Service Fabric as orchestrator)

***Percentage Nodes to Restart:***
An `int` between 0 and 100, indicating the percentage of nodes that should be restarted if cluster chaos is enabled.

***Percentage Nodes to Stop:***
An `int` between 0 and 100, indicating the percentage of nodes that should be stopped if cluster chaos is enabled.

***Resource Group Name:***
The name of the resource group where the VM Scale Set of the cluster belongs to.

***VM Scale Set Name:***
The name of the Virtual Machine Scale Set used by the cluster.

***Injection Rate:***
A `double` between 0 and 1, indicating what proportion of calls should be subject to failure-injection. For example, if 0.2, twenty percent of calls will be randomly affected; if 0.01, one percent of calls; if 1, all calls.

#### Operations Chaos Settings

<figure>
  <img src="{{ '/images/Simmy-Example-Architecture-operation-chaos-settings-exception.png' | prepend: site.baseurl }}" alt=""> 
  <figcaption>Fig9. - Operations chaos settings window</figcaption>
</figure>

***Operation:***
Which operation within the app these chaos settings apply to. Each call site in your codebase which uses Polly and Simmy can be tagged with an [OperationKey](#using-chaos-settings-factory-from-a-controllerservicerepositorywherever). This is simply a string tag you choose, to identify different call paths in your app, in our case, we're using an [enumeration](https://github.com/vany0114/chaos-injection-using-simmy/blob/master/src/Domain/Duber.Domain.SharedKernel/Chaos/OperationKeys.cs) located in the *Shared Kernel* project, where we've defined (arbitrarily) some operations to inject them some chaos.

***Duration:***
A `Timespan` indicating how long the chaos for a specific operation should take once is injected if Automatic Chaos Injection is enabled. (Optional) Should be less than the value configured for *MaxDuration*.

***Injection Rate:***
A `double` between 0 and 1, indicating what proportion of calls should be subject to failure-injection. For example, if 0.2, twenty percent of calls will be randomly affected; if 0.01, one percent of calls; if 1, all calls.

***Latency:***
If set, this much extra latency in ms will be added to affected calls, before the http request is made.

***Exception:***
If set, affected calls will throw the given exception. (The original outbound http/sql/whatever call will not be placed.)

***Status Code:***
If set, a result with the given http status code will be returned for affected calls. (The original outbound http call will not be placed.)

***Enabled:***
A master switch for this call site. When true, faults may be injected at this call site per the other parameters; when false, no faults will be injected.

### How the chaos is injected?

The best way to build [robust resilience strategies](http://elvanydev.com/resilience-with-polly/) using Polly is through the [PolicyWrap](http://elvanydev.com/resilience-with-polly/#the-power-of-policywrap), which at the end of the day makes up a set of policies working together as a single policy. So, the recommended way for introducing `Simmy` is to use one or more *Monkey Policies* as the innermost policies in the `PolicyWrap`. That way, they alter the usual outbound call at the last minute, substituting their fault or adding extra latency allowing us to test our resilience strategies and see how we're handling the chaos/faults injected by `Simmy`.

One of the simplest ways to add chaos-injection all across your app without changing existing configuration code is taking advantage of `PolicyRegistry` by storing all policies of each strategy in their respect registry (you might have several strategies with different policies to handle different scenarios, thus different `PolicyRegistry's`). 
So, in order to do that, we're going to add some code in `StartUp` class.

#### Setting up our Http resilience strategy
```c#
var policyRegistry = services.AddPolicyRegistry();
policyRegistry["ResiliencePolicy"] = GetHttpResiliencePolicy();

services.AddHttpClient<ResilientHttpClient>()
    .AddPolicyHandlerFromRegistry("ResiliencePolicy");
```

#### Setting up our SQL Azure DB strategy
```c#
services.AddSingleton<IPolicyAsyncExecutor>(sp =>
{
    var sqlPolicyBuilder = new SqlPolicyBuilder();
    return sqlPolicyBuilder
        .UseAsyncExecutor()
        .WithDefaultPolicies()
        .Build();
});
```

First of all, we need to add our resilience strategies, then we're going to inject them chaos policies (monkeys). As you can see, we're using the `SqlPolicyBuilder` we made [previously](http://elvanydev.com/resilience-with-polly/#putting-all-together-with-builder-pattern) because the idea is to reuse our resilience strategies!

```c#
if (env.IsDevelopment() == false)
{
    // injects chaos to our Http policies defined previously.
    var httpPolicyRegistry = app.ApplicationServices.GetRequiredService<IPolicyRegistry<string>>();
    httpPolicyRegistry?.AddHttpChaosInjectors();
    
    // injects chaos to our Sql policies defined previously.
    var sqlPolicyExecutor = app.ApplicationServices.GetRequiredService<IPolicyAsyncExecutor>();
    sqlPolicyExecutor?.PolicyRegistry?.AddChaosInjectors();
}
```

The `AddChaosInjectors/AddHttpChaosInjectors` extension methods on `IPolicyRegistry<>` simply takes every policy in your `PolicyRegistry` and wraps `Simmy` policies (as the innermost policy) inside. This allows us to inject `Simmy` into our app without changing any of our existing app configuration of `Polly` policies. This extension method configures the policies in the `PolicyRegistry` with `Simmy` policies which react to chaos configured trhough the UI.

### Putting all together

So, once you have configured your monkeys (chaos policies), 

## Credits!
> Simmy was the [brainchild](https://github.com/App-vNext/Polly/issues/499) of [@mebjas](https://github.com/mebjas) and [@reisenberger](https://github.com/reisenberger). The major part of the implementation was by [@mebjas](https://github.com/mebjas) and [myself](https://github.com/vany0114), with contributions also from [@reisenberger](https://github.com/reisenberger) of the Polly team.