"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInterpolatedHeadersFactory = exports.getInterpolatedStringFactory = exports.parseInterpolationStrings = exports.getInterpolationKeys = void 0;
const index_js_1 = require("./index.js");
function getInterpolationKeys(...interpolationStrings) {
    return interpolationStrings.reduce((keys, str) => [
        ...keys,
        ...(str ? index_js_1.stringInterpolator.parseRules(str).map((match) => match.key) : []),
    ], []);
}
exports.getInterpolationKeys = getInterpolationKeys;
function parseInterpolationStrings(interpolationStrings, argTypeMap) {
    const interpolationKeys = getInterpolationKeys(...interpolationStrings);
    const args = {};
    const contextVariables = {};
    for (const interpolationKey of interpolationKeys) {
        const interpolationKeyParts = interpolationKey.split('.');
        const varName = interpolationKeyParts[interpolationKeyParts.length - 1];
        const initialObject = interpolationKeyParts[0];
        const argType = argTypeMap && varName in argTypeMap
            ? argTypeMap[varName]
            : interpolationKeyParts.length > 2
                ? 'JSON'
                : 'ID';
        switch (initialObject) {
            case 'args':
                args[varName] = {
                    type: argType,
                };
                break;
            case 'context':
                contextVariables[varName] = `Scalars['${argType}']`;
                break;
        }
    }
    return {
        args,
        contextVariables,
    };
}
exports.parseInterpolationStrings = parseInterpolationStrings;
function getInterpolatedStringFactory(nonInterpolatedString) {
    return resolverData => index_js_1.stringInterpolator.parse(nonInterpolatedString, resolverData);
}
exports.getInterpolatedStringFactory = getInterpolatedStringFactory;
function getInterpolatedHeadersFactory(nonInterpolatedHeaders = {}) {
    return resolverData => {
        const headers = {};
        for (const headerName in nonInterpolatedHeaders) {
            const headerValue = nonInterpolatedHeaders[headerName];
            if (headerValue) {
                headers[headerName.toLowerCase()] = index_js_1.stringInterpolator.parse(headerValue, resolverData);
            }
        }
        return headers;
    };
}
exports.getInterpolatedHeadersFactory = getInterpolatedHeadersFactory;
