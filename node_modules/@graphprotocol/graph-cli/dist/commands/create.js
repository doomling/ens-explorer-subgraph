"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const url_1 = require("url");
const chalk_1 = __importDefault(require("chalk"));
const auth_1 = require("../command-helpers/auth");
const jsonrpc_1 = require("../command-helpers/jsonrpc");
const node_1 = require("../command-helpers/node");
const HELP = `
${chalk_1.default.bold('graph create')} ${chalk_1.default.dim('[options]')} ${chalk_1.default.bold('<subgraph-name>')}

${chalk_1.default.dim('Options:')}

      --access-token <token>    Graph access token
  -h, --help                    Show usage information
  -g, --node <url>              Graph node to create the subgraph in
`;
exports.default = {
    description: 'Registers a subgraph name',
    run: async (toolbox) => {
        // Obtain tools
        const { print } = toolbox;
        // Read CLI parameters
        let { accessToken, g, h, help, node } = toolbox.parameters.options;
        const subgraphName = toolbox.parameters.first;
        // Support both long and short option variants
        node || (node = g);
        help || (help = h);
        // Show help text if requested
        if (help) {
            print.info(HELP);
            return;
        }
        // Validate the subgraph name
        if (!subgraphName) {
            print.error('No subgraph name provided');
            print.info(HELP);
            process.exitCode = 1;
            return;
        }
        // Validate node
        if (!node) {
            print.error(`No Graph node provided`);
            print.info(HELP);
            process.exitCode = 1;
            return;
        }
        try {
            (0, node_1.validateNodeUrl)(node);
        }
        catch (e) {
            print.error(`Graph node "${node}" is invalid: ${e.message}`);
            process.exitCode = 1;
            return;
        }
        const requestUrl = new url_1.URL(node);
        const client = (0, jsonrpc_1.createJsonRpcClient)(requestUrl);
        // Exit with an error code if the client couldn't be created
        if (!client) {
            process.exitCode = 1;
            return;
        }
        // Use the access token, if one is set
        accessToken = await (0, auth_1.identifyDeployKey)(node, accessToken);
        if (accessToken !== undefined && accessToken !== null) {
            // @ts-expect-error options property seems to exist
            client.options.headers = { Authorization: `Bearer ${accessToken}` };
        }
        const spinner = print.spin(`Creating subgraph in Graph node: ${requestUrl}`);
        client.request('subgraph_create', { name: subgraphName }, (
        // @ts-expect-error TODO: why are the arguments not typed?
        requestError, 
        // @ts-expect-error TODO: why are the arguments not typed?
        jsonRpcError, 
        // TODO: this argument is unused, but removing it fails the basic-event-handlers tests
        // @ts-expect-error TODO: why are the arguments not typed?
        _res) => {
            if (jsonRpcError) {
                spinner.fail(`Error creating the subgraph: ${jsonRpcError.message}`);
                process.exitCode = 1;
            }
            else if (requestError) {
                spinner.fail(`HTTP error creating the subgraph: ${requestError.code}`);
                process.exitCode = 1;
            }
            else {
                spinner.stop();
                print.success(`Created subgraph: ${subgraphName}`);
            }
        });
    },
};
