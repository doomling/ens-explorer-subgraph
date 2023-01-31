"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveAdditionalResolvers = exports.resolveAdditionalResolversWithoutImport = void 0;
const tslib_1 = require("tslib");
const utils_1 = require("@graphql-tools/utils");
const graphql_1 = require("graphql");
const with_filter_js_1 = require("./with-filter.js");
const lodash_get_1 = tslib_1.__importDefault(require("lodash.get"));
const lodash_set_1 = tslib_1.__importDefault(require("lodash.set"));
const lodash_topath_1 = tslib_1.__importDefault(require("lodash.topath"));
const string_interpolation_1 = require("@graphql-mesh/string-interpolation");
const load_from_module_export_expression_js_1 = require("./load-from-module-export-expression.js");
const cross_helpers_1 = require("@graphql-mesh/cross-helpers");
function getTypeByPath(type, path) {
    if ('ofType' in type) {
        return getTypeByPath((0, graphql_1.getNamedType)(type), path);
    }
    if (path.length === 0) {
        return (0, graphql_1.getNamedType)(type);
    }
    if (!('getFields' in type)) {
        throw new Error(`${type} cannot have a path ${path.join('.')}`);
    }
    const fieldMap = type.getFields();
    const currentFieldName = path[0];
    // Might be an index of an array
    if (!Number.isNaN(parseInt(currentFieldName))) {
        return getTypeByPath(type, path.slice(1));
    }
    const field = fieldMap[currentFieldName];
    if (!(field === null || field === void 0 ? void 0 : field.type)) {
        throw new Error(`${type}.${currentFieldName} is not a valid field.`);
    }
    return getTypeByPath(field.type, path.slice(1));
}
function generateSelectionSetFactory(schema, additionalResolver) {
    if (additionalResolver.sourceSelectionSet) {
        return () => (0, utils_1.parseSelectionSet)(additionalResolver.sourceSelectionSet);
        // If result path provided without a selectionSet
    }
    else if (additionalResolver.result) {
        const resultPath = (0, lodash_topath_1.default)(additionalResolver.result);
        let abstractResultTypeName;
        const sourceType = schema.getType(additionalResolver.sourceTypeName);
        const sourceTypeFields = sourceType.getFields();
        const sourceField = sourceTypeFields[additionalResolver.sourceFieldName];
        const resultFieldType = getTypeByPath(sourceField.type, resultPath);
        if ((0, graphql_1.isAbstractType)(resultFieldType)) {
            if (additionalResolver.resultType) {
                abstractResultTypeName = additionalResolver.resultType;
            }
            else {
                const targetType = schema.getType(additionalResolver.targetTypeName);
                const targetTypeFields = targetType.getFields();
                const targetField = targetTypeFields[additionalResolver.targetFieldName];
                const targetFieldType = (0, graphql_1.getNamedType)(targetField.type);
                abstractResultTypeName = targetFieldType === null || targetFieldType === void 0 ? void 0 : targetFieldType.name;
            }
            if (abstractResultTypeName !== resultFieldType.name) {
                const abstractResultType = schema.getType(abstractResultTypeName);
                if (((0, graphql_1.isInterfaceType)(abstractResultType) || (0, graphql_1.isObjectType)(abstractResultType)) &&
                    !schema.isSubType(resultFieldType, abstractResultType)) {
                    throw new Error(`${additionalResolver.sourceTypeName}.${additionalResolver.sourceFieldName}.${resultPath.join('.')} doesn't implement ${abstractResultTypeName}.}`);
                }
            }
        }
        return (subtree) => {
            let finalSelectionSet = subtree;
            let isLastResult = true;
            const resultPathReversed = [...resultPath].reverse();
            for (const pathElem of resultPathReversed) {
                // Ensure the path elem is not array index
                if (Number.isNaN(parseInt(pathElem))) {
                    if (isLastResult &&
                        abstractResultTypeName &&
                        abstractResultTypeName !== resultFieldType.name) {
                        finalSelectionSet = {
                            kind: graphql_1.Kind.SELECTION_SET,
                            selections: [
                                {
                                    kind: graphql_1.Kind.INLINE_FRAGMENT,
                                    typeCondition: {
                                        kind: graphql_1.Kind.NAMED_TYPE,
                                        name: {
                                            kind: graphql_1.Kind.NAME,
                                            value: abstractResultTypeName,
                                        },
                                    },
                                    selectionSet: finalSelectionSet,
                                },
                            ],
                        };
                    }
                    finalSelectionSet = {
                        kind: graphql_1.Kind.SELECTION_SET,
                        selections: [
                            {
                                // we create a wrapping AST Field
                                kind: graphql_1.Kind.FIELD,
                                name: {
                                    kind: graphql_1.Kind.NAME,
                                    value: pathElem,
                                },
                                // Inside the field selection
                                selectionSet: finalSelectionSet,
                            },
                        ],
                    };
                    isLastResult = false;
                }
            }
            return finalSelectionSet;
        };
    }
    return undefined;
}
function generateValuesFromResults(resultExpression) {
    return function valuesFromResults(result) {
        if (Array.isArray(result)) {
            return result.map(valuesFromResults);
        }
        return (0, lodash_get_1.default)(result, resultExpression);
    };
}
function resolveAdditionalResolversWithoutImport(additionalResolver, pubsub) {
    const baseOptions = {};
    if (additionalResolver.result) {
        baseOptions.valuesFromResults = generateValuesFromResults(additionalResolver.result);
    }
    if ('pubsubTopic' in additionalResolver) {
        return {
            [additionalResolver.targetTypeName]: {
                [additionalResolver.targetFieldName]: {
                    subscribe: (0, with_filter_js_1.withFilter)((root, args, context, info) => {
                        const resolverData = { root, args, context, info, env: cross_helpers_1.process.env };
                        const topic = string_interpolation_1.stringInterpolator.parse(additionalResolver.pubsubTopic, resolverData);
                        return pubsub.asyncIterator(topic);
                    }, (root, args, context, info) => {
                        return additionalResolver.filterBy
                            ? // eslint-disable-next-line no-new-func
                                new Function(`return ${additionalResolver.filterBy}`)()
                            : true;
                    }),
                    resolve: (payload) => {
                        if (baseOptions.valuesFromResults) {
                            return baseOptions.valuesFromResults(payload);
                        }
                        return payload;
                    },
                },
            },
        };
    }
    else if ('keysArg' in additionalResolver) {
        return {
            [additionalResolver.targetTypeName]: {
                [additionalResolver.targetFieldName]: {
                    selectionSet: additionalResolver.requiredSelectionSet || `{ ${additionalResolver.keyField} }`,
                    resolve: async (root, args, context, info) => {
                        if (!baseOptions.selectionSet) {
                            baseOptions.selectionSet = generateSelectionSetFactory(info.schema, additionalResolver);
                        }
                        const resolverData = { root, args, context, info, env: cross_helpers_1.process.env };
                        const targetArgs = {};
                        for (const argPath in additionalResolver.additionalArgs || {}) {
                            (0, lodash_set_1.default)(targetArgs, argPath, string_interpolation_1.stringInterpolator.parse(additionalResolver.additionalArgs[argPath], resolverData));
                        }
                        const options = {
                            ...baseOptions,
                            root,
                            context,
                            info,
                            argsFromKeys: (keys) => {
                                const args = {};
                                (0, lodash_set_1.default)(args, additionalResolver.keysArg, keys);
                                Object.assign(args, targetArgs);
                                return args;
                            },
                            key: (0, lodash_get_1.default)(root, additionalResolver.keyField),
                        };
                        return context[additionalResolver.sourceName][additionalResolver.sourceTypeName][additionalResolver.sourceFieldName](options);
                    },
                },
            },
        };
    }
    else if ('targetTypeName' in additionalResolver) {
        return {
            [additionalResolver.targetTypeName]: {
                [additionalResolver.targetFieldName]: {
                    selectionSet: additionalResolver.requiredSelectionSet,
                    resolve: (root, args, context, info) => {
                        // Assert source exists
                        if (!context[additionalResolver.sourceName]) {
                            throw new Error(`No source found named "${additionalResolver.sourceName}"`);
                        }
                        if (!context[additionalResolver.sourceName][additionalResolver.sourceTypeName]) {
                            throw new Error(`No root type found named "${additionalResolver.sourceTypeName}" exists in the source ${additionalResolver.sourceName}\n` +
                                `It should be one of the following; ${Object.keys(context[additionalResolver.sourceName]).join(',')})}}`);
                        }
                        if (!context[additionalResolver.sourceName][additionalResolver.sourceTypeName][additionalResolver.sourceFieldName]) {
                            throw new Error(`No field named "${additionalResolver.sourceFieldName}" exists in the type ${additionalResolver.sourceTypeName} from the source ${additionalResolver.sourceName}`);
                        }
                        if (!baseOptions.selectionSet) {
                            baseOptions.selectionSet = generateSelectionSetFactory(info.schema, additionalResolver);
                        }
                        const resolverData = { root, args, context, info, env: cross_helpers_1.process.env };
                        const targetArgs = {};
                        for (const argPath in additionalResolver.sourceArgs) {
                            (0, lodash_set_1.default)(targetArgs, argPath, string_interpolation_1.stringInterpolator.parse(additionalResolver.sourceArgs[argPath].toString(), resolverData));
                        }
                        const options = {
                            ...baseOptions,
                            root,
                            args: targetArgs,
                            context,
                            info,
                        };
                        return context[additionalResolver.sourceName][additionalResolver.sourceTypeName][additionalResolver.sourceFieldName](options);
                    },
                },
            },
        };
    }
    else {
        return additionalResolver;
    }
}
exports.resolveAdditionalResolversWithoutImport = resolveAdditionalResolversWithoutImport;
function resolveAdditionalResolvers(baseDir, additionalResolvers, importFn, pubsub) {
    return Promise.all((additionalResolvers || []).map(async (additionalResolver) => {
        if (typeof additionalResolver === 'string') {
            const resolvers = await (0, load_from_module_export_expression_js_1.loadFromModuleExportExpression)(additionalResolver, {
                cwd: baseDir,
                defaultExportName: 'resolvers',
                importFn,
            });
            if (!resolvers) {
                console.warn(`Unable to load resolvers from file: ${additionalResolver}`);
                return {};
            }
            return resolvers;
        }
        else {
            const baseOptions = {};
            if (additionalResolver.result) {
                baseOptions.valuesFromResults = generateValuesFromResults(additionalResolver.result);
            }
            if ('pubsubTopic' in additionalResolver) {
                return {
                    [additionalResolver.targetTypeName]: {
                        [additionalResolver.targetFieldName]: {
                            subscribe: (0, with_filter_js_1.withFilter)((root, args, context, info) => {
                                const resolverData = { root, args, context, info, env: cross_helpers_1.process.env };
                                const topic = string_interpolation_1.stringInterpolator.parse(additionalResolver.pubsubTopic, resolverData);
                                return pubsub.asyncIterator(topic);
                            }, (root, args, context, info) => {
                                return additionalResolver.filterBy
                                    ? // eslint-disable-next-line no-new-func
                                        new Function(`return ${additionalResolver.filterBy}`)()
                                    : true;
                            }),
                            resolve: (payload) => {
                                if (baseOptions.valuesFromResults) {
                                    return baseOptions.valuesFromResults(payload);
                                }
                                return payload;
                            },
                        },
                    },
                };
            }
            else if ('keysArg' in additionalResolver) {
                return {
                    [additionalResolver.targetTypeName]: {
                        [additionalResolver.targetFieldName]: {
                            selectionSet: additionalResolver.requiredSelectionSet || `{ ${additionalResolver.keyField} }`,
                            resolve: async (root, args, context, info) => {
                                if (!baseOptions.selectionSet) {
                                    baseOptions.selectionSet = generateSelectionSetFactory(info.schema, additionalResolver);
                                }
                                const resolverData = { root, args, context, info, env: cross_helpers_1.process.env };
                                const targetArgs = {};
                                for (const argPath in additionalResolver.additionalArgs || {}) {
                                    (0, lodash_set_1.default)(targetArgs, argPath, string_interpolation_1.stringInterpolator.parse(additionalResolver.additionalArgs[argPath], resolverData));
                                }
                                const options = {
                                    ...baseOptions,
                                    root,
                                    context,
                                    info,
                                    argsFromKeys: (keys) => {
                                        const args = {};
                                        (0, lodash_set_1.default)(args, additionalResolver.keysArg, keys);
                                        Object.assign(args, targetArgs);
                                        return args;
                                    },
                                    key: (0, lodash_get_1.default)(root, additionalResolver.keyField),
                                };
                                return context[additionalResolver.sourceName][additionalResolver.sourceTypeName][additionalResolver.sourceFieldName](options);
                            },
                        },
                    },
                };
            }
            else if ('targetTypeName' in additionalResolver) {
                return {
                    [additionalResolver.targetTypeName]: {
                        [additionalResolver.targetFieldName]: {
                            selectionSet: additionalResolver.requiredSelectionSet,
                            resolve: (root, args, context, info) => {
                                // Assert source exists
                                if (!context[additionalResolver.sourceName]) {
                                    throw new Error(`No source found named "${additionalResolver.sourceName}"`);
                                }
                                if (!context[additionalResolver.sourceName][additionalResolver.sourceTypeName]) {
                                    throw new Error(`No root type found named "${additionalResolver.sourceTypeName}" exists in the source ${additionalResolver.sourceName}\n` +
                                        `It should be one of the following; ${Object.keys(context[additionalResolver.sourceName]).join(',')})}}`);
                                }
                                if (!context[additionalResolver.sourceName][additionalResolver.sourceTypeName][additionalResolver.sourceFieldName]) {
                                    throw new Error(`No field named "${additionalResolver.sourceFieldName}" exists in the type ${additionalResolver.sourceTypeName} from the source ${additionalResolver.sourceName}`);
                                }
                                if (!baseOptions.selectionSet) {
                                    baseOptions.selectionSet = generateSelectionSetFactory(info.schema, additionalResolver);
                                }
                                const resolverData = { root, args, context, info, env: cross_helpers_1.process.env };
                                const targetArgs = {};
                                for (const argPath in additionalResolver.sourceArgs) {
                                    (0, lodash_set_1.default)(targetArgs, argPath, string_interpolation_1.stringInterpolator.parse(additionalResolver.sourceArgs[argPath].toString(), resolverData));
                                }
                                const options = {
                                    ...baseOptions,
                                    root,
                                    args: targetArgs,
                                    context,
                                    info,
                                };
                                return context[additionalResolver.sourceName][additionalResolver.sourceTypeName][additionalResolver.sourceFieldName](options);
                            },
                        },
                    },
                };
            }
            else {
                return additionalResolver;
            }
        }
    }));
}
exports.resolveAdditionalResolvers = resolveAdditionalResolvers;
