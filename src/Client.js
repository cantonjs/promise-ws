
import WebSocket from 'ws';
import EventEmitter from 'events';
import { isFunction, isString } from './utils';

export default class Client {
	static create(options = {}) {
		return new Promise((resolve, reject) => {
			if (isString(options)) { options = { url: options }; }
			const ws = new WebSocket(options.url);
			const connection = new Client(ws, {
				...options,
				onOpen() { resolve(connection); },
				onError: reject,
			});
		});
	}

	static connect(url, waitUntil) {
		return new Promise(async (resolve, reject) => {
			try {
				const client = await Client.create({ url, onClose: reject });
				const res = await waitUntil(client);
				resolve(res);
			}
			catch (err) {
				reject(err);
			}
		});
	}

	constructor(ws, options = {}) {
		const {
			onClose,
			onOpen,
			onError,
		} = options;

		this._inputCallbacks = new Map();
		this._outputCallbacks = new Map();
		this._listenersMap = new WeakMap();
		this._lastId = 0;
		this._replyEmitter = new EventEmitter();
		this._ws = ws;

		ws.on('message', (message) => {
			try {
				const { _id, type, args, responseData } = JSON.parse(message);
				if (!_id) { throw new Error(); }

				if (type) {
					const hasListener = this._replyEmitter.listenerCount(type) > 0;
					if (hasListener) {
						this._inputCallbacks.set(_id, (responseData) => {
							this._inputCallbacks.delete(_id);
							ws.send(JSON.stringify({ _id, responseData }));
						});
					}
					else {
						ws.send(JSON.stringify({ _id }));
					}
					this._replyEmitter.emit(type, _id, ...args);
				}
				else if (this._outputCallbacks.has(_id)) {
					const response = this._outputCallbacks.get(_id);
					response(responseData);
				}
			}
			catch (err) {
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
	}

	onReply(type, listener) {
		const finalListener = async (_id, ...args) => {
			if (listener) {
				const responseData = await listener(...args);

				if (this._inputCallbacks.has(_id)) {
					const handler = this._inputCallbacks.get(_id);
					handler(responseData);
				}
			}
		};
		this._listenersMap.set(listener, finalListener);
		this._replyEmitter.on(type, finalListener);
		return this;
	}

	reply(...args) {
		return this.onReply(...args);
	}

	addReply(...args) {
		return this.onReply(...args);
	}

	replyCount(type) {
		return this._replyEmitter.listenerCount(type);
	}

	waitFor(type) {
		return new Promise((resolve) => {
			const listener = (...args) => {
				resolve(args);
			};
			this.onReply(type, listener);
		});
	}

	removeReply(type, listener) {
		const finalListener = this._listenersMap.get(listener);
		if (finalListener) {
			this._listenersMap.delete(listener);
			this._replyEmitter.removeListener(type, finalListener);
		}
		return this;
	}

	request(type, ...args) {
		return new Promise((resolve, reject) => {
			try {
				const _id = ++this._lastId;

				this._outputCallbacks.set(_id, (responseData) => {
					this._outputCallbacks.delete(_id);
					resolve(responseData);
				});

				this._ws.send(JSON.stringify({ _id, type, args }));
			}
			catch (err) {
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
