export function isFunction(target) {
	return typeof target === 'function';
}

export function isObject(target) {
	return typeof target === 'object';
}

export function noop() {}

export const CLOSE_SIGNAL = '__WS_CLOSE_SIGNAL__';
