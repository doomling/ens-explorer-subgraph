"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleFatalError = void 0;
const cross_helpers_1 = require("@graphql-mesh/cross-helpers");
function handleFatalError(e, logger) {
    logger.error(e);
    if (cross_helpers_1.process.env.JEST == null) {
        cross_helpers_1.process.exit(1);
    }
}
exports.handleFatalError = handleFatalError;
