# promise-ws

A promise based WebSocket implementation for Node.js. Built on top of [ws](https://github.com/websockets/ws)


```js
import { Server, Client } from 'promise-ws';

const port = 3000;
const server = await Server.create({ port });
const client = await Client.create(`ws://127.0.0.1:${port}`);
server.on('say', async (data) => {
  console.log('data'); /* 'hello' */
  return 'world';
});
const res = await client.emit('say', 'hello');
console.log(res); /* 'world' */
```


## API Reference

*Coming soon...*


## License

MIT
