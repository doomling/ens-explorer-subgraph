"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOperations = void 0;
const utils_1 = require("@graphql-tools/utils");
const graphql_1 = require("graphql");
function generateOperations(schema, options) {
    var _a;
    const sources = [];
    const rootTypeMap = (0, utils_1.getRootTypeMap)(schema);
    for (const [operationType, rootType] of rootTypeMap) {
        const fieldMap = rootType.getFields();
        for (const fieldName in fieldMap) {
            const operationNode = (0, utils_1.buildOperationNodeForField)({
                schema,
                kind: operationType,
                field: fieldName,
                depthLimit: options.selectionSetDepth,
            });
            const defaultName = `operation_${sources.length}`;
            const virtualFileName = ((_a = operationNode.name) === null || _a === void 0 ? void 0 : _a.value) || defaultName;
            const rawSDL = (0, graphql_1.print)(operationNode);
            const source = (0, utils_1.parseGraphQLSDL)(`${virtualFileName}.graphql`, rawSDL);
            sources.push(source);
        }
    }
    return sources;
}
exports.generateOperations = generateOperations;
