import WebSocket from 'ws';
import EventEmitter from 'events';
import pify from 'pify';
import Client from './Client';
import { noop } from './utils';

export default class Server extends EventEmitter {
	static async create(options) {
		return new Promise((resolve, reject) => {
			const connection = new Server(options, (err) => {
				if (err) {
					reject(err);
				}
				else {
					resolve(connection);
				}
			});
		});
	}

	constructor(options, callback) {
		super();

		const wss = new WebSocket.Server({
			...options,
			clientTracking: true,
		});

		this.clients = new Map();
		this._wss = wss;
		this._names = new Map();

		/* istanbul ignore next */
		function heartbeat() {
			this.isAlive = true;
		}

		wss.on('connection', (ws) => {
			ws.isAlive = true;
			ws.on('pong', heartbeat);

			ws.on('close', () => {
				this.clients.delete(ws);
			});

			const client = new Client(ws);
			this.clients.set(ws, client);

			this._names.forEach((listeners, name) => {
				listeners.forEach((listener) => {
					client.addReply(name, listener);
				});
			});
		});

		/* istanbul ignore next */
		this._heartbeatInterval = setInterval(() => {
			wss.clients.forEach((ws) => {
				if (!ws.isAlive) {
					return ws.terminate();
				}

				ws.isAlive = false;
				ws.ping('', false, true);
			});
		}, 30000);

		wss.on('listening', callback);
		wss.on('error', callback);

		const forward = (eventType) => {
			wss.on(eventType, this.emit.bind(this, eventType));
		};

		this.on('error', noop);

		forward('connection');
		forward('error');
		forward('headers');
	}

	onReply(name, listener) {
		const listeners = (function (names) {
			if (names.has(name)) {
				return names.get(name);
			}
			const newListeners = new Set();
			names.set(name, newListeners);
			return newListeners;
		})(this._names);

		listeners.add(listener);

		this._forEach((client) => {
			client.onReply(name, listener);
		});
		return this;
	}

	reply(...args) {
		return this.onReply(...args);
	}

	addReply(...args) {
		return this.onReply(...args);
	}

	replyCount(name) {
		const names = this._names;
		return names.has(name) ? names.get(name).size : 0;
	}

	_forEach(iterator) {
		this._wss.clients.forEach((ws) => {
			/* istanbul ignore else */
			if (ws.readyState === WebSocket.OPEN) {
				const client = this.clients.get(ws);

				/* istanbul ignore else */
				if (client) {
					iterator(client);
				}
			}
		});
	}

	removeReply(name, listener) {
		/* istanbul ignore else */
		if (this._names.has(name)) {
			const listeners = this._names.get(name);
			listeners.delete(listener);
			if (!listeners.size) {
				this._names.delete(name);
			}
		}

		this._forEach((client) => {
			client.removeReply(name, listener);
		});
		return this;
	}

	request(...args) {
		const promises = [];
		this._forEach((client) => {
			promises.push(client.request(...args));
		});
		return Promise.all(promises);
	}

	wss() {
		return this._wss;
	}

	close() {
		clearInterval(this._heartbeatInterval);
		return pify(::this._wss.close)();
	}
}
