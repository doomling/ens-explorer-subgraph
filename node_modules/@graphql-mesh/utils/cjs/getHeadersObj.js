"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHeadersObj = void 0;
function headersToJSON(headers) {
    const obj = {};
    headers.forEach((value, key) => {
        obj[key] = value;
    });
    return obj;
}
function getHeadersObj(headers) {
    if (headers == null || !('forEach' in headers)) {
        return headers;
    }
    return new Proxy({}, {
        get(_target, name) {
            if (name === 'toJSON') {
                return () => headersToJSON(headers);
            }
            return headers.get(name.toString());
        },
        has(_target, name) {
            if (name === 'toJSON') {
                return true;
            }
            return headers.has(name.toString());
        },
        ownKeys(_target) {
            const keys = [];
            headers.forEach((_value, name) => {
                keys.push(name);
            });
            return keys;
        },
        set(_target, name, value) {
            headers.set(name.toString(), value);
            return true;
        },
        deleteProperty(_target, name) {
            headers.delete(name.toString());
            return true;
        },
        preventExtensions() {
            return true;
        },
    });
}
exports.getHeadersObj = getHeadersObj;
