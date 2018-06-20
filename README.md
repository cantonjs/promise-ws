# promise-ws

[![Build Status](https://travis-ci.org/cantonjs/promise-ws.svg?branch=master)](https://travis-ci.org/cantonjs/promise-ws)
[![CircleCI](https://circleci.com/gh/cantonjs/promise-ws.svg?style=shield)](https://circleci.com/gh/cantonjs/promise-ws)
[![Build status](https://ci.appveyor.com/api/projects/status/q0rmv88vjfk8m2w5/branch/master?svg=true)](https://ci.appveyor.com/project/cantonjs/promise-ws/branch/master)
[![Coverage Status](https://coveralls.io/repos/github/cantonjs/promise-ws/badge.svg?branch=master)](https://coveralls.io/github/cantonjs/promise-ws?branch=master)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
[![License](https://img.shields.io/badge/license-MIT_License-brightgreen.svg?style=flat)](https://github.com/cantonjs/promise-ws/blob/master/LICENSE.md)

A promise (request reply) based WebSocket implementation for Node.js. Built on top of
[ws](https://github.com/websockets/ws)

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Usage](#usage)
- [Installation](#installation)
- [API Reference](#api-reference)
  - [Server.create(options)](#servercreateoptions)
  - [Server Events](#server-events)
  - [server#onConnection(callback)](#serveronconnectioncallback)
  - [server#onReply(name, response)](#serveronreplyname-response)
  - [server#addReply(name, response)](#serveraddreplyname-response)
  - [server#reply(name, response)](#serverreplyname-response)
  - [server#removeReply(name, response)](#serverremovereplyname-response)
  - [server#replyCount(name)](#serverreplycountname)
  - [server#onReplyClose(shouldClose)](#serveronreplycloseshouldclose)
  - [server#request(name[, ...args])](#serverrequestname-args)
  - [server#wss()](#serverwss)
  - [server#close()](#serverclose)
  - [server#clients](#serverclients)
  - [Client.create(address[, options])](#clientcreateaddress-options)
  - [Client.connect(address, waitUntil)](#clientconnectaddress-waituntil)
  - [Client.autoReconnect(address, waitUntil[, delay])](#clientautoreconnectaddress-waituntil-delay)
  - [Client Events](#client-events)
  - [client#onReply(name, response[, errorHandler])](#clientonreplyname-response-errorhandler)
  - [client#addReply(name, response[, errorHandler])](#clientaddreplyname-response-errorhandler)
  - [client#reply(name, response[, errorHandler])](#clientreplyname-response-errorhandler)
  - [client#removeReply(name, response[, errorHandler])](#clientremovereplyname-response-errorhandler)
  - [client#replyCount(name)](#clientreplycountname)
  - [client#request(name[, ...args])](#clientrequestname-args)
  - [client#requestClose()](#clientrequestclose)
  - [client#ws()](#clientws)
  - [client#close()](#clientclose)
- [License](#license)

## Usage

```js
import { Server, Client } from "promise-ws";

(async function main() {
  const port = 3000;
  const server = await Server.create({ port });
  server.reply("say", async data => {
    console.log("data"); /* 'hello' */
    return "world";
  });

  const url = `ws://127.0.0.1:${port}`;
  await Client.autoReconnect(url, async client => {
    const response = await client.request("say", "hello");
    console.log(response); /* 'world' */
  });
})();
```

## Installation

```bash
$ npm install promise-ws
```

## API Reference

### Server.create(options)

###### Arguments

1.  `options` \<Object\>: All options will be passed to
    [WebSocket.Server(opsions)](https://github.com/websockets/ws/blob/master/doc/ws.md#new-websocketserveroptions-callback),
    except for `clientTracking`, which will always be `true`.

###### Returns

* `server` \<Promise\<Server\>\>

Create a WebSocket server

### Server Events

Server extends [EventEmitter](https://nodejs.org/api/events.html), which
forwards these events from
[WebSocket.Server](https://github.com/websockets/ws/blob/master/doc/ws.md#class-websocketserver):

* [connection](https://github.com/websockets/ws/blob/master/doc/ws.md#event-connection)
* [error](https://github.com/websockets/ws/blob/master/doc/ws.md#event-error)
* [headers](https://github.com/websockets/ws/blob/master/doc/ws.md#event-headers)

### server#onConnection(callback)

1.  `callback` \<Function\>: The callback function, the only argument is
    `client`.

Like `server.on('connection', callback)`, the only difference is the callback
argument is `client` but not `ws`.

### server#onReply(name, response)

1.  `name` \<String\>: The name of the event
2.  `response` \<Function\>: The callback function. Should return a promise

Add a reply function. Will be called when client calls `request()`. The response
function arguments are the same with `client.request(name, ...arguments)`
arguments. The returning value in response would be reply to the issuer client
request function.

### server#addReply(name, response)

Alias for `server#onReply(name, response)`

### server#reply(name, response)

Alias for `server#onReply(name, response)`

### server#removeReply(name, response)

1.  `name` \<String\>: The name of the event
2.  `response` \<Function\>: The callback function

Remove a reply function.

### server#replyCount(name)

1.  `name` \<String\>: The name of the event

Get reply function count by name.

### server#onReplyClose(shouldClose)

1.  `shouldClose` \<Function\>: The callback function to decide to close or not. Should return a promise with a Boolean.

Add a reply to close function. Will be called when client calls `requestClose()`. If `shouldClose` returns `true`, the server will be closed.

### server#request(name[, ...args])

###### Arguments

1.  `name` \<String\>: The name of the event
2.  `...args` \<Any\>: The request arguments

###### Returns

* `responseArray` \<Promise[\<Any\>]/>: Response array by clients replied

Request to all clients and wait for reply.

### server#wss()

###### Returns

* `wss`
  \<[WebSocketServer](https://github.com/websockets/ws/blob/master/doc/ws.md#class-websocketserver)\>

Get
\<[WebSocket.Server](https://github.com/websockets/ws/blob/master/doc/ws.md#class-websocketserver)\>
instance.

### server#close()

###### Returns

* \<Promise\>

Stops the server.

### server#clients

The connected clients.

---

### Client.create(address[, options])

###### Arguments

1.  `address` \<String\>: The address/URL to which to connect
2.  `options` \<Object\>

* `onClose` \<Function\>: The callback function when client closed

###### Returns

* `client` \<Promise\<Client\>\>

Create a WebSocket client.

###### Example

```js
import { Client } from "promise-ws";

(async function main() {
  const client = await Client.create("ws://127.0.0.1:3000", {
    onClose() {
      console.error("server closed");
    }
  });
  /* do something... */
})();
```

### Client.connect(address, waitUntil)

###### Arguments

1.  `address` \<String\>: The address/URL to which to connect
2.  `waitUntil` \<Function\>: The main function to handle client. Should return
    a promise

###### Returns

* \<Promise\<Any\>\>

Create a WebSocket client and pass to the first argumet of `waitUntil` function.

The `waitUntil` function will keep running until one of these reasons:

* The `waitUntil` function returns a value. The value will be returned to
  `Client.connect()` as a promise
* The `waitUntil` function throws an error. This will throw a rejection
* The server closed. This will throw a rejection, and the error message will be
  "CLOSE"

###### Example

```js
import { Client } from "promise-ws";

(async function main() {
  try {
    const url = "ws://127.0.0.1:3000";
    const res = await Client.connect(url, async client => {
      /* do something... */
      return "chris";
    });
    console.log("res:", res); /* res: chris */
  } catch (err) {
    if (err.message === "CLOSE") {
      console.error("server closed");
    } else {
      console.error(err);
    }
  }
})();
```

### Client.autoReconnect(address, waitUntil[, delay])

###### Arguments

1.  `address` \<String\>: The address/URL to which to connect
2.  `waitUntil` \<Function\>: The main function to handle client. Should return
    a promise
3.  `delay` \<Number\>: Delay time before reconnect in ms. Defaults to `1000`

###### Returns

* \<Promise\<Any\>\>

Like `Client.connect()`, but if server closed, it will never throw error, and it
will try to reconnect to the server after delay.

###### Example

```js
import { Client } from "promise-ws";

(async function main() {
  try {
    const url = "ws://127.0.0.1:3000";
    const res = await Client.autoReconnect(url, async client => {
      /* do something... */
      return "chris";
    });
    console.log("res:", res); /* res: chris */
  } catch (err) {
    console.error(err);
  }
})();
```

### Client Events

Client extends [EventEmitter](https://nodejs.org/api/events.html), which
forwards these events from
[WebSocket.Client](https://github.com/websockets/ws/blob/master/doc/ws.md#class-websocket):

* [close](https://github.com/websockets/ws/blob/master/doc/ws.md#event-close)
* [error](https://github.com/websockets/ws/blob/master/doc/ws.md#event-error-1)
* [headers](https://github.com/websockets/ws/blob/master/doc/ws.md#event-headers-1)
* [message](https://github.com/websockets/ws/blob/master/doc/ws.md#event-message)
* [open](https://github.com/websockets/ws/blob/master/doc/ws.md#event-open)
* [ping](https://github.com/websockets/ws/blob/master/doc/ws.md#event-ping)
* [pong](https://github.com/websockets/ws/blob/master/doc/ws.md#event-pong)
* [unexpected-response](https://github.com/websockets/ws/blob/master/doc/ws.md#event-unexpected-response)

### client#onReply(name, response[, errorHandler])

1.  `name` \<String\>: The name of the event
2.  `response` \<Function\>: The callback function. Should return a promise
3.  `errorHandler` \<Function\>: The error handler function

Add a reply function. Will be called when server calls `request()`. The response
function arguments are the same with `server.request(name, ...arguments)`
arguments. The returning value in response would be reply to the server request
function.

### client#addReply(name, response[, errorHandler])

Alias for `client#onReply(name, response)`

### client#reply(name, response[, errorHandler])

Alias for `client#onReply(name, response)`

### client#removeReply(name, response[, errorHandler])

1.  `name` \<String\>: The name of the event
2.  `response` \<Function\>: The callback function

Remove a reply function.

### client#replyCount(name)

1.  `name` \<String\>: The name of the event

Get reply function count by name.

### client#request(name[, ...args])

###### Arguments

1.  `name` \<String\>: The name of the event
2.  `...args` \<Any\>: The request arguments

###### Returns

* `responseData` \<Promise\<Any\>/>: Response data by server replied

Request to all clients and wait for reply.

### client#requestClose()

Request to close server, will return a promise to wait for completion.

### client#ws()

###### Returns

* `ws`
  \<[WebSocketClient](https://github.com/websockets/ws/blob/master/doc/ws.md#class-websocketclient)\>

Get
\<[WebSocket.Client](https://github.com/websockets/ws/blob/master/doc/ws.md#class-websocketclient)\>
instance.

### client#close()

Stops the client.

## License

MIT
