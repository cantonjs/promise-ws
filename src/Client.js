
import WebSocket from 'ws';
import Emitter from './Emitter';
import { isFunction, isString } from './utils';

export default class Client extends Emitter {
	static create(options = {}) {
		return new Promise((resolve, reject) => {
			if (isString(options)) { options = { url: options }; }
			const ws = new WebSocket(options.url);
			const connection = new Client(ws, options, (err) => {
				if (err) { reject(err); }
				else { resolve(connection); }
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

	constructor(ws, options, callback) {
		super(ws);

		const {
			onClose,
		} = options;

		this._ws = ws;

		if (isFunction(onClose)) {
			ws.on('close', () => {
				onClose(new Error('CLOSE'));
			});
		}

		ws.on('open', callback);
		ws.on('error', callback);
	}

	close() {
		this._ws.terminate();
		this._ws = null;
	}
}
