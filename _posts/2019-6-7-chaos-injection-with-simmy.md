---
layout: post
title: Simmy, the monkey for making chaos
comments: true
image: Simmy_jumbo.png
excerpt: Simmy is a chaos-engineering and fault-injection tool based on the idea of the Netflix Simian Army, integrating with the Polly resilience project for .NET. Simmy allows you to introduce a chaos-injection policy or policies at any location where you execute code through Polly.
keywords: "chaos engineering, resilience, resiliency, resiliency testing, fault injection, polly resilience, fault tolerance, fault based testing, fault tolerant, distributed systems, microservices, simmy, polly simmy, monkey, monkeys, chaos, simian army, inject latency, inject behavior, inject result, inject exception, chaos policies, monkey policies, transient-fault-handling, error-handling, transient fault handling, error handling, retry, circuit-breaker, circuit breaker, timeout, bulkhead isolation, fallback, PolicyWrap, netflix, simian, simian army, netflix simian army, .net, .net core, dotnet, dotnet core"
published: false
---

It's been a while since my [last post](http://elvanydev.com/resilience-with-polly/) (a lot of time I'd say) but the reason is that I’ve been working on very cool stuff ever since, one those is a new library/tool called [Simmy](https://github.com/Polly-Contrib/Simmy), which we started to develop more or less by that time (September 2018), so let me introduce that guy to you all!

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

As I said earlier, Simmy is based on Polly, so at the end of the day the building block of this little simian are the policies as well, which we've called ***Monkey Policies*** (or chaos policies), which means, as well as a policy is the minimum unit of resilience for Polly, a policy is the minimum unit of chaos for Simmy.

In other words, Simmy allows you to introduce a chaos-injection policy (Monkey Policy) or policies at any location where you execute code through Polly. So, for now, Simmy offers three chaos policies:

* **[Fault](https://github.com/Polly-Contrib/Simmy#Inject-fault):** Injects exceptions or substitute results, to fake faults in your system.
* **[Latency](https://github.com/Polly-Contrib/Simmy#inject-latency):** Injects latency into executions before the calls are made.
* **[Behavior](https://github.com/Polly-Contrib/Simmy#inject-behavior):** Allows you to inject any extra behaviour, before a call is placed.

All chaos policies (Monkey policies) are designed to inject behavior randomly (faults, latency or custom behavior), so a Monkey policy allows you to specify an injection rate between 0 and 1 (0-100%) thus, the higher is the injection rate the higher is the probability to inject them. Also it allows you to specify whether or not the random injection is enabled, that way you can release/hold (turn on/off) the monkeys regardless of injection rate you specify, it means, if you specify an injection rate of 100% but you tell to the policy that the random injection is disabled, it will do nothing.

## How can Simmy help me out?

It's well known that Polly helps us a ton to introduce resilience to our system making it more reliable, but I don't want to have to wait for expected or even unexpected failures to test it out. My resilience could be wrongly implemented because most of the time we handle transient errors, which is totally fine, but let's be honest, how many times we've seen those error while we develop/debugging? then how are we making sure that the behavior after those kinds of errors is the one that we expect? through the unit test, hopefully? so, are unit tests enough to make sure that the whole workflow is working fine and the underlying chain of calls/dependencies going to degrade gracefully? Also, testing all the scenarios or mocking failure of some dependencies is not straight forward, for example, a cloud SaaS or PaaS service.

So, how can Simmy help us to make sure that we’re doing right with our resilience strategies? the answer is too simple: making chaos! by simulating adverse conditions in our environments (ideally in environments different than development) and watching how our system behaves under those conditions without making assumptions, that way, we're going to realize if our resilience strategies are well implemented thus, we'll find out if our system is capable to withstand chaotic conditions.

Using Simmy, we can easily make things that usually aren't straight forward to do, such as:

* Mock failures of dependencies (any service dependency for example).
* Define when to fail based on some external factors - maybe global configuration or some rule.
* A way to revert easily, to control the blast radius.
* Production grade, to run this in a production or near-production system with automation.

So, no more introduction, it's time to see Simmy in action!

## Hands-on Lab
In order to stay this handy and funny as possible, we're going to base on the [DUber problem/solution](http://elvanydev.com//Microservices-part1/#the-problem) which is, as you know, a distributed architecture based on microservices using [.Net Core](https://dotnet.github.io/), [Docker](https://www.docker.com/), [Azure Service Fabric](https://azure.microsoft.com/en-us/services/service-fabric/), etc that I previously walked you through [four posts](http://elvanydev.com/Microservices-part1/).

### The example
This example provides an example/approach of how to use Simmy in a kind of real but simple scenario over a distributed architecture to inject chaos in our system in a configurable and automatic way.

The example demonstrates the following patterns with Simmy:

* Configuring StartUp so that Simmy chaos policies are only introduced in builds for certain environments.
* Configuring Simmy chaos policies to be injected into the app without changing any code, using a UI/API to update/get the chaos configuration.
* Injecting faults or chaos automatically by using a *WatchMonkey* specifying a frequency and duration of the chaos.

### The Architecture

<figure>
  <img src="{{ '/images/Simmy-Example-Architecture.png' | prepend: site.baseurl }}" alt=""> 
  <figcaption>Fig9. - DUber Architecture using Simmy</figcaption>
</figure>


## Credits!
> Simmy was the [brainchild](https://github.com/App-vNext/Polly/issues/499) of [@mebjas](https://github.com/mebjas) and [@reisenberger](https://github.com/reisenberger). The major part of the implementation was by [@mebjas](https://github.com/mebjas) and [myself](https://github.com/vany0114), with contributions also from [@reisenberger](https://github.com/reisenberger) of the Polly team.