
import EventEmitter from 'events';

export default class Emitter {
	constructor(ws) {
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
					this._inputCallbacks.set(_id, (responseData) => {
						this._inputCallbacks.delete(_id);
						ws.send(JSON.stringify({ _id, responseData }));
					});
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
}
