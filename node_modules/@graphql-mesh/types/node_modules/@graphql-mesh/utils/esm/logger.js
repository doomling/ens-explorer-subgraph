import { process, util } from '@graphql-mesh/cross-helpers';
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
export const warnColor = msg => ANSI_CODES.orange + msg + ANSI_CODES.reset;
export const infoColor = msg => ANSI_CODES.cyan + msg + ANSI_CODES.reset;
export const errorColor = msg => ANSI_CODES.red + msg + ANSI_CODES.reset;
export const debugColor = msg => ANSI_CODES.magenta + msg + ANSI_CODES.reset;
export const titleBold = msg => ANSI_CODES.bold + msg + ANSI_CODES.reset;
export class DefaultLogger {
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
            return util.inspect(arg);
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
        return (process.env.DEBUG === '1' ||
            globalThis.DEBUG === '1' ||
            this.name.includes(process.env.DEBUG || globalThis.DEBUG));
    }
    get prefix() {
        return this.name ? titleBold(this.name) : ``;
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
        const fullMessage = `⚠️ ${this.prefix} ${warnColor(message)}`;
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
        const fullMessage = `💡 ${this.prefix} ${infoColor(message)}`;
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
        const fullMessage = `💥 ${this.prefix} ${errorColor(message)}`;
        console.log(fullMessage);
    }
    debug(...lazyArgs) {
        if (this.isDebug) {
            const message = this.handleLazyMessage({
                lazyArgs,
            });
            const fullMessage = `🐛 ${this.prefix} ${debugColor(message)}`;
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
