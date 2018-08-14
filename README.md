# promise-ws

[![Build Status](https://travis-ci.org/cantonjs/promise-ws.svg?branch=master)](https://travis-ci.org/cantonjs/promise-ws)
[![CircleCI](https://circleci.com/gh/cantonjs/promise-ws.svg?style=shield)](https://circleci.com/gh/cantonjs/promise-ws)
[![Build status](https://ci.appveyor.com/api/projects/status/q0rmv88vjfk8m2w5/branch/master?svg=true)](https://ci.appveyor.com/project/cantonjs/promise-ws/branch/master)
[![Coverage Status](https://coveralls.io/repos/github/cantonjs/promise-ws/badge.svg?branch=master)](https://coveralls.io/github/cantonjs/promise-ws?branch=master)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
[![License](https://img.shields.io/badge/license-MIT_License-brightgreen.svg?style=flat)](https://github.com/cantonjs/promise-ws/blob/master/LICENSE.md)

A promise based WebSocket implementation for Node.js. Built on top of [ws](https://github.com/websockets/ws)

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Usage examples](#usage-examples)
  - [Simple client](#simple-client)
  - [Simple server](#simple-server)
- [Installation](#installation)
- [API Reference](#api-reference)
- [License](#license)

## Usage examples

### Simple client

```js
import WebSocket from "promise-ws";

(async function() {
  const ws = await WebSocket.create("ws://www.host.com/path");

  ws.on("message", function incoming(data) {
    console.log(data);
  });

  await ws.send("something");
})();
```

### Simple server

```js
import WebSocket from "promise-ws";

(async function() {
  const wss = await WebSocket.Server.create({ port: 8080 });

  wss.on("connection", async function connection(ws) {
    ws.on("message", function incoming(message) {
      console.log("received: %s", message);
    });

    await ws.send("something");
  });
})();
```

## Installation

```bash
$ npm install promise-ws
```

## API Reference

`promise-ws` API is almost the same with [ws](https://github.com/websockets/ws) except that:

- `websocket.ping([data[, mask]])` returns a promise
- `websocket.pong([data[, mask]])` returns a promise
- `websocket.send(data[, options])` returns a promise
- 🆕 `WebSocket.Server.create(options)`, returns a promise of listened `WebSocket.Server` instance
- 🆕 `WebSocket.create(options)`, returns a promise of opened `WebSocket` instance

For more WebSocket API, please checkout the [API doc](https://github.com/websockets/ws/blob/master/doc/ws.md).

## License

MIT
