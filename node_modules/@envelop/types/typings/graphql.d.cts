import { ObjMap } from './utils.cjs';
export interface ExecutionArgs {
    schema: any;
    document: any;
    rootValue?: any;
    contextValue?: any;
    variableValues?: any;
    operationName?: any;
    fieldResolver?: any;
    typeResolver?: any;
    subscribeFieldResolver?: any;
}
declare function parse(source: any, options?: any): any;
declare function execute(args: ExecutionArgs): any;
declare function subscribe(args: ExecutionArgs): any;
declare function validate(schema: any, documentAST: any, rules?: any, options?: any, typeInfo?: any): any;
export declare type ExecuteFunction = typeof execute;
export declare type SubscribeFunction = typeof subscribe;
export declare type ParseFunction = typeof parse;
export declare type ValidateFunction = typeof validate;
export declare type ValidateFunctionParameter = {
    /**
     * GraphQL schema instance.
     */
    schema: Parameters<ValidateFunction>[0];
    /**
     * Parsed document node.
     */
    documentAST: Parameters<ValidateFunction>[1];
    /**
     * The rules used for validation.
     * validate uses specifiedRules as exported by the GraphQL module if this parameter is undefined.
     */
    rules?: Parameters<ValidateFunction>[2];
    /**
     * TypeInfo instance which is used for getting schema information during validation
     */
    typeInfo?: Parameters<ValidateFunction>[3];
    options?: Parameters<ValidateFunction>[4];
};
/** @private */
export declare type PolymorphicExecuteArguments = [ExecutionArgs] | [
    ExecutionArgs['schema'],
    ExecutionArgs['document'],
    ExecutionArgs['rootValue'],
    ExecutionArgs['contextValue'],
    ExecutionArgs['variableValues'],
    ExecutionArgs['operationName'],
    ExecutionArgs['fieldResolver'],
    ExecutionArgs['typeResolver']
];
/** @private */
export declare type PolymorphicSubscribeArguments = PolymorphicExecuteArguments;
export declare type Path = {
    readonly prev: Path | undefined;
    readonly key: string | number;
    readonly typename: string | undefined;
};
export interface ExecutionResult<TData = ObjMap<unknown>, TExtensions = ObjMap<unknown>> {
    errors?: ReadonlyArray<any>;
    data?: TData | null;
    extensions?: TExtensions;
}
export {};
