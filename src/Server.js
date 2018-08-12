import WebSocket from 'ws';
import pify from 'pify';
import Client from './Client';
import { isObject } from './utils';

export default class Server extends WebSocket.Server {
	static async create(options) {
		return new Promise((resolve, reject) => {
			const connection = new Server(options, (err) => {
				if (err) reject(err);
				else resolve(connection);
			});
		});
	}

	constructor(options, callback) {
		if (!isObject(options)) {
			throw new Error('Missing option argument, expected an object.');
		}

		super({ ...options, clientTracking: true });

		const { server, noServer } = options;

		/* istanbul ignore next */
		function heartbeat() {
			this.isAlive = true;
		}

		super.on('connection', (ws) => {
			ws.isAlive = true;
			ws.on('pong', heartbeat);
		});

		/* istanbul ignore next */
		this._heartbeatInterval = setInterval(() => {
			this.clients.forEach((ws) => {
				if (!ws.isAlive) return ws.terminate();
				ws.isAlive = false;
				ws.ping('', false, true);
			});
		}, 30000);

		if (
			noServer ||
			/* istanbul ignore next */
			(server && server.listening)
		) {
			process.nextTick(callback);
		}
		else {
			super.on('listening', callback);
		}
		super.on('error', callback);
	}

	on(event, listener) {
		if (event === 'connection') {

			// TODO: should handle remove listener
			return super(event, (ws) => listener(new Client(ws)));
		}
		return super(event, listener);
	}

	close() {
		clearInterval(this._heartbeatInterval);
		return pify(::super.close)();
	}
}
