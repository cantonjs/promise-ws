# promise-ws

[![Build Status](https://travis-ci.org/cantonjs/promise-ws.svg?branch=master)](https://travis-ci.org/cantonjs/promise-ws) [![Coverage Status](https://coveralls.io/repos/github/cantonjs/promise-ws/badge.svg?branch=master)](https://coveralls.io/github/cantonjs/promise-ws?branch=master) [![License](https://img.shields.io/badge/license-MIT_License-blue.svg?style=flat)](https://github.com/cantonjs/promise-ws/blob/master/LICENSE.md)

A promise based WebSocket implementation for Node.js. Built on top of [ws](https://github.com/websockets/ws)


```js
import { Server, Client } from 'promise-ws';

(async function main() {
  const port = 3000;
  const server = await Server.create({ port });
  const client = await Client.create(`ws://127.0.0.1:${port}`);
  server.on('say', async (data) => {
    console.log('data'); /* 'hello' */
    return 'world';
  });
  const res = await client.emit('say', 'hello');
  console.log(res); /* 'world' */
}());
```


## API Reference

*Coming soon...*


## License

MIT
