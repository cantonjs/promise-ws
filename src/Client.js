
import WebSocket from 'ws';
import Emitter from './Emitter';

export default class Client extends Emitter {
	static connect(url) {
		return new Promise((resolve, reject) => {
			const ws = new WebSocket(url);
			const connection = new Client(ws, (err) => {
				if (err) { reject(err); }
				else { resolve(connection); }
			});
		});
	}

	constructor(ws, callback) {
		super(ws);

		this._ws = ws;

		// TODO
		ws.on('close', () => {
			// console.log('closed');
		});

		ws.on('open', callback);
		ws.on('error', callback);
	}

	close() {
		this._ws.terminate();
		this._ws = null;
	}
}
