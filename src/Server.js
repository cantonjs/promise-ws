
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

	on(...args) {
		this._clients.forEach((client) => {
			client.on(...args);
		});
		return this;
	}

	addListener(...args) {
		return this.on(...args);
	}

	waitFor(type) {
		return new Promise((resolve) => {
			const listener = (...args) => {
				resolve(args);
			};
			this.on(type, listener);
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

	emit(...args) {
		const promises = [];
		this._forEach((client) => {
			promises.push(client.emit(...args));
		});
		return Promise.all(promises);
	}

	removeListener(...args) {
		this._forEach((client) => {
			client.removeListener(...args);
		});
		return this;
	}

	close() {
		clearInterval(this._heartbeatInterval);
		return pify(::this._wss.close)();
	}
}
