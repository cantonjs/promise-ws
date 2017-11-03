
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
		this._listeners = new WeakMap();
		this._lastId = 0;
		this._eventEmitter = new EventEmitter();
		this._ws = ws;

		ws.on('message', (message) => {
			try {
				const { _id, type, args, responseData } = JSON.parse(message);
				if (!_id) { throw new Error(); }

				if (type) {
					const hasListener = this._eventEmitter.listenerCount(type) > 0;
					if (hasListener) {
						this._inputCallbacks.set(_id, (responseData) => {
							this._inputCallbacks.delete(_id);
							ws.send(JSON.stringify({ _id, responseData }));
						});
					}
					else {
						ws.send(JSON.stringify({ _id }));
					}
					this._eventEmitter.emit(type, _id, ...args);
				}
				else if (this._outputCallbacks.has(_id)) {
					const response = this._outputCallbacks.get(_id);
					response(responseData);
				}
			}
			catch (err) {
				// this._eventEmitter.emit('message', message);

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


	on(type, listener) {
		const finalListener = async (_id, ...args) => {
			if (listener) {
				const responseData = await listener(...args);

				if (this._inputCallbacks.has(_id)) {
					const handler = this._inputCallbacks.get(_id);
					handler(responseData);
				}
			}
		};
		this._listeners.set(listener, finalListener);
		this._eventEmitter.on(type, finalListener);
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

	removeListener(type, listener) {
		const finalListener = this._listeners.get(listener);
		if (finalListener) {
			this._listeners.delete(listener);
			this._eventEmitter.removeListener(type, finalListener);
		}
		return this;
	}

	emit(type, ...args) {
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
