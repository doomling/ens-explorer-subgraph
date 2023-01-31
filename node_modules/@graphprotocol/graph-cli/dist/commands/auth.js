"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = __importDefault(require("chalk"));
const auth_1 = require("../command-helpers/auth");
const gluegun_1 = require("../command-helpers/gluegun");
const node_1 = require("../command-helpers/node");
const HELP = `
${chalk_1.default.bold('graph auth')} [options] ${chalk_1.default.bold('<node>')} ${chalk_1.default.bold('<deploy-key>')}

${chalk_1.default.dim('Options:')}

      --product <subgraph-studio|hosted-service>
                                Selects the product for which to authenticate
      --studio                  Shortcut for --product subgraph-studio
  -h, --help                    Show usage information
`;
const processForm = async (toolbox, { product, studio, node, deployKey }) => {
    const questions = [
        {
            type: 'select',
            name: 'product',
            message: 'Product for which to initialize',
            choices: ['subgraph-studio', 'hosted-service'],
            skip: product === 'subgraph-studio' ||
                product === 'hosted-service' ||
                studio !== undefined ||
                node !== undefined,
        },
        {
            type: 'password',
            name: 'deployKey',
            message: 'Deploy key',
            skip: deployKey !== undefined,
        },
    ];
    try {
        const answers = await toolbox.prompt.ask(questions);
        return answers;
    }
    catch (e) {
        return undefined;
    }
};
exports.default = {
    description: 'Sets the deploy key to use when deploying to a Graph node',
    run: async (toolbox) => {
        // Obtain tools
        const { print } = toolbox;
        // Read CLI parameters
        const { product, studio, h, help } = toolbox.parameters.options;
        // Show help text if requested
        if (help || h) {
            print.info(HELP);
            return;
        }
        let firstParam, secondParam;
        try {
            [firstParam, secondParam] = (0, gluegun_1.fixParameters)(toolbox.parameters, {
                h,
                help,
                studio,
            });
        }
        catch (e) {
            print.error(e.message);
            process.exitCode = 1;
            return;
        }
        // if user specifies --product or --studio then deployKey is the first parameter
        let node;
        let deployKey;
        if (product || studio) {
            ({ node } = (0, node_1.chooseNodeUrl)({ product, studio, node }));
            deployKey = firstParam;
        }
        else {
            node = firstParam;
            deployKey = secondParam;
        }
        if (!node || !deployKey) {
            const inputs = await processForm(toolbox, {
                product,
                studio,
                node,
                deployKey,
            });
            if (inputs === undefined) {
                process.exit(1);
            }
            if (!node) {
                ({ node } = (0, node_1.chooseNodeUrl)({
                    product: inputs.product,
                    studio,
                    node,
                }));
            }
            deployKey || (deployKey = inputs.deployKey);
        }
        if (!deployKey) {
            print.error(`No deploy key provided`);
            print.info(HELP);
            process.exitCode = 1;
            return;
        }
        if (deployKey.length > 200) {
            print.error(`Deploy key must not exceed 200 characters`);
            process.exitCode = 1;
            return;
        }
        try {
            await (0, auth_1.saveDeployKey)(node, deployKey);
            print.success(`Deploy key set for ${node}`);
        }
        catch (e) {
            print.error(e);
            process.exitCode = 1;
        }
    },
};
