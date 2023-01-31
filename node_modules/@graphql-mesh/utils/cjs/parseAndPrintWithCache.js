"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gql = exports.printWithCache = exports.parseWithCache = void 0;
const utils_1 = require("@graphql-tools/utils");
const graphql_1 = require("graphql");
const global_lru_cache_js_1 = require("./global-lru-cache.js");
const parseCache = (0, global_lru_cache_js_1.createLruCache)(1000, 3600);
const printCache = (0, global_lru_cache_js_1.createLruCache)(1000, 3600);
function parseWithCache(sdl) {
    const trimmedSdl = sdl.trim();
    let document = parseCache.get(trimmedSdl);
    if (!document) {
        document = (0, graphql_1.parse)(trimmedSdl, { noLocation: true });
        parseCache.set(trimmedSdl, document);
        printCache.set(JSON.stringify(document), trimmedSdl);
    }
    return document;
}
exports.parseWithCache = parseWithCache;
exports.printWithCache = (0, utils_1.memoize1)(function printWithCache(document) {
    const stringifedDocumentJson = JSON.stringify(document);
    let sdl = printCache.get(stringifedDocumentJson);
    if (!sdl) {
        sdl = (0, graphql_1.print)(document).trim();
        printCache.set(stringifedDocumentJson, sdl);
        parseCache.set(sdl, document);
    }
    return sdl;
});
function gql([sdl], ...args) {
    let result = sdl;
    for (const arg of args || []) {
        if (typeof arg === 'string') {
            result += arg;
        }
        else {
            result += (0, exports.printWithCache)(arg);
        }
    }
    return parseWithCache(result);
}
exports.gql = gql;
