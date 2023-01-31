import { Plugin, DefaultContext } from '@envelop/types';
import { SerializableGraphQLErrorLike } from './use-masked-errors.cjs';
export declare type ErrorHandler = ({ errors, context, phase, }: {
    errors: readonly Error[] | readonly SerializableGraphQLErrorLike[];
    context: Readonly<DefaultContext>;
    phase: 'parse' | 'validate' | 'context' | 'execution';
}) => void;
export declare const useErrorHandler: <ContextType extends Record<string, any>>(errorHandler: ErrorHandler) => Plugin<ContextType>;
