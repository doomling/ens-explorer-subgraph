"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.withSpinner = exports.step = void 0;
const toolbox = __importStar(require("gluegun"));
const step = (spinner, subject, text) => {
    if (text) {
        spinner.stopAndPersist({
            text: toolbox.print.colors.muted(`${subject} ${text}`),
        });
    }
    else {
        spinner.stopAndPersist({ text: toolbox.print.colors.muted(subject) });
    }
    spinner.start();
    return spinner;
};
exports.step = step;
// Executes the function `f` in a command-line spinner, using the
// provided captions for in-progress, error and failed messages.
//
// If `f` throws an error, the spinner stops with the failure message
//   and rethrows the error.
// If `f` returns an object with a `warning` and a `result` key, the
//   spinner stops with the warning message and returns the `result` value.
// Otherwise the spinner prints the in-progress message with a check mark
//   and simply returns the value returned by `f`.
const withSpinner = async (text, errorText, warningText, f) => {
    const spinner = toolbox.print.spin(text);
    try {
        const result = await f(spinner);
        if (typeof result === 'object') {
            const hasError = Object.keys(result).includes('error');
            const hasWarning = Object.keys(result).includes('warning');
            const hasResult = Object.keys(result).includes('result');
            if (hasError) {
                spinner.fail(`${errorText}: ${result.error}`);
                return hasResult ? result.result : result;
            }
            if (hasWarning && hasResult) {
                if (result.warning !== null) {
                    spinner.warn(`${warningText}: ${result.warning}`);
                }
                spinner.succeed(text);
                return result.result;
            }
            spinner.succeed(text);
            return result;
        }
        spinner.succeed(text);
        return result;
    }
    catch (e) {
        spinner.fail(`${errorText}: ${e.message}`);
        throw e;
    }
};
exports.withSpinner = withSpinner;
