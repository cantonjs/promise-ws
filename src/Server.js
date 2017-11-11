
import WebSocket from 'ws';
import pify from 'pify';
import Client from './Client';

export default class Server {
	static async create(options) {
		return new Promise((resolve, reject) => {
			const connection = new Server(options, (err) => {
				if (err) { reject(err); }
				else { resolve(connection); }
			});
		});
	}

	constructor(options, callback) {
		const wss = new WebSocket.Server({
			...options,
			clientTracking: true,
		});

		this._wss = wss;
		this._clients = new Map();
		this._listeners = new Map();

		function heartbeat() {
			this.isAlive = true;
		}

		wss.on('connection', (ws) => {
			ws.isAlive = true;
			ws.on('pong', heartbeat);

			ws.on('close', () => {
				this._clients.delete(ws);
			});

			const client = new Client(ws);
			this._clients.set(ws, client);

			this._listeners.forEach((type, listener) => {
				client.addReply(type, listener);
			});
		});

		this._heartbeatInterval = setInterval(() => {
			wss.clients.forEach((ws) => {
				if (ws.isAlive === false) {
					return ws.terminate();
				}

				ws.isAlive = false;
				ws.ping('', false, true);
			});
		}, 30000);

		wss.on('listening', callback);
		wss.on('error', callback);
	}

	onReply(type, listener) {
		this._listeners.set(listener, type);
		this._forEach((client) => {
			client.onReply(type, listener);
		});
		return this;
	}

	reply(...args) {
		return this.onReply(...args);
	}

	addReply(type, listener) {
		return this.onReply(type, listener);
	}

	waitFor(type) {
		return new Promise((resolve) => {
			const listener = (...args) => {
				resolve(args);
			};
			this.onReply(type, listener);
		});
	}

	_forEach(iterator) {
		this._wss.clients.forEach((ws) => {
			if (ws.readyState === WebSocket.OPEN) {
				const client = this._clients.get(ws);
				if (client) { iterator(client); }
			}
		});
	}

	request(...args) {
		const promises = [];
		this._forEach((client) => {
			promises.push(client.request(...args));
		});
		return Promise.all(promises);
	}

	removeReply(type, listener) {
		this._listeners.delete(listener);
		this._forEach((client) => {
			client.removeReply(type, listener);
		});
		return this;
	}

	wss() {
		return this._wss;
	}

	close() {
		clearInterval(this._heartbeatInterval);
		return pify(::this._wss.close)();
	}
}
