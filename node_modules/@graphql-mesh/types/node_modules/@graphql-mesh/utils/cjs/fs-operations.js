"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rmdirs = exports.mkdir = exports.writeFile = exports.writeJSON = exports.pathExists = void 0;
const cross_helpers_1 = require("@graphql-mesh/cross-helpers");
async function pathExists(path) {
    if (!path) {
        return false;
    }
    try {
        await cross_helpers_1.fs.promises.stat(path);
        return true;
    }
    catch (e) {
        if (e.toString().includes('ENOENT')) {
            return false;
        }
        else {
            throw e;
        }
    }
}
exports.pathExists = pathExists;
function writeJSON(path, data, replacer, space) {
    const stringified = JSON.stringify(data, replacer, space);
    return (0, exports.writeFile)(path, stringified, 'utf-8');
}
exports.writeJSON = writeJSON;
const writeFile = async (path, ...args) => {
    if (typeof path === 'string') {
        const containingDir = cross_helpers_1.path.dirname(path);
        if (!(await pathExists(containingDir))) {
            await mkdir(containingDir);
        }
    }
    return cross_helpers_1.fs.promises.writeFile(path, ...args);
};
exports.writeFile = writeFile;
async function mkdir(path, options = { recursive: true }) {
    const ifExists = await pathExists(path);
    if (!ifExists) {
        await cross_helpers_1.fs.promises.mkdir(path, options);
    }
}
exports.mkdir = mkdir;
async function rmdirs(dir) {
    if (await pathExists(dir)) {
        const entries = await cross_helpers_1.fs.promises.readdir(dir, { withFileTypes: true });
        const results = await Promise.allSettled(entries.map(entry => {
            const fullPath = cross_helpers_1.path.join(dir, entry.name);
            if (entry.isDirectory()) {
                return rmdirs(fullPath);
            }
            else {
                return cross_helpers_1.fs.promises.unlink(fullPath);
            }
        }));
        for (const result of results) {
            if (result.status === 'rejected' && result.reason.code !== 'ENOENT') {
                throw result.reason;
            }
        }
        await cross_helpers_1.fs.promises.rmdir(dir);
    }
}
exports.rmdirs = rmdirs;
