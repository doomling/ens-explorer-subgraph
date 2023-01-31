"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyResultTransforms = exports.applyRequestTransforms = exports.applySchemaTransforms = void 0;
function applySchemaTransforms(originalWrappingSchema, subschemaConfig, transformedSchema, transforms) {
    if (transforms === null || transforms === void 0 ? void 0 : transforms.length) {
        return transforms.reduce((schema, transform) => 'transformSchema' in transform
            ? transform.transformSchema(schema, subschemaConfig)
            : schema, originalWrappingSchema);
    }
    return originalWrappingSchema;
}
exports.applySchemaTransforms = applySchemaTransforms;
function applyRequestTransforms(originalRequest, delegationContext, transformationContext, transforms) {
    transformationContext.contextMap = transformationContext.contextMap || new WeakMap();
    const contextMap = transformationContext.contextMap;
    transforms === null || transforms === void 0 ? void 0 : transforms.forEach(transform => {
        if (!contextMap.has(transform)) {
            contextMap.set(transform, {
                nextIndex: 0,
                paths: {},
            });
        }
    });
    return transforms.reduceRight((request, transform) => 'transformRequest' in transform
        ? transform.transformRequest(request, delegationContext, contextMap.get(transform))
        : request, originalRequest);
}
exports.applyRequestTransforms = applyRequestTransforms;
function applyResultTransforms(originalResult, delegationContext, transformationContext, transforms) {
    const contextMap = transformationContext.contextMap;
    return transforms.reduce((result, transform) => 'transformResult' in transform
        ? transform.transformResult(result, delegationContext, contextMap.get(transform))
        : result, originalResult);
}
exports.applyResultTransforms = applyResultTransforms;
