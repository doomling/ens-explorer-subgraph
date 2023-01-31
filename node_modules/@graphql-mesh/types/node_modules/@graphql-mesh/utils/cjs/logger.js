"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultLogger = exports.titleBold = exports.debugColor = exports.errorColor = exports.infoColor = exports.warnColor = void 0;
const cross_helpers_1 = require("@graphql-mesh/cross-helpers");
const ANSI_CODES = {
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    orange: '\x1b[48:5:166m',
};
const warnColor = msg => ANSI_CODES.orange + msg + ANSI_CODES.reset;
exports.warnColor = warnColor;
const infoColor = msg => ANSI_CODES.cyan + msg + ANSI_CODES.reset;
exports.infoColor = infoColor;
const errorColor = msg => ANSI_CODES.red + msg + ANSI_CODES.reset;
exports.errorColor = errorColor;
const debugColor = msg => ANSI_CODES.magenta + msg + ANSI_CODES.reset;
exports.debugColor = debugColor;
const titleBold = msg => ANSI_CODES.bold + msg + ANSI_CODES.reset;
exports.titleBold = titleBold;
class DefaultLogger {
    constructor(name) {
        this.name = name;
    }
    getLoggerMessage({ args = [], trim = !this.isDebug }) {
        return args
            .flat(Infinity)
            .map(arg => {
            if (typeof arg === 'string') {
                if (trim && arg.length > 100) {
                    return (arg.slice(0, 100) +
                        '...' +
                        '<Error message is too long. Enable DEBUG=1 to see the full message.>');
                }
                return arg;
            }
            else if (typeof arg === 'object' && (arg === null || arg === void 0 ? void 0 : arg.stack) != null) {
                return arg.stack;
            }
            return cross_helpers_1.util.inspect(arg);
        })
            .join(` `);
    }
    handleLazyMessage({ lazyArgs, trim }) {
        const flattenedArgs = lazyArgs.flat(Infinity).flatMap(arg => {
            if (typeof arg === 'function') {
                return arg();
            }
            return arg;
        });
        return this.getLoggerMessage({
            args: flattenedArgs,
            trim,
        });
    }
    get isDebug() {
        return (cross_helpers_1.process.env.DEBUG === '1' ||
            globalThis.DEBUG === '1' ||
            this.name.includes(cross_helpers_1.process.env.DEBUG || globalThis.DEBUG));
    }
    get prefix() {
        return this.name ? (0, exports.titleBold)(this.name) : ``;
    }
    log(...args) {
        const message = this.getLoggerMessage({
            args,
        });
        return console.log(`${this.prefix} ${message}`);
    }
    warn(...args) {
        const message = this.getLoggerMessage({
            args,
        });
        const fullMessage = `⚠️ ${this.prefix} ${(0, exports.warnColor)(message)}`;
        if (console.warn) {
            console.warn(fullMessage);
        }
        else {
            console.log(fullMessage);
        }
    }
    info(...args) {
        const message = this.getLoggerMessage({
            args,
        });
        const fullMessage = `💡 ${this.prefix} ${(0, exports.infoColor)(message)}`;
        if (console.info) {
            console.info(fullMessage);
        }
        else {
            console.log(fullMessage);
        }
    }
    error(...args) {
        const message = this.getLoggerMessage({
            args,
            trim: false,
        });
        const fullMessage = `💥 ${this.prefix} ${(0, exports.errorColor)(message)}`;
        console.log(fullMessage);
    }
    debug(...lazyArgs) {
        if (this.isDebug) {
            const message = this.handleLazyMessage({
                lazyArgs,
            });
            const fullMessage = `🐛 ${this.prefix} ${(0, exports.debugColor)(message)}`;
            if (console.debug) {
                console.debug(fullMessage);
            }
            else {
                console.log(fullMessage);
            }
        }
    }
    child(name) {
        return new DefaultLogger(this.name ? `${this.name} - ${name}` : name);
    }
}
exports.DefaultLogger = DefaultLogger;
