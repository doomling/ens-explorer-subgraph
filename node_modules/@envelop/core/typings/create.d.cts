import { GetEnvelopedFn, ComposeContext, Plugin, Optional } from '@envelop/types';
declare type ExcludeFalsy<TArray extends any[]> = Exclude<TArray[0], null | undefined | false>[];
export declare function envelop<PluginsType extends Optional<Plugin<any>>[]>(options: {
    plugins: PluginsType;
    enableInternalTracing?: boolean;
}): GetEnvelopedFn<ComposeContext<ExcludeFalsy<PluginsType>>>;
export {};
