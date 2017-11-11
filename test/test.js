
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
			server.onReply('say', async (data) => {
				expect(data).toBe('hello');
				return 'world';
			});
			return client.request('say', 'hello');
		});
		expect(res).toBe('world');
	});

	test('should throw error if waitUntil error', async () => {
		const port = 3000;
		await createServer({ port });
		await expect(connectClient(`ws://127.0.0.1:${port}`, async () => {
			throw new Error('err');
		})).rejects.toBeDefined();
	});

	test('should throw error if failed to connect to server', async () => {
		await expect(connectClient('ws://127.0.0.1')).rejects.toBeDefined();
	});

	test('should throw error if server closed', async () => {
		const port = 3000;
		const server = await createServer({ port });
		await expect(connectClient(`ws://127.0.0.1:${port}`, async () => {
			await server.close();
			await delay(100);
		})).rejects.toBeDefined();
	});
});

describe('client methods', () => {
	test('client.request()', async () => {
		const port = 3000;
		await createServer({ port });
		const client = await createClient(`ws://127.0.0.1:${port}`);
		await client.request('hello');
	});

	test('client.request() and wait for response', async () => {
		const port = 3000;
		const server = await createServer({ port });
		server.onReply('say', async (data) => {
			expect(data).toBe('hello');
			delay(10);
			return 'world';
		});
		const client = await createClient(`ws://127.0.0.1:${port}`);
		const res = await client.request('say', 'hello');
		expect(res).toBe('world');
	});

	test('client.waitFor()', async () => {
		const port = 3000;
		const server = await createServer({ port });
		const client = await createClient(`ws://127.0.0.1:${port}`);
		setTimeout(() => {
			server.request('hello', 'world');
		}, 10);
		const [res] = await client.waitFor('hello');
		expect(res).toBe('world');
	});

	test('client.onReply()', async () => {
		const port = 3000;
		const server = await createServer({ port });
		const client = await createClient(`ws://127.0.0.1:${port}`);
		const handleSay = jest.fn(async (data) => {
			expect(data).toBe('hello');
			delay(10);
		});
		client.onReply('say', handleSay);
		await server.request('say', 'hello');
		expect(handleSay.mock.calls.length).toBe(1);
	});

	test('client.reply()', async () => {
		const port = 3000;
		const server = await createServer({ port });
		const client = await createClient(`ws://127.0.0.1:${port}`);
		const handleSay = jest.fn(async (data) => {
			expect(data).toBe('hello');
			delay(10);
		});
		client.reply('say', handleSay);
		await server.request('say', 'hello');
		expect(handleSay.mock.calls.length).toBe(1);
	});

	test('client.addReply()', async () => {
		const port = 3000;
		const server = await createServer({ port });
		const client = await createClient(`ws://127.0.0.1:${port}`);
		const handleSay = jest.fn(async (data) => {
			expect(data).toBe('hello');
			delay(10);
		});
		client.addReply('say', handleSay);
		await server.request('say', 'hello');
		expect(handleSay.mock.calls.length).toBe(1);
	});

	test('client.removeReply()', async () => {
		const port = 3000;
		const server = await createServer({ port });
		const client = await createClient(`ws://127.0.0.1:${port}`);
		const handleSay = jest.fn();
		client.addReply('say', handleSay);
		client.removeReply('say', handleSay);
		await server.request('say', 'hello');
		expect(handleSay.mock.calls.length).toBe(0);
	});

	test('client.replyCount()', async () => {
		const port = 3000;
		await createServer({ port });
		const client = await createClient(`ws://127.0.0.1:${port}`);
		const reply1 = () => {};
		const reply2 = () => {};

		expect(client.replyCount('say')).toBe(0);
		client.addReply('say', reply1);
		expect(client.replyCount('say')).toBe(1);
		client.addReply('say', reply2);
		expect(client.replyCount('say')).toBe(2);
		client.removeReply('say', reply1);
		expect(client.replyCount('say')).toBe(1);
		client.removeReply('say', reply2);
		expect(client.replyCount('say')).toBe(0);
	});

	test('client.ws()', async () => {
		const port = 3000;
		await createServer({ port });
		const client = await createClient(`ws://127.0.0.1:${port}`);
		expect(client.ws()).toBeInstanceOf(WebSocket);
	});
});

describe('server methods', () => {
	test('server.request()', async () => {
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
		client1.onReply('say', handleClientSay1);
		client2.onReply('say', handleClientSay2);
		const res = await server.request('say', 'hello');
		expect(handleClientSay1.mock.calls.length).toBe(1);
		expect(handleClientSay2.mock.calls.length).toBe(1);
		expect(res).toEqual(expect.arrayContaining([1, 2]));
	});

	test('server.waitFor()', async () => {
		const port = 3000;
		const server = await createServer({ port });
		const client = await createClient(`ws://127.0.0.1:${port}`);
		setTimeout(() => {
			client.request('hello', 'world');
		}, 10);
		const [res] = await server.waitFor('hello');
		expect(res).toBe('world');
	});

	test('server.onReply()', async () => {
		const port = 3000;
		const server = await createServer({ port });
		const client = await createClient(`ws://127.0.0.1:${port}`);
		const handleSay = jest.fn(async (data) => {
			expect(data).toBe('hello');
			delay(10);
		});
		server.onReply('say', handleSay);
		await client.request('say', 'hello');
		expect(handleSay.mock.calls.length).toBe(1);
	});

	test('server.reply()', async () => {
		const port = 3000;
		const server = await createServer({ port });
		const client = await createClient(`ws://127.0.0.1:${port}`);
		const handleSay = jest.fn(async (data) => {
			expect(data).toBe('hello');
			delay(10);
		});
		server.reply('say', handleSay);
		await client.request('say', 'hello');
		expect(handleSay.mock.calls.length).toBe(1);
	});

	test('server.addReply()', async () => {
		const port = 3000;
		const server = await createServer({ port });
		const client = await createClient(`ws://127.0.0.1:${port}`);
		const handleSay = jest.fn(async (data) => {
			expect(data).toBe('hello');
			delay(10);
		});
		server.addReply('say', handleSay);
		await client.request('say', 'hello');
		expect(handleSay.mock.calls.length).toBe(1);
	});

	test('server.removeReply()', async () => {
		const port = 3000;
		const server = await createServer({ port });
		const client = await createClient(`ws://127.0.0.1:${port}`);
		const handleSay = jest.fn();
		server.addReply('say', handleSay);
		server.removeReply('say', handleSay);
		await client.request('say', 'hello');
		expect(handleSay.mock.calls.length).toBe(0);
	});

	test('server.replyCount()', async () => {
		const port = 3000;
		const server = await createServer({ port });
		const reply1 = () => {};
		const reply2 = () => {};

		expect(server.replyCount('say')).toBe(0);
		server.addReply('say', reply1);
		expect(server.replyCount('say')).toBe(1);
		server.addReply('say', reply2);
		expect(server.replyCount('say')).toBe(2);
		server.removeReply('say', reply1);
		expect(server.replyCount('say')).toBe(1);
		server.removeReply('say', reply2);
		expect(server.replyCount('say')).toBe(0);
	});

	test('server.wss()', async () => {
		const port = 3000;
		const server = await createServer({ port });
		expect(server.wss()).toBeInstanceOf(WebSocket.Server);
	});
});
