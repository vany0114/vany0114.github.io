---
layout: post
title: SignalR Core and SqlTableDependency - Part One
comments: true
excerpt: Is very early to talk about SignalR Core but it's exciting too. With the recent releasing of .netcore 2.0 the last Microsoft Build we can test a lot of great improvements and new features, between of them, the new SignalR Core. (Or at least the approximation of what the SignalR Core team wants to build.) I have to warning that SignalR Core is on development process right now (as a matter of fact, while I was doing this demo I faced some issues because of the constant upgrades of SignalR Core team), so a bunch of things could change, but in some months (6 months at least) we can compare the progress and we could have an stable version of SignalR Core, meanwhile we can enjoy of this "version".
keywords: "asp.net core, signalR, signalR core, C#, c-sharp, entity framework core, .net core, dot net core, .net core 2.0, dot net core 2.0, .netcore2.0, asp.net core mvc, asp.net, entity framework, sqlDependency, SqlTableDependency, sql server, sql service broker"
---

> **Note:** I strongly recommend you to read [this post](http://elvanydev.com/SignalR-Core-Alpha/) when you finish reading this one, in order to get know the latest changes with the new SignalR Core Alpha version.

Is very early to talk about [SignalR Core](https://github.com/aspnet/SignalR) but it's exciting too. With the recent releasing of .netcore 2.0 the last [Microsoft Build](https://build.microsoft.com/) we can test a lot of great improvements and new features, between of them, the new SignalR Core. (Or at least the approximation of what the SignalR Core team wants to build.) I have to warning that SignalR Core is on development process right now (as a matter of fact, while I was doing this demo I faced some issues because of the constant upgrades of SignalR Core team), so a bunch of things could change, but in some months (6 months at least) we can compare the progress and we could have an stable version of SignalR Core, meanwhile we can enjoy of this "version".

## When do we could have a stable version?

The SignalR Core team announced a couple of possible dates to release the preview and the release version:
* Preview: June 2017
* Release: December 2017

So that means we're very close to the preview version!!!...maybe at the end of this month.


## Things what doesn't support SignalR Core anymore
Let's talk about what things we won't have anymore in SignalR Core with respect to Asp.Net SignalR and the most important thing, why?

#### No more Jquery and 3rd party library dependencies:

The web client will be pure javascript, actually it's made with [TypeScript](https://www.typescriptlang.org/) and as is well known TypeScript compiles a plane javascript, so we got the guarantee (thanks to TypeScript) that our web SignalR Core client is cross-browser, cross-host and cross-OS since the browser supports ECMAScript3. (fortunately all modern browsers support it)


#### No more auto-reconnect with message replay:

One of the reasons which ones the SignalR Core team decided to remove this feature it's because of the performance issues due to the server should keep a buffer per connection in order to store all messages and this way it can tries re-send it again to the client when the connection is restored. So you can imagine how the server works when there are a lot of clients and these clients lost a lot of messages. You can take a look at all the issues related with performance about this feature on [this link.](https://github.com/SignalR/SignalR/search?p=1&q=ring+buffer&type=Issues&utf8=%E2%9C%93)

Another common problem with the re-connection is that the message-id could be bigger than the message itself, due to that the re-connection request contains the last message-id received by the client, the groups' token and information about to the groups that the client belongs. So when the re-connection happens the server has to send this message-id with every message in order to the client can tell the server which one the last message that was received. Thus when the client belongs a lot of groups the message-id tends to be bigger and therefore the payload increases the request size. You can check a real life case on [this issue.](https://github.com/SignalR/SignalR/issues/3811)

Another similar issue, it's about groups' token, because of when the client belongs a lot of groups, the token size is bigger and the server needs to send to the client every time the client joins or leave a group. When the re-connection happens, the client sends back to the server this token, the problem is that the request is made via GET and the url has a limit in the size and it can change between browsers. So this token could be so big that the url won't support the request. Check [this out.](https://github.com/SignalR/SignalR/issues/3408)

So if we need this feature we'll have to do by ourselves.


#### No more multi-hub endpoints:

Actually SignalR only has one endpoint (the default url is signalR/hubs) thus all traffic when the client invokes one hub passes through this only endpoint in one only connection. That means, we had multiples hubs over one only connection.
With SignalR Core every hub has an url (endpoint).

#### No more scale out (built-in):

Asp.Net SignalR has only one way to scale out and it's through of a MessageBus. Currently SignalR offers 3 implementations: [Azure Service Bus](https://docs.microsoft.com/en-us/aspnet/signalr/overview/performance/scaleout-with-windows-azure-service-bus), [Redis](https://docs.microsoft.com/en-us/aspnet/signalr/overview/performance/scaleout-with-redis) and [Sql Server](https://docs.microsoft.com/en-us/aspnet/signalr/overview/performance/scaleout-with-sql-server) (service broker). There is only one scenario when whatever of these options works fine and it's when we're using SignalR as a server broadcast, because the server has the control the quantity of messages what are sent. But, in collaborative scenarios (client-to-client), those 3 ways to scale out could become in a bottle neck due to the number of messages grows with the number of clients.

SignalR Core let open the option to scale out in order that to the user will be who handles it according his needs (because it depends on every scenario, business, constraints or even to the infrastructure) in order to will be more “plug and play”, in fact, there is an example how SignalR Core can scale out with [Redis.](https://github.com/aspnet/SignalR/tree/dev/src/Microsoft.AspNetCore.SignalR.Redis). Besides a MessageBus is not the only option to scale out, as I said earlier it’s a trade off between our needs, our business, our limitations, etc. We could use, for instance, microservices, actors model, etc.

Basically Asp.Net SignalR has like golden hammer the MessageBus to scale out, and we already know about this anti-pattern.

Anyway, I think this decision is a bit radical, because the MessageBus works fine in some scenarios, but there you go, now it's another responsibility for us.


#### No more multi-server ping-pong (backplane):

Asp.Net SignalR replicates every message over all servers through the MessageBus, due to a client can be connected to whatever server, therefore it generates a lot of traffic between the server farm.
With SignalR Core the idea is every client is "sticked" to one only server. There is a kind of client-server map stored externally that indicates what client is connected to what server. Thus when the server has to send a message it doesn't has to do it to every server, because it already knows what server is connected the client.


## New features in SignalR Core
Now we gonna talk of funnier stuff, like which are the new features in SignalR Core.

#### Binary format to send and receive messages:

With Asp.Net SignalR you can only send and receive messages in JSON format, now with SignalR Core we can handle messages in binary format!

#### Host-agnostic:

SignalR Core doesn't depend anymore on Http, instead SignalR Core talks about connections like something agnostic, for instance, now we can use SignalR over Http or Tcp.
Asp.net SignalR only has an Http host and therefore Http transports. (We gonna check out the SignalR Core architecture later)

#### EndPoints API:

This feature is the building block of SignalR Core and it allows to support the Host-Agnostic feature. That's possible because it's supported by Microsoft.AspNetCore.Sockets. So SignalR Core has an abstract class called ***EndPoint*** with a method called ***OnConnectedAsync*** that receives a ConenctionContext object, which one allows to implement the transport layer for the protocols differents to Http. (and also Http because EndPoint class is an abstract class)

Actually the ***HubEndPoint*** class implements the ***EndPoint*** class, because as I said earlier, the EndPoint class doesn't depends on Http by the other hand depends on ConenctionContext object, which one has the transport to the current conecction. So the EndPoint implementation into the Hubs, implements the transports that are available for Http like Long Polling, Server Sent Events and WebSockets.

>By the way, SignalR Core doesn't support ***Forever Frame*** transport anymore, the SignalR Core team decided to remove it from this version because is the more inefficient transport and it's only supported by IE.

#### Multiple formats:

That means SignalR Core is now Format Agnostic, it allows to SignalR Core handle any kind of format to send and receive messages. We can register the formats that we gonna use into the DI container and then doing a map of the formats allowed to the message that will be resolved in runtime by SignalR Core.

So it allows us have different clients to talk in different languages (formats) but connected to the same endpoint.

#### Supports WebSocket native clients:

With Asp.Net SignalR we must use the javascript client in order to connect with a SignalR server, (speaking about web client) otherwise is impossible to use the SignalR server.
With SignalR Core we can build our own clients if we prefer that, taking advantage of the browser APIs to do this.

#### TypeScript Client:

As I said earlier the web client is supported by TypeScript with all advantages that it offers us.

#### Scale out extensible and flexible:

As I explained before, SignalR Core removed the 3 ways to scale out that was built-in  with SignalR and now is our responsibility.


## SignalR Core Architecture

Now that we know the most important aspects about SignalR Core, take a look at its architecture and we realize how the SignalR Core basis is on the Asp.Net Core Sockets.

<figure>
  <img src="{{ '/images/SignalrCore.png' | prepend: site.baseurl }}" alt=""> 
  <figcaption>Fig1. - SignalR Core Architecture</figcaption>
</figure>

So we can see on the picture the clear dependency of SignalR Core over Asp.Net Core Sockets and not over Http like before. We can realize that now we have two types of servers, Http and Tcp and also we can connect to them via Hub API (like the earlier version of SignalR and besides as you can see a Hub in SignalR Core is really an EndPoint) or even via Sockets thanks to the new architecture model.

So this is the first post about the SignalR Core, in the next posts we gonna talk about how SqlDependency and SqlTableDependency are a good complement with SignalR Core in order to we have applications more reactives. Besides I'll show you a demo using [.NET Core 2.0 Preview 1](https://www.microsoft.com/net/core/preview#windowscmd) and Visual Studio 2017 [Preview version 15.3](https://www.visualstudio.com/vs/preview/)

I hope that you stay tune with SignalR Core because is coming up very interesting stuff with .netcore 2.0 and SignalR Core!!!

>Lastly I wanna shared with you the slides and video to my speech last week in the [MDE.Net](https://www.meetup.com/MDE-NET/) community about SignalR Core.

<p>
  <iframe src="https://www.slideshare.net//slideshow/embed_code/key/kyb9bgwbOZb82v" width="615px" height="470px" frameborder="0" marginwidth="0" marginheight="0" scrolling="no" style="border:none;" allowfullscreen webkitallowfullscreen mozallowfullscreen></iframe>
</p>
