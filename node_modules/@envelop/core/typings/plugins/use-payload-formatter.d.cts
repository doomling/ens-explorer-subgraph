import { Plugin, TypedExecutionArgs, ExecutionResult } from '@envelop/types';
export declare type FormatterFunction = (result: ExecutionResult<any, any>, args: TypedExecutionArgs<any>) => false | ExecutionResult<any, any>;
export declare const usePayloadFormatter: (formatter: FormatterFunction) => Plugin;
