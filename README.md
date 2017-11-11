# promise-ws

[![Build Status](https://travis-ci.org/cantonjs/promise-ws.svg?branch=master)](https://travis-ci.org/cantonjs/promise-ws)
[![Coverage Status](https://coveralls.io/repos/github/cantonjs/promise-ws/badge.svg?branch=master)](https://coveralls.io/github/cantonjs/promise-ws?branch=master)
[![License](https://img.shields.io/badge/license-MIT_License-blue.svg?style=flat)](https://github.com/cantonjs/promise-ws/blob/master/LICENSE.md)

A promise based WebSocket implementation for Node.js. Built on top of [ws](https://github.com/websockets/ws)


## Table of Contents

<!-- MarkdownTOC autolink="true" bracket="round" -->

- [Usage](#usage)
- [Installation](#installation)
- [API Reference](#api-reference)
  - [Server.create\(options\)](#servercreateoptions)
  - [server#onReply\(name, response\)](#serveronreplyname-response)
  - [server#addReply\(name, response\)](#serveraddreplyname-response)
  - [server#reply\(name, response\)](#serverreplyname-response)
  - [server#removeReply\(name, response\)](#serverremovereplyname-response)
  - [server#replyCount\(name\)](#serverreplycountname)
  - [server#request\(name\[, ...args\]\)](#serverrequestname-args)
  - [server#wss\(\)](#serverwss)
  - [server#close\(\)](#serverclose)
  - [server#clients](#serverclients)
  - [Client.create\(address\[, options\]\)](#clientcreateaddress-options)
  - [Client.connect\(address, waitUntil\)](#clientconnectaddress-waituntil)
  - [Client.autoReconnect\(address, waitUntil\[, delay\]\)](#clientautoreconnectaddress-waituntil-delay)
  - [client#onReply\(name, response\)](#clientonreplyname-response)
  - [client#addReply\(name, response\)](#clientaddreplyname-response)
  - [client#reply\(name, response\)](#clientreplyname-response)
  - [client#removeReply\(name, response\)](#clientremovereplyname-response)
  - [client#replyCount\(name\)](#clientreplycountname)
  - [client#request\(name\[, ...args\]\)](#clientrequestname-args)
  - [client#ws\(\)](#clientws)
  - [client#close\(\)](#clientclose)
- [License](#license)

<!-- /MarkdownTOC -->


<a name="usage"></a>
## Usage

```js
import { Server, Client } from 'promise-ws';

(async function main() {
  const port = 3000;
  const server = await Server.create({ port });
  server.reply('say', async (data) => {
    console.log('data'); /* 'hello' */
    return 'world';
  });

  const url = `ws://127.0.0.1:${port}`;
  await Client.autoReconnect(url, async (client) => {
    const response = await client.request('say', 'hello');
    console.log(response); /* 'world' */
  });
}());
```


<a name="installation"></a>
## Installation

```bash
$ npm install promise-ws
```


<a name="api-reference"></a>
## API Reference

<a name="servercreateoptions"></a>
### Server.create(options)

###### Arguments

1. `options` \<Object\>: All options will be passed to [WebSocket.Server(opsions)](https://github.com/websockets/ws/blob/master/doc/ws.md#new-websocketserveroptions-callback), except for `clientTracking`, which will always be `true`.

###### Returns

- `server` \<Promise\<Server\>\>

Create a WebSocket server


<a name="serveronreplyname-response"></a>
### server#onReply(name, response)

1. `name` \<String\>: The name of the event
2. `response` \<Function\>: The callback function. Should return a promise

Add a reply function. Will be called when client calls `request()`. The response function arguments are the same with `client.request(name, ...arguments)` arguments. The returning value in response would be reply to the issuer client request function.

<a name="serveraddreplyname-response"></a>
### server#addReply(name, response)

Alias for `server#onReply(name, response)`


<a name="serverreplyname-response"></a>
### server#reply(name, response)

Alias for `server#onReply(name, response)`


<a name="serverremovereplyname-response"></a>
### server#removeReply(name, response)

1. `name` \<String\>: The name of the event
2. `response` \<Function\>: The callback function

Remove a reply function.


<a name="serverreplycountname"></a>
### server#replyCount(name)

1. `name` \<String\>: The name of the event

Get reply function count by name.


<a name="serverrequestname-args"></a>
### server#request(name[, ...args])

###### Arguments

1. `name` \<String\>: The name of the event
2. `...args` \<Any\>: The request arguments

###### Returns

- `responseArray` \<Promise[\<Any\>]/>: Response array by clients replied

Request to all clients and wait for reply.


<a name="serverwss"></a>
### server#wss()

###### Returns

- `wss` \<[WebSocketServer](https://github.com/websockets/ws/blob/master/doc/ws.md#class-websocketserver)\>

Get \<[WebSocket.Server](https://github.com/websockets/ws/blob/master/doc/ws.md#class-websocketserver)\> instance.


<a name="serverclose"></a>
### server#close()

###### Returns

- \<Promise\>

Stops the server.


<a name="serverclients"></a>
### server#clients

The connected clients.


---


<a name="clientcreateaddress-options"></a>
### Client.create(address[, options])

###### Arguments

1. `address` \<String\>: The address/URL to which to connect
2. `options` \<Object\>
  - `onClose` \<Function\>: The callback function when client closed

###### Returns

- `client` \<Promise\<Client\>\>

Create a WebSocket client.

###### Example

```js
import { Client } from 'promise-ws';

(async function main() {
  const client = await Client.create('ws://127.0.0.1:3000', {
    onClose() { console.error('server closed'); }
  });
  /* do something... */
}());
```

<a name="clientconnectaddress-waituntil"></a>
### Client.connect(address, waitUntil)

###### Arguments

1. `address` \<String\>: The address/URL to which to connect
2. `waitUntil` \<Function\>: The main function to handle client. Should return a promise

###### Returns

- \<Promise\<Any\>\>

Create a WebSocket client and pass to the first argumet of `waitUntil` function.

The `waitUntil` function will keep running until one of these reasons:

- The `waitUntil` function returns a value. The value will be returned to `Client.connect()` as a promise
- The `waitUntil` function throws an error. This will throw a rejection
- The server closed. This will throw a rejection, and the error message will be "CLOSE"

###### Example

```js
import { Client } from 'promise-ws';

(async function main() {
  try {
    const url = 'ws://127.0.0.1:3000';
    const res = await Client.connect(url, async (client) => {
      /* do something... */
      return 'chris';
    });
    console.log('res:', res); /* res: chris */
  }
  catch (err) {
    if (err.message === 'CLOSE') { console.error('server closed'); }
    else { console.error(err); }
  }
}());
```

<a name="clientautoreconnectaddress-waituntil-delay"></a>
### Client.autoReconnect(address, waitUntil[, delay])

###### Arguments

1. `address` \<String\>: The address/URL to which to connect
2. `waitUntil` \<Function\>: The main function to handle client. Should return a promise
3. `delay` \<Number\>: Delay time before reconnect in ms. Defaults to `1000`

###### Returns

- \<Promise\<Any\>\>

Like `Client.connect()`, but if server closed, it will never throw error, and it will try to reconnect to the server after delay.

###### Example

```js
import { Client } from 'promise-ws';

(async function main() {
  try {
    const url = 'ws://127.0.0.1:3000';
    const res = await Client.autoReconnect(url, async (client) => {
      /* do something... */
      return 'chris';
    });
    console.log('res:', res); /* res: chris */
  }
  catch (err) {
    console.error(err);
  }
}());
```


<a name="clientonreplyname-response"></a>
### client#onReply(name, response)

1. `name` \<String\>: The name of the event
2. `response` \<Function\>: The callback function. Should return a promise

Add a reply function. Will be called when server calls `request()`. The response function arguments are the same with `server.request(name, ...arguments)` arguments. The returning value in response would be reply to the server request function.

<a name="clientaddreplyname-response"></a>
### client#addReply(name, response)

Alias for `client#onReply(name, response)`


<a name="clientreplyname-response"></a>
### client#reply(name, response)

Alias for `client#onReply(name, response)`


<a name="clientremovereplyname-response"></a>
### client#removeReply(name, response)

1. `name` \<String\>: The name of the event
2. `response` \<Function\>: The callback function

Remove a reply function.


<a name="clientreplycountname"></a>
### client#replyCount(name)

1. `name` \<String\>: The name of the event

Get reply function count by name.


<a name="clientrequestname-args"></a>
### client#request(name[, ...args])

###### Arguments

1. `name` \<String\>: The name of the event
2. `...args` \<Any\>: The request arguments

###### Returns

- `responseData` \<Promise\<Any\>/>: Response data by server replied

Request to all clients and wait for reply.


<a name="clientws"></a>
### client#ws()

###### Returns

- `ws` \<[WebSocketClient](https://github.com/websockets/ws/blob/master/doc/ws.md#class-websocketclient)\>

Get \<[WebSocket.Client](https://github.com/websockets/ws/blob/master/doc/ws.md#class-websocketclient)\> instance.


<a name="clientclose"></a>
### client#close()

Stops the client.


<a name="license"></a>
## License

MIT
