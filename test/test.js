
import { Server, Client } from '../src';
import delay from 'delay';

let server;
const clients = [];

const connect = async (url) => {
	const client = await Client.connect(url);
	clients.push(client);
	return client;
};

afterEach(async () => {
	await Promise.all(clients.map(async (client) => client.close()));
	await server.close();
	clients.length = 0;
});

test('client -> server', async () => {
	const port = 3000;

	server = await Server.create({ port });
	const client = await connect(`ws://127.0.0.1:${port}`);

	const handleSay = jest.fn(async (data) => {
		expect(data).toBe('hello');
		delay(10);
	});

	server.on('say', handleSay);
	await client.emit('say', 'hello');
	expect(handleSay.mock.calls.length).toBe(1);
});

test('client -> server -> client', async () => {
	const port = 3000;

	server = await Server.create({ port });
	const client = await connect(`ws://127.0.0.1:${port}`);

	server.on('say', async (data) => {
		expect(data).toBe('hello');
		delay(10);
		return 'world';
	});

	const res = await client.emit('say', 'hello');
	expect(res).toBe('world');
});

test('server -> clients', async () => {
	const port = 3000;

	server = await Server.create({ port });
	const client1 = await connect(`ws://127.0.0.1:${port}`);
	const client2 = await connect(`ws://127.0.0.1:${port}`);

	const handleClientSay1 = jest.fn(async (data) => {
		expect(data).toBe('hello');
		return 1;
	});

	const handleClientSay2 = jest.fn(async (data) => {
		expect(data).toBe('hello');
		return 2;
	});

	client1.on('say', handleClientSay1);
	client2.on('say', handleClientSay2);

	const res = await server.emit('say', 'hello');
	expect(handleClientSay1.mock.calls.length).toBe(1);
	expect(handleClientSay2.mock.calls.length).toBe(1);
	expect(res).toEqual(expect.arrayContaining([1, 2]));
});
