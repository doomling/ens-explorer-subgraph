import { MeshInstance } from '@graphql-mesh/runtime';
import { CORSOptions } from 'graphql-yoga';
export declare const graphqlHandler: (getBuiltMesh: () => Promise<MeshInstance>, playgroundTitle: string, playgroundEnabled: boolean, graphqlEndpoint: string, corsConfig: CORSOptions) => (request: Request, ...args: any[]) => Promise<Response>;
