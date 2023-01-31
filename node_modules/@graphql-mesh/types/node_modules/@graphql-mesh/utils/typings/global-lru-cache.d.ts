import { Lru } from 'tiny-lru';
export type LRUCache = Lru<any>;
export declare function createLruCache(max?: number, ttl?: number): LRUCache;
