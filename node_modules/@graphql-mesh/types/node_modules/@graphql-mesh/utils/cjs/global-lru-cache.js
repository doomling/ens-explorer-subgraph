"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLruCache = void 0;
const tslib_1 = require("tslib");
const tiny_lru_1 = tslib_1.__importDefault(require("tiny-lru"));
function createLruCache(max, ttl) {
    return (0, tiny_lru_1.default)(max, ttl);
}
exports.createLruCache = createLruCache;
