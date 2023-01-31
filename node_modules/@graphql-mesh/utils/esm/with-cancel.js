export function withCancel(asyncIterable, onCancel) {
    return new Proxy(asyncIterable, {
        get(asyncIterable, prop) {
            var _a;
            if (prop === Symbol.asyncIterator) {
                return function getIteratorWithCancel() {
                    const asyncIterator = asyncIterable[Symbol.asyncIterator]();
                    return {
                        next: asyncIterator.next ? (...args) => asyncIterator.next(...args) : undefined,
                        return: async (...args) => {
                            onCancel();
                            if (asyncIterator.return) {
                                return asyncIterator.return(...args);
                            }
                            return {
                                value: undefined,
                                done: true,
                            };
                        },
                        throw: asyncIterator.throw ? (...args) => asyncIterator.throw(...args) : undefined,
                    };
                };
            }
            return (_a = asyncIterable[prop]) === null || _a === void 0 ? void 0 : _a.bind(asyncIterable);
        },
    });
}
