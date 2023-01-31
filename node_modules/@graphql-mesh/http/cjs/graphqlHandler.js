"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.graphqlHandler = void 0;
const graphql_yoga_1 = require("graphql-yoga");
const graphqlHandler = (getBuiltMesh, playgroundTitle, playgroundEnabled, graphqlEndpoint, corsConfig) => {
    let yoga$;
    return (request, ...args) => {
        if (!yoga$) {
            yoga$ = getBuiltMesh().then(mesh => (0, graphql_yoga_1.createYoga)({
                parserCache: false,
                validationCache: false,
                plugins: [
                    ...mesh.plugins,
                    (0, graphql_yoga_1.useLogger)({
                        skipIntrospection: true,
                        logFn: (eventName, { args }) => {
                            if (eventName.endsWith('-start')) {
                                mesh.logger.debug(`\t headers: `, args.contextValue.headers);
                            }
                        },
                    }),
                ],
                logging: mesh.logger,
                maskedErrors: false,
                graphiql: playgroundEnabled && {
                    title: playgroundTitle,
                },
                cors: corsConfig,
                graphqlEndpoint,
                landingPage: false,
            }));
        }
        return yoga$.then(yoga => yoga(request, ...args));
    };
};
exports.graphqlHandler = graphqlHandler;
