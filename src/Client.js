
import WebSocket from 'ws';
import EventEmitter from 'events';
import delay from 'delay';
import { isFunction, noop } from './utils';

export default class Client extends EventEmitter {
	static create(address, options = {}) {
		return new Promise((resolve, reject) => {
			const ws = new WebSocket(address);
			const connection = new Client(ws, {
				...options,
				onOpen() { resolve(connection); },
				onError: reject,
			});
		});
	}

	static connect(address, waitUntil) {
		return new Promise(async (resolve, reject) => {
			try {
				const client = await Client.create(address, { onClose: reject });
				const res = await waitUntil(client);
				resolve(res);
			}
			catch (err) {
				reject(err);
			}
		});
	}

	static async autoReconnect(address, waitUntil, reconnectDelay = 1000) {
		try {
			return await Client.connect(address, waitUntil);
		}
		catch (err) {
			if (err.message === 'CLOSE') {
				await delay(reconnectDelay);
				return Client.autoReconnect(address, waitUntil);
			}
			else {
				throw err;
			}
		}
	}

	constructor(ws, options = {}) {
		super();

		const {
			onClose,
			onOpen,
			onError,
		} = options;

		this._inputCallbacks = new Map();
		this._outputCallbacks = new Map();
		this._listeners = new WeakMap();
		this._lastId = 0;
		this._replyEmitter = new EventEmitter();
		this._ws = ws;

		ws.on('message', async (message) => {
			try {
				const { _id, name, args, responseData } = JSON.parse(message);
				if (!_id) { throw new Error(); }

				if (name) {
					const hasListener = this._replyEmitter.listenerCount(name) > 0;
					if (hasListener) {
						this._inputCallbacks.set(_id, async (responseData) => {
							this._inputCallbacks.delete(_id);
							await this._wsSend(JSON.stringify({ _id, responseData }));
						});
					}
					else {
						await this._wsSend(JSON.stringify({ _id }));
					}
					this._replyEmitter.emit(name, _id, ...args);
				}
				else if (this._outputCallbacks.has(_id)) {
					const response = this._outputCallbacks.get(_id);
					response(responseData);
				}
			}
			catch (err) {
				/* istanbul ignore next */

				// this._replyEmitter.emit('message', message);

				// TODO
				console.error(err);
			}
		});

		if (isFunction(onClose)) {
			ws.on('close', () => {
				onClose(new Error('CLOSE'));
			});
		}

		if (isFunction(onOpen)) { ws.on('open', onOpen); }
		if (isFunction(onError)) { ws.on('error', onError); }

		const forward = (eventType) => {
			ws.on(eventType, this.emit.bind(this, eventType));
		};

		this.on('error', noop);

		forward('open');
		forward('close');
		forward('headers');
		forward('error');
		forward('message');
		forward('ping');
		forward('pong');
		forward('unexpected-response');
	}

	_wsSend(data) {
		return new Promise((resolve, reject) => {
			this._ws.send(data, (err) => {
				if (err) {
					reject(err);
				}
				else {
					resolve();
				}
			})
		});
	}

	onReply(name, listener, errorHandler) {
		const finalListener = async (_id, ...args) => {
			try {
				const responseData = await listener(...args);

				if (this._inputCallbacks.has(_id)) {
					const handler = this._inputCallbacks.get(_id);
					await handler(responseData);
				}
			}
			catch (err) {
				if (typeof errorHandler === 'function') {
					errorHandler(err);
				}
			}
		};
		this._listeners.set(listener, finalListener);
		this._replyEmitter.on(name, finalListener);
		return this;
	}

	reply(...args) {
		return this.onReply(...args);
	}

	addReply(...args) {
		return this.onReply(...args);
	}

	replyOnce(name, listener) {
		const finalListener = async (...args) => {
			this.removeReply(name, listener);
			return listener(...args);
		};
		this.onReply(name, finalListener);

		// to make listener removable
		const onReply = this._listeners.get(finalListener);
		const delted = this._listeners.delete(finalListener);
		if (delted) { this._listeners.set(listener, onReply); }

		return this;
	}

	replyCount(name) {
		return this._replyEmitter.listenerCount(name);
	}

	waitFor(name) {
		return new Promise((resolve) => {
			const listener = (...args) => {
				resolve(args);
			};
			this.replyOnce(name, listener);
		});
	}

	removeReply(name, listener) {
		const finalListener = this._listeners.get(listener);
		if (finalListener) {
			this._listeners.delete(listener);
			this._replyEmitter.removeListener(name, finalListener);
		}
		return this;
	}

	request(name, ...args) {
		return new Promise((resolve, reject) => {
			try {
				const _id = ++this._lastId;

				this._outputCallbacks.set(_id, (responseData) => {
					this._outputCallbacks.delete(_id);
					resolve(responseData);
				});

				this._ws.send(JSON.stringify({ _id, name, args }), (err) => {

					/* istanbul ignore else */
					if (err) { reject(err); }

				});
			}
			catch (err) {

				/* istanbul ignore next */
				reject(err);
			}
		});
	}

	ws() {
		return this._ws;
	}

	close() {
		this._ws.terminate();
		this._ws = null;
	}
}
