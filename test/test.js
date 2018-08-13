import WebSocket from '../src';
import delay from 'delay';
import net from 'net';
import pify from 'pify';

const servers = [];
const clients = [];

afterEach(async () => {
	await Promise.all(
		[
			...clients.map(async (client) => client.terminate()),
			...servers.map(async (server) => server.close()),
		].filter(Boolean),
	);
	servers.length = 0;
	clients.length = 0;
});

describe('promise-ws', () => {
	test('create', async () => {
		const port = 3000;
		const wss = await WebSocket.Server.create({ port });
		const ws = await WebSocket.create(`ws://127.0.0.1:${port}`);
		servers.push(wss);
		clients.push(ws);
		expect(ws).toBeInstanceOf(WebSocket.WebSocket);
		expect(wss).toBeInstanceOf(WebSocket.Server);
	});

	test('create with net server', async () => {
		const server = new net.Server();
		await pify(::server.listen)();
		const wss = await WebSocket.Server.create({ server });
		servers.push(server, wss);
		expect(wss).toBeInstanceOf(WebSocket.Server);
	});

	test('throw error when missing args', async () => {
		await expect(WebSocket.Server.create()).rejects.toBeDefined();
	});

	test('ws.send', async () => {
		const port = 3000;
		const listener = jest.fn();
		const wss = await WebSocket.Server.create({ port });
		wss.on('connection', (ws) => {
			ws.on('message', listener);
		});
		const ws = await WebSocket.create(`ws://127.0.0.1:${port}`);
		servers.push(wss);
		clients.push(ws);
		await ws.send('foo');
		await delay(100);
		expect(listener).toHaveBeenCalledTimes(1);
		expect(listener).toHaveBeenLastCalledWith('foo');
	});

	test('throw error if ws disconnected before ws.send', async () => {
		const port = 3000;
		const listener = jest.fn();
		const wss = await WebSocket.Server.create({ port });
		wss.on('connection', (ws) => {
			ws.on('message', listener);
		});
		const ws = await WebSocket.create(`ws://127.0.0.1:${port}`);
		servers.push(wss);
		clients.push(ws);
		ws.terminate();
		await expect(ws.send('foo')).rejects.toBeDefined();
	});

	test('wss.send', async () => {
		const port = 3000;
		const listener = jest.fn();
		const wss = await WebSocket.Server.create({ port });
		wss.on('connection', async (ws) => {
			await delay(100);
			await ws.send('foo');
		});
		const ws = await WebSocket.create(`ws://127.0.0.1:${port}`);
		servers.push(wss);
		clients.push(ws);
		ws.on('message', listener);
		await delay(200);
		expect(listener).toHaveBeenCalledTimes(1);
		expect(listener).toHaveBeenLastCalledWith('foo');
	});

	test('throw error if ws disconnected before ws.send', async () => {
		const port = 3000;
		const called = jest.fn();
		const wss = await WebSocket.Server.create({ port });
		wss.on('connection', async (ws) => {
			await wss.close();
			await expect(ws.send('foo')).rejects.toBeDefined();
			called();
		});
		const ws = await WebSocket.create(`ws://127.0.0.1:${port}`);
		servers.push(wss);
		clients.push(ws);
		await delay(200);
		expect(called).toHaveBeenCalledTimes(1);
	});

	test('wss on connection in multiple times', async () => {
		const port = 3000;
		const listener = jest.fn();
		const wss = await WebSocket.Server.create({ port });
		wss.on('connection', (ws) => {
			ws.on('message', listener);
		});
		wss.on('connection', (ws) => {
			ws.on('message', listener);
		});
		const ws = await WebSocket.create(`ws://127.0.0.1:${port}`);
		servers.push(wss);
		clients.push(ws);
		await ws.send('foo');
		await delay(100);
		expect(listener).toHaveBeenCalledTimes(2);
	});
});
