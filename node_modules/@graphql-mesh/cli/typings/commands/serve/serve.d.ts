/// <reference types="node" />
/// <reference types="node/http.js" />
/// <reference types="postgraphile/build/postgraphile/http/frameworks.js" />
/// <reference types="got/dist/source/core/utils/timed-out.js" />
import 'json-bigint-patch';
import { Server } from 'http';
import { MeshInstance, ServeMeshOptions } from '@graphql-mesh/runtime';
import { GraphQLMeshCLIParams } from '../../index.js';
import type { Logger } from '@graphql-mesh/types';
export declare function serveMesh({ baseDir, argsPort, getBuiltMesh, logger, rawServeConfig, playgroundTitle, }: ServeMeshOptions, cliParams: GraphQLMeshCLIParams): Promise<{
    mesh: MeshInstance;
    httpServer: Server<typeof import("http").IncomingMessage, typeof import("http").ServerResponse>;
    logger: Logger;
}>;
