---
layout: post
title: Building resilient applications with Polly
comments: true
excerpt: Handling errors properly have always been an important and kind of delicate task when it comes to making our applications more reliable. It is true that we can't know when an exception will happen, but it is true that we can control how our applications should behave under an undesirable state, such as a handled or unhandled exception scenario, but when I say that we can control the behavior when the application fails, I'm not only referring to log the error, I mean, that's important, but it's enough? Nowadays with the power of cloud computing and all of its advantages, we can build robust, high availability and scalable solutions, but cloud infrastructure brings with its own challenges as well, one of them is the transient errors. It is true that transient faults can occur in any environment, any platform or operating system, but transient faults are more likely in the cloud due to its nature.
keywords: "asp.net core, C#, c-sharp, .net core, dot net core, .net core 2.0, dot net core 2.0, .netcore2.0, asp.net, entity framework, entity framework core, EF Core, azure, microsoft azure, sql server, asp.net web api, polly, resilience, transient-fault-handling, error-handling, transient fault handling, error handling, retry, circuit-breaker, circuit breaker, timeout, bulkhead isolation, fallback, PolicyWrap, HttpClient, HttpClient factory, resiliency patterns"
published: false
---

Handling errors properly have always been an important and kind of delicate task when it comes to making our applications more reliable. It is true that we can't know when an exception will happen, but it is true that we can control how our applications should behave under an undesirable state, such as a handled or unhandled exception scenario, but when I say that we can control the behavior when the application fails, I'm not only referring to log the error, I mean, that's important, but it's enough? 

Nowadays with the power of cloud computing and all of its advantages, we can build robust, high availability and scalable solutions, but cloud infrastructure brings with its own challenges as well, one of them is the transient errors. It is true that transient faults can occur in any environment, any platform or operating system, but transient faults are more likely in the cloud due to its nature, for instance:

* Many resources in a cloud environment are shared, so in order to protect those resources, the access to them are subject to throttling, which means, they are regulated by a rate, let's say a maximum throughput or a specific load level, that's why some services could refuse connections at a given point of time.
* Since cloud environments distribute dynamically the load across the hardware and infrastructure components, and also recycle or replace them, services could face transient faults and temporary connection failures.
* And the most obvious reason, is the network condition, especially when communication crosses the Internet. So, very heavy traffic loads may slow communication, introduce additional connection latency and cause intermittent connection failures.

## Challenges
In order to achieve resilience your application must able to respond to the following challenges:

* Determine when a fault is likely to be transient or a terminal one. 
* Retry the operation if it determines that the fault is likely to be transient and keep track of the number of times the operation was retried.
* Use an appropriate strategy for the retries which specifies the number of times it should retry and the delay between each attempt.
* Take needed actions after a failed attempt or even in a terminal failure.
* Be able to fail faster or don't retry forever when the application determines the transient fault is still happening or it turns out the fault isn't transient. In a cloud infrastructure, resources and time are valuable and have a cost, so, you mightn't want to waste time and resources, trying to access a resource which definitively isn't available.

At the end of the day, if we are guarantying resiliency, implicitly we are guarantying reliability and availability (availability, since if it comes to a transient error, it means the resource is still available, so, we shouldn’t merely respond with an exception), so, that’s why is such important have in mind these challenges and handle them properly in order to build a better software, and here is where [Polly](http://www.thepollyproject.org) comes into play!

## What is Polly?
[Polly](https://github.com/App-vNext/Polly) is a .NET resilience and transient-fault-handling library that allows developers to express policies such as Retry, Circuit Breaker, Timeout, Bulkhead Isolation, and Fallback in a fluent and thread-safe manner.

## Getting Started

I won’t explain the basic concepts/usages of every feature of Polly because the guys of Polly project already have a great [documentation and examples](https://github.com/App-vNext/Polly/wiki), my intention is to show you how to build consistent and powerful resilient strategies based on real scenarios and also share with you my experience with Polly, which have been great so far, by the way.

So, we’re going to build a resilient strategy for SQL executions, more specifically, for Azure SQL Databases, but at the end of this post, you will see that you could build your own strategies for whatever resource or process you need to consume following the pattern which I’m going to purpose, for instance, you could have a resilient strategy for Azure Service Bus, Redis or Elasticsearch executions, etc. The idea is to build specialized strategies since all of them have different transient errors and thus, different ways to handle them. Let’s get started!

### Choosing the transient errors

The first thing we need to care about is be aware what are the transient errors for the API/Resource we're going to consume, in order to choose what are the ones we're going to handle. Generally, we can find them in the official documentation of the API. In our case, we're going to pick up some transient errors, based on the [official documentation of Azure SQL Databases](https://docs.microsoft.com/en-us/azure/sql-database/sql-database-develop-error-messages).

* **40613:** Database is not currently available.
* **40197:** Error processing the request, you receive this error when the service is down due to software or hardware upgrades, hardware failures, or any other failover problems. 
* **40501:** The service is currently busy.
* **49918:** Not enough resources to process request.
* **40549:** Session is terminated because you have a long-running transaction.
* **40550:** The session has been terminated because it has acquired too many locks.

So, in our example, we're going to handle the above Sql exceptions, but, of course, you can handle the exceptions as you need.

### The power of PolicyWrap

As I said earlier, I won't explain the basics of Polly, but we can say ~~I would say~~ that the building block of Polly are the policies. So, what's a policy? well, I would say a policy is the minimum unit of resilience. Having said that, Polly offers multiple resilience policies, such as [Retry](https://github.com/App-vNext/Polly/wiki/Retry), [Circuit-breaker](https://github.com/App-vNext/Polly/wiki/Circuit-Breaker), [Timeout](https://github.com/App-vNext/Polly/wiki/Timeout), [Bulkhead Isolation](https://github.com/App-vNext/Polly/wiki/Bulkhead), [Cache](https://github.com/App-vNext/Polly/wiki/Cache) and [Fallback](https://github.com/App-vNext/Polly/wiki/Fallback), which can be used individually to handle specific scenarios, but when you put them together, you can achieve a powerful resilient strategy, and here is where [PolicyWrap](https://github.com/App-vNext/Polly/wiki/PolicyWrap) comes into play.

PolicyWrap enables us to wrap and combine single policies in a nested fashion in order to build a powerful and consistent resilient strategy. So, Think about this scenario: 

*When a SQL transient error happens, you need to retry for maximum 5 times but, for every attempt, you need to wait exponentially, for example, the first attempt will wait for 2 seconds, the second attempt will wait for 4 seconds, etc. But you don’t want to waste resources for the new incoming requests, waiting and retrying when you already have retried 3 times and the error persists, instead, you want to fail faster and say to the new requests: “Stop doing it, it hurts” for 2 seconds. It means, after the third attempt, for the next 2 seconds, every request to that resource will fail fast instead to try to perform the action. Also, given that we’re waiting for an exponential period of time in every attempt, in the worst case, which is the fifth attempt, we will have waited more than 60 seconds + the time it takes the action itself, so, we don't want to wait "forever", instead, let’s say, we're willing to wait up to 2 minutes trying to execute an action, thus, we need an overal timeout for 2 minutes. Finally, if the action failed either because it exceeded the maximum retries or it turned out the error wasn't transient or it took more than 2 minutes, we need a way to degrade gracefully, it means, a last alternative when everything goes wrong.*

So, if you noticed, to achieve a consistent resilient strategy to handle that scenario, we will need at least 4 policies, such as [Retry](https://github.com/App-vNext/Polly/wiki/Retry), [Circuit-breaker](https://github.com/App-vNext/Polly/wiki/Circuit-Breaker), [Timeout](https://github.com/App-vNext/Polly/wiki/Timeout) and, [Fallback](https://github.com/App-vNext/Polly/wiki/Fallback) but, working as one single policy. Let's see how the flow of our policy will look like to understand better how it will work:

