"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useSubschema = void 0;
const utils_1 = require("@graphql-mesh/utils");
const delegate_1 = require("@graphql-tools/delegate");
const utils_2 = require("@graphql-tools/utils");
const core_1 = require("@envelop/core");
const graphql_1 = require("graphql");
const batch_execute_1 = require("@graphql-tools/batch-execute");
function isIntrospectionOperation(operationAST) {
    let isIntrospectionOperation = false;
    (0, graphql_1.visit)(operationAST, {
        Field: node => {
            if (node.name.value === '__schema' || node.name.value === '__type') {
                isIntrospectionOperation = true;
                return graphql_1.BREAK;
            }
        },
    });
    return isIntrospectionOperation;
}
function getExecuteFn(subschema) {
    return async function subschemaExecute(args) {
        var _a;
        const originalRequest = {
            document: args.document,
            variables: args.variableValues,
            operationName: (_a = args.operationName) !== null && _a !== void 0 ? _a : undefined,
            rootValue: args.rootValue,
            context: args.contextValue,
        };
        const operationAST = (0, utils_2.getOperationASTFromRequest)(originalRequest);
        // TODO: We need more elegant solution
        if (isIntrospectionOperation(operationAST)) {
            return (0, graphql_1.execute)(args);
        }
        const delegationContext = {
            subschema,
            subschemaConfig: subschema,
            targetSchema: args.schema,
            operation: operationAST.operation,
            fieldName: '',
            context: args.contextValue,
            rootValue: args.rootValue,
            transforms: subschema.transforms,
            transformedSchema: subschema.transformedSchema,
            skipTypeMerging: true,
            returnType: (0, utils_2.getDefinedRootType)(args.schema, operationAST.operation),
        };
        let executor = subschema.executor;
        if (executor == null) {
            executor = (0, delegate_1.createDefaultExecutor)(subschema.schema);
        }
        if (subschema.batch) {
            executor = (0, batch_execute_1.createBatchingExecutor)(executor);
        }
        const transformationContext = {};
        const transformedRequest = (0, utils_1.applyRequestTransforms)(originalRequest, delegationContext, transformationContext, subschema.transforms);
        const originalResult = await executor(transformedRequest);
        if ((0, utils_2.isAsyncIterable)(originalResult)) {
            return (0, core_1.mapAsyncIterator)(originalResult, singleResult => (0, utils_1.applyResultTransforms)(singleResult, delegationContext, transformationContext, subschema.transforms));
        }
        const transformedResult = (0, utils_1.applyResultTransforms)(originalResult, delegationContext, transformationContext, subschema.transforms);
        return transformedResult;
    };
}
// Creates an envelop plugin to execute a subschema inside Envelop
function useSubschema(subschema) {
    const executeFn = getExecuteFn(subschema);
    const plugin = {
        onPluginInit({ setSchema }) {
            // To prevent unwanted warnings from stitching
            if (!('_transformedSchema' in subschema)) {
                subschema.transformedSchema = (0, delegate_1.applySchemaTransforms)(subschema.schema, subschema);
            }
            subschema.transformedSchema.extensions =
                subschema.transformedSchema.extensions || subschema.schema.extensions || {};
            Object.assign(subschema.transformedSchema.extensions, subschema.schema.extensions);
            setSchema(subschema.transformedSchema);
        },
        onExecute({ setExecuteFn }) {
            setExecuteFn(executeFn);
        },
        onSubscribe({ setSubscribeFn }) {
            setSubscribeFn(executeFn);
        },
    };
    return plugin;
}
exports.useSubschema = useSubschema;
