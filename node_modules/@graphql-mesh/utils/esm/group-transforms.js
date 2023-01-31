export function groupTransforms(transforms) {
    const wrapTransforms = [];
    const noWrapTransforms = [];
    transforms === null || transforms === void 0 ? void 0 : transforms.forEach(transform => {
        if (transform.noWrap) {
            noWrapTransforms.push(transform);
        }
        else {
            wrapTransforms.push(transform);
        }
    });
    return { wrapTransforms, noWrapTransforms };
}
