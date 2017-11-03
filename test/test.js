
import { Server, Client } from '../src';
import delay from 'delay';
import WebSocket from 'ws';

let _server;
let _clients = [];

const createServer = async (...args) => {
	_server = await Server.create(...args);
	return _server;
};

const createClient = async (...args) => {
	const client = await Client.create(...args);
	_clients.push(client);
	return client;
};

const connectClient = async (url, waitUntil) => {
	return Client.connect(url, async (client) => {
		_clients.push(client);
		return waitUntil(client);
	});
};

afterEach(async () => {
	await Promise.all(_clients.map(async (client) => client.close()));
	await _server.close().catch(() => {});
	_clients = [];
});

describe('Client.connect()', () => {
	test('waitUntil', async () => {
		const port = 3000;
		const server = await createServer({ port });
		const res = await connectClient(`ws://127.0.0.1:${port}`, async (client) => {
			server.on('say', async (data) => {
				expect(data).toBe('hello');
				return 'world';
			});
			return client.emit('say', 'hello');
		});
		expect(res).toBe('world');
	});

	test('should throw error if waitUntil error', async () => {
		const port = 3000;
		await createServer({ port });
		await expect(connectClient(`ws://127.0.0.1:${port}`, async () => {
			throw new Error('err');
		})).rejects.toEqual(expect.anything());
	});

	test('should throw error if failed to connect to server', async () => {
		await expect(connectClient('ws://127.0.0.1')).rejects.toEqual(expect.anything());
	});

	test('should throw error if server closed', async () => {
		const port = 3000;
		const server = await createServer({ port });
		await expect(connectClient(`ws://127.0.0.1:${port}`, async () => {
			await server.close();
			await delay(100);
		})).rejects.toEqual(expect.anything());
	});
});

describe('client methods', () => {
	test('client.emit()', async () => {
		const port = 3000;
		await createServer({ port });
		const client = await createClient(`ws://127.0.0.1:${port}`);
		await client.emit('hello');
	});

	test('client.emit() and wait for response', async () => {
		const port = 3000;
		const server = await createServer({ port });
		server.on('say', async (data) => {
			expect(data).toBe('hello');
			delay(10);
			return 'world';
		});
		const client = await createClient(`ws://127.0.0.1:${port}`);
		const res = await client.emit('say', 'hello');
		expect(res).toBe('world');
	});

	test('client.waitFor()', async () => {
		const port = 3000;
		const server = await createServer({ port });
		const client = await createClient(`ws://127.0.0.1:${port}`);
		setTimeout(() => {
			server.emit('hello', 'world');
		}, 10);
		const [res] = await client.waitFor('hello');
		expect(res).toBe('world');
	});

	test('client.on()', async () => {
		const port = 3000;
		const server = await createServer({ port });
		const client = await createClient(`ws://127.0.0.1:${port}`);
		const handleSay = jest.fn(async (data) => {
			expect(data).toBe('hello');
			delay(10);
		});
		client.on('say', handleSay);
		await server.emit('say', 'hello');
		expect(handleSay.mock.calls.length).toBe(1);
	});

	test('client.addListener()', async () => {
		const port = 3000;
		const server = await createServer({ port });
		const client = await createClient(`ws://127.0.0.1:${port}`);
		const handleSay = jest.fn(async (data) => {
			expect(data).toBe('hello');
			delay(10);
		});
		client.addListener('say', handleSay);
		await server.emit('say', 'hello');
		expect(handleSay.mock.calls.length).toBe(1);
	});

	test('client.removeListener()', async () => {
		const port = 3000;
		const server = await createServer({ port });
		const client = await createClient(`ws://127.0.0.1:${port}`);
		const handleSay = jest.fn();
		client.addListener('say', handleSay);
		client.removeListener('say', handleSay);
		await server.emit('say', 'hello');
		expect(handleSay.mock.calls.length).toBe(0);
	});

	test('client.ws()', async () => {
		const port = 3000;
		await createServer({ port });
		const client = await createClient(`ws://127.0.0.1:${port}`);
		expect(client.ws()).toBeInstanceOf(WebSocket);
	});
});

describe('server methods', () => {
	test('server.emit()', async () => {
		const port = 3000;
		const server = await createServer({ port });
		const client1 = await createClient(`ws://127.0.0.1:${port}`);
		const client2 = await createClient(`ws://127.0.0.1:${port}`);
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

	test('server.waitFor()', async () => {
		const port = 3000;
		const server = await createServer({ port });
		const client = await createClient(`ws://127.0.0.1:${port}`);
		setTimeout(() => {
			client.emit('hello', 'world');
		}, 10);
		const [res] = await server.waitFor('hello');
		expect(res).toBe('world');
	});

	test('server.on()', async () => {
		const port = 3000;
		const server = await createServer({ port });
		const client = await createClient(`ws://127.0.0.1:${port}`);
		const handleSay = jest.fn(async (data) => {
			expect(data).toBe('hello');
			delay(10);
		});
		server.on('say', handleSay);
		await client.emit('say', 'hello');
		expect(handleSay.mock.calls.length).toBe(1);
	});

	test('server.addListener()', async () => {
		const port = 3000;
		const server = await createServer({ port });
		const client = await createClient(`ws://127.0.0.1:${port}`);
		const handleSay = jest.fn(async (data) => {
			expect(data).toBe('hello');
			delay(10);
		});
		server.addListener('say', handleSay);
		await client.emit('say', 'hello');
		expect(handleSay.mock.calls.length).toBe(1);
	});

	test('server.removeListener()', async () => {
		const port = 3000;
		const server = await createServer({ port });
		const client = await createClient(`ws://127.0.0.1:${port}`);
		const handleSay = jest.fn();
		server.addListener('say', handleSay);
		server.removeListener('say', handleSay);
		await client.emit('say', 'hello');
		expect(handleSay.mock.calls.length).toBe(0);
	});

	test('server.wss()', async () => {
		const port = 3000;
		const server = await createServer({ port });
		expect(server.wss()).toBeInstanceOf(WebSocket.Server);
	});
});
