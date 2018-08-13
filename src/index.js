import WebSocket from 'ws';
import pify from 'pify';

function extendWS(ws) {
	if (ws._promised) return ws;

	function promisify(method) {
		const callbackMethod = `${method}Callback`;
		ws[callbackMethod] = ws[method];
		ws[method] = pify(ws[callbackMethod]);
	}

	ws._promised = true;
	promisify('send');
	promisify('ping');
	promisify('pong');
	return ws;
}

class PromiseWebSocketServer extends WebSocket.Server {
	static async create(options) {
		return new Promise((resolve, reject) => {
			const wss = new PromiseWebSocketServer(options);
			const { server, noServer } = options;
			const done = () => resolve(wss);
			if (noServer || (server && server.listening)) process.nextTick(done);
			else wss.once('listening', done);
			wss.once('error', reject);
		});
	}

	on(event, listener) {
		if (event === 'connection') {
			return super.on(event, (ws) => listener(extendWS(ws)));
		}
		return super.on(event, listener);
	}

	close() {
		return pify(super.close.bind(this))();
	}
}

export default class PromiseWebSocket extends WebSocket {
	static Server = PromiseWebSocketServer;
	static WebSocket = WebSocket;

	static create(...args) {
		return new Promise((resolve, reject) => {
			const ws = new PromiseWebSocket(...args);
			ws.once('open', () => resolve(ws));
			ws.once('error', reject);
		});
	}

	constructor(...args) {
		super(...args);
		extendWS(this);
	}
}
