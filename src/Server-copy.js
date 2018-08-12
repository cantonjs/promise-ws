import WebSocket from 'ws';
import EventEmitter from 'events';
import pify from 'pify';
import Client from './Client';
import { noop, isObject, CLOSE_SIGNAL } from './utils';

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
		if (!isObject(options)) {
			throw new Error('Missing option argument, expected an object.');
		}

		super();

		const { server, noServer } = options;
		const wss = new WebSocket.Server({
			...options,
			clientTracking: true,
		});

		this.clients = new Map();
		this._wss = wss;
		this._emitter = new EventEmitter();
		this._closeEmitter = new EventEmitter();

		/* istanbul ignore next */
		function heartbeat() {
			this.isAlive = true;
		}

		wss.on('connection', (ws) => {
			const client = new Client(ws);
			this.clients.set(ws, client);

			ws.isAlive = true;
			ws.on('pong', heartbeat);

			ws.on('close', () => {
				this.clients.delete(ws);
			});

			ws.on('message', (message) => {
				if (message === CLOSE_SIGNAL) {
					this.emit('requestClose', client);
					this._closeEmitter.emit(CLOSE_SIGNAL, client);
				}
			});

			const emitter = this._emitter;

			/* istanbul ignore next */
			const types =
				typeof emitter.eventNames === 'function' ?
					emitter.eventNames() :
					Object.keys(emitter._events);

			types.forEach((type) => {
				emitter.listeners(type).forEach((listener) => {
					client.addReply(type, listener);
				});
			});

			// this._closeEmitter.listeners(CLOSE_SIGNAL).forEach((listener) => {
			// 	client.requestClose(listener);
			// });
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

		const forward = (type) => wss.on(type, this.emit.bind(this, type));

		this.on('error', noop);

		forward('connection');
		forward('error');
		forward('headers');

		if (
			noServer ||
			/* istanbul ignore next */
			(server && server.listening)
		) {
			process.nextTick(callback);
		}
		else {
			wss.on('listening', callback);
		}
		wss.on('error', callback);
	}

	onReply(type, listener) {
		this._emitter.addListener(type, listener);
		this._forEach((client) => {
			client.onReply(type, listener);
		});
		return this;
	}

	onReplyClose(listener) {
		this._closeEmitter.addListener(CLOSE_SIGNAL, async (client) => {
			const shouldClose = await listener(client);
			if (shouldClose) await this.close();
			else {
				client.ws().send('REJECT TO CLOSE');
			}
		});
		return this;
	}

	reply(...args) {
		return this.onReply(...args);
	}

	addReply(...args) {
		return this.onReply(...args);
	}

	replyCount(type) {
		return this._emitter.listenerCount(type);
	}

	_createClientsIterator(iterator) {
		return (ws) => {
			/* istanbul ignore else */
			if (ws.readyState === WebSocket.OPEN) {
				const client = this.clients.get(ws);

				/* istanbul ignore else */
				if (client) {
					iterator(client);
				}
			}
		};
	}

	onConnection(iterator) {
		this._wss.on('connection', this._createClientsIterator(iterator));
	}

	_forEach(iterator) {
		this._wss.clients.forEach(this._createClientsIterator(iterator));
	}

	removeReply(type, listener) {
		/* istanbul ignore else */
		this._emitter.removeListener(type, listener);
		this._forEach((client) => {
			client.removeReply(type, listener);
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
