
import WebSocket from 'ws';
import pify from 'pify';
import Emitter from './Emitter';

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
		this._emitters = new Map();

		function heartbeat() {
			this.isAlive = true;
		}

		wss.on('connection', (ws) => {
			ws.isAlive = true;
			ws.on('pong', heartbeat);

			// TODO
			ws.on('close', () => {
				// console.log('closed');
			});

			const emitter = new Emitter(ws);
			this._emitters.set(ws, emitter);
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
		this._emitters.forEach((emitter) => {
			emitter.on(...args);
		});
		return this;
	}

	_forEach(iterator) {
		this._wss.clients.forEach((ws) => {
			if (ws.readyState === WebSocket.OPEN) {
				const emitter = this._emitters.get(ws);
				if (emitter) { iterator(emitter); }
			}
		});
	}

	emit(...args) {
		const promises = [];
		this._forEach((emitter) => {
			promises.push(emitter.emit(...args));
		});
		return Promise.all(promises);
	}

	removeListener(...args) {
		this._forEach((emitter) => {
			emitter.removeListener(...args);
		});
		return this;
	}

	close() {
		clearInterval(this._heartbeatInterval);
		return pify(::this._wss.close)();
	}
}
