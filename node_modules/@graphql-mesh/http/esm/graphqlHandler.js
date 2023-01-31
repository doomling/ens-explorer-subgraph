import { createYoga, useLogger } from 'graphql-yoga';
export const graphqlHandler = (getBuiltMesh, playgroundTitle, playgroundEnabled, graphqlEndpoint, corsConfig) => {
    let yoga$;
    return (request, ...args) => {
        if (!yoga$) {
            yoga$ = getBuiltMesh().then(mesh => createYoga({
                parserCache: false,
                validationCache: false,
                plugins: [
                    ...mesh.plugins,
                    useLogger({
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
