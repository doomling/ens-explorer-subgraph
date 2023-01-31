"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const graphCli = __importStar(require("../cli"));
const abi_1 = require("../command-helpers/abi");
const DataSourcesExtractor = __importStar(require("../command-helpers/data-sources"));
const gluegun_1 = require("../command-helpers/gluegun");
const network_1 = require("../command-helpers/network");
const node_1 = require("../command-helpers/node");
const scaffold_1 = require("../command-helpers/scaffold");
const spinner_1 = require("../command-helpers/spinner");
const studio_1 = require("../command-helpers/studio");
const subgraph_1 = require("../command-helpers/subgraph");
const debug_1 = __importDefault(require("../debug"));
const protocols_1 = __importDefault(require("../protocols"));
const schema_1 = require("../scaffold/schema");
const validation_1 = require("../validation");
const protocolChoices = Array.from(protocols_1.default.availableProtocols().keys());
const availableNetworks = protocols_1.default.availableNetworks();
const DEFAULT_EXAMPLE_SUBGRAPH = 'ethereum/gravatar';
const initDebug = (0, debug_1.default)('graph-cli:init');
const HELP = `
${chalk_1.default.bold('graph init')} [options] [subgraph-name] [directory]

${chalk_1.default.dim('Options:')}

      --protocol <${protocolChoices.join('|')}>
      --product <subgraph-studio|hosted-service>
                                 Selects the product for which to initialize
      --studio                   Shortcut for --product subgraph-studio
  -g, --node <node>              Graph node for which to initialize
      --allow-simple-name        Use a subgraph name without a prefix (default: false)
  -h, --help                     Show usage information

${chalk_1.default.dim('Choose mode with one of:')}

      --from-contract <contract> Creates a scaffold based on an existing contract
      --from-example [example]   Creates a scaffold based on an example subgraph

${chalk_1.default.dim('Options for --from-contract:')}

      --contract-name            Name of the contract (default: Contract)
      --index-events             Index contract events as entities

${chalk_1.default.dim.underline('Ethereum:')}

      --abi <path>               Path to the contract ABI (default: download from Etherscan)
      --network <${availableNetworks.get('ethereum').join('|')}>
                                 Selects the network the contract is deployed to

${chalk_1.default.dim.underline('NEAR:')}

      --network <${availableNetworks.get('near').join('|')}>
                                 Selects the network the contract is deployed to

${chalk_1.default.dim.underline('Cosmos:')}

      --network <${availableNetworks.get('cosmos').join('|')}>
                                 Selects the network the contract is deployed to
`;
const processInitForm = async (toolbox, { protocol, product, studio, node, abi, allowSimpleName, directory, contract, indexEvents, fromExample, network, subgraphName, contractName, }) => {
    let abiFromEtherscan = undefined;
    let abiFromFile = undefined;
    let protocolInstance;
    let ProtocolContract;
    let ABI;
    const questions = [
        {
            type: 'select',
            name: 'protocol',
            message: 'Protocol',
            choices: protocolChoices,
            skip: protocolChoices.includes(protocol),
            result: (value) => {
                protocol || (protocol = value);
                protocolInstance = new protocols_1.default(protocol);
                return protocol;
            },
        },
        {
            type: 'select',
            name: 'product',
            message: 'Product for which to initialize',
            choices: ['subgraph-studio', 'hosted-service'],
            skip: () => protocol === 'arweave' ||
                protocol === 'cosmos' ||
                protocol === 'near' ||
                product === 'subgraph-studio' ||
                product === 'hosted-service' ||
                studio !== undefined ||
                node !== undefined,
            result: (value) => {
                // For now we only support NEAR subgraphs in the Hosted Service
                if (protocol === 'near') {
                    // Can be overwritten because the question will be skipped (product === undefined)
                    product = 'hosted-service';
                    return product;
                }
                if (value == 'subgraph-studio') {
                    allowSimpleName = true;
                }
                product = value;
                return value;
            },
        },
        {
            type: 'input',
            name: 'subgraphName',
            message: () => (product == 'subgraph-studio' || studio ? 'Subgraph slug' : 'Subgraph name'),
            initial: subgraphName,
            validate: (name) => {
                try {
                    (0, subgraph_1.validateSubgraphName)(name, { allowSimpleName });
                    return true;
                }
                catch (e) {
                    return `${e.message}

  Examples:

    $ graph init ${os_1.default.userInfo().username}/${name}
    $ graph init ${name} --allow-simple-name`;
                }
            },
            result: (value) => {
                subgraphName = value;
                return value;
            },
        },
        {
            type: 'input',
            name: 'directory',
            message: 'Directory to create the subgraph in',
            initial: () => directory || (0, subgraph_1.getSubgraphBasename)(subgraphName),
            validate: (value) => toolbox.filesystem.exists(value || directory || (0, subgraph_1.getSubgraphBasename)(subgraphName))
                ? 'Directory already exists'
                : true,
        },
        {
            type: 'select',
            name: 'network',
            message: () => `${protocolInstance.displayName()} network`,
            choices: () => {
                initDebug('Generating list of available networks for protocol "%s" (%M)', protocol, availableNetworks.get(protocol));
                return (
                // @ts-expect-error TODO: wait what?
                availableNetworks
                    .get(protocol) // Get networks related to the chosen protocol.
                    // @ts-expect-error TODO: wait what?
                    .toArray()); // Needed because of gluegun. It can't even receive a JS iterable.
            },
            skip: fromExample !== undefined,
            initial: network || 'mainnet',
            result: (value) => {
                network = value;
                return value;
            },
        },
        // TODO:
        //
        // protocols that don't support contract
        // - arweave
        // - cosmos
        {
            type: 'input',
            name: 'contract',
            message: () => {
                ProtocolContract = protocolInstance.getContract();
                return `Contract ${ProtocolContract.identifierName()}`;
            },
            skip: () => fromExample !== undefined || !protocolInstance.hasContract(),
            initial: contract,
            validate: async (value) => {
                if (fromExample !== undefined || !protocolInstance.hasContract()) {
                    return true;
                }
                // Validate whether the contract is valid
                const { valid, error } = (0, validation_1.validateContract)(value, ProtocolContract);
                return valid ? true : error;
            },
            result: async (value) => {
                if (fromExample !== undefined) {
                    return value;
                }
                ABI = protocolInstance.getABI();
                // Try loading the ABI from Etherscan, if none was provided
                if (protocolInstance.hasABIs() && !abi) {
                    try {
                        if (network === 'poa-core') {
                            // TODO: this variable is never used anywhere, what happens?
                            // abiFromBlockScout = await loadAbiFromBlockScout(ABI, network, value)
                        }
                        else {
                            abiFromEtherscan = await (0, abi_1.loadAbiFromEtherscan)(ABI, network, value);
                        }
                    }
                    catch (e) {
                        // noop
                    }
                }
                return value;
            },
        },
        {
            type: 'input',
            name: 'abi',
            message: 'ABI file (path)',
            initial: abi,
            skip: () => !protocolInstance.hasABIs() || fromExample !== undefined || abiFromEtherscan !== undefined,
            validate: async (value) => {
                if (fromExample || abiFromEtherscan || !protocolInstance.hasABIs()) {
                    return true;
                }
                try {
                    abiFromFile = loadAbiFromFile(toolbox, ABI, value);
                    return true;
                }
                catch (e) {
                    return e.message;
                }
            },
        },
        {
            type: 'input',
            name: 'contractName',
            message: 'Contract Name',
            initial: contractName || 'Contract',
            skip: () => fromExample !== undefined || !protocolInstance.hasContract(),
            validate: (value) => value && value.length > 0,
            result: (value) => {
                contractName = value;
                return value;
            },
        },
        {
            type: 'confirm',
            name: 'indexEvents',
            message: 'Index contract events as entities',
            initial: true,
            skip: () => !!indexEvents,
            result: (value) => {
                indexEvents = value;
                return value;
            },
        },
    ];
    try {
        const answers = await toolbox.prompt.ask(
        // @ts-expect-error questions do somehow fit
        questions);
        return {
            ...answers,
            abi: (abiFromEtherscan || abiFromFile),
            protocolInstance,
        };
    }
    catch (e) {
        return undefined;
    }
};
const loadAbiFromFile = (toolbox, ABI, filename) => {
    const exists = toolbox.filesystem.exists(filename);
    if (!exists) {
        throw Error('File does not exist.');
    }
    else if (exists === 'dir') {
        throw Error('Path points to a directory, not a file.');
    }
    else if (exists === 'other') {
        throw Error('Not sure what this path points to.');
    }
    else {
        return ABI.load('Contract', filename);
    }
};
exports.default = {
    description: 'Creates a new subgraph with basic scaffolding',
    run: async (toolbox) => {
        // Obtain tools
        const { print, system } = toolbox;
        // Read CLI parameters
        let { protocol, product, studio, node, g, abi, allowSimpleName, fromContract, contractName, fromExample, h, help, indexEvents, network, } = toolbox.parameters.options;
        node || (node = g);
        ({ node, allowSimpleName } = (0, node_1.chooseNodeUrl)({
            product,
            studio,
            node,
            allowSimpleName,
        }));
        if (fromContract && fromExample) {
            print.error(`Only one of --from-example and --from-contract can be used at a time.`);
            process.exitCode = 1;
            return;
        }
        let subgraphName, directory;
        try {
            [subgraphName, directory] = (0, gluegun_1.fixParameters)(toolbox.parameters, {
                allowSimpleName,
                help,
                h,
                indexEvents,
                studio,
            });
        }
        catch (e) {
            print.error(e.message);
            process.exitCode = 1;
            return;
        }
        // Show help text if requested
        if (help || h) {
            print.info(HELP);
            return;
        }
        // Detect git
        const git = system.which('git');
        if (git === null) {
            print.error(`Git was not found on your system. Please install 'git' so it is in $PATH.`);
            process.exitCode = 1;
            return;
        }
        // Detect Yarn and/or NPM
        const yarn = system.which('yarn');
        const npm = system.which('npm');
        if (!yarn && !npm) {
            print.error(`Neither Yarn nor NPM were found on your system. Please install one of them.`);
            process.exitCode = 1;
            return;
        }
        const commands = {
            install: yarn ? 'yarn' : 'npm install',
            codegen: yarn ? 'yarn codegen' : 'npm run codegen',
            deploy: yarn ? 'yarn deploy' : 'npm run deploy',
        };
        // If all parameters are provided from the command-line,
        // go straight to creating the subgraph from the example
        if (fromExample && subgraphName && directory) {
            return await initSubgraphFromExample(toolbox, { fromExample, allowSimpleName, directory, subgraphName, studio, product }, { commands });
        }
        // If all parameters are provided from the command-line,
        // go straight to creating the subgraph from an existing contract
        if (fromContract && protocol && subgraphName && directory && network && node) {
            if (!protocolChoices.includes(protocol)) {
                print.error(`Protocol '${protocol}' is not supported, choose from these options: ${protocolChoices.join(', ')}`);
                process.exitCode = 1;
                return;
            }
            const protocolInstance = new protocols_1.default(protocol);
            if (protocolInstance.hasABIs()) {
                const ABI = protocolInstance.getABI();
                if (abi) {
                    try {
                        abi = loadAbiFromFile(toolbox, ABI, abi);
                    }
                    catch (e) {
                        print.error(`Failed to load ABI: ${e.message}`);
                        process.exitCode = 1;
                        return;
                    }
                }
                else {
                    try {
                        if (network === 'poa-core') {
                            abi = await (0, abi_1.loadAbiFromBlockScout)(ABI, network, fromContract);
                        }
                        else {
                            abi = await (0, abi_1.loadAbiFromEtherscan)(ABI, network, fromContract);
                        }
                    }
                    catch (e) {
                        process.exitCode = 1;
                        return;
                    }
                }
            }
            return await initSubgraphFromContract(toolbox, {
                protocolInstance,
                abi,
                allowSimpleName,
                directory,
                contract: fromContract,
                indexEvents,
                network,
                subgraphName,
                contractName,
                node,
                studio,
                product,
            }, { commands, addContract: false });
        }
        // Otherwise, take the user through the interactive form
        const inputs = await processInitForm(toolbox, {
            protocol,
            product,
            studio,
            node,
            abi,
            allowSimpleName,
            directory,
            contract: fromContract,
            indexEvents,
            fromExample,
            network,
            subgraphName,
            contractName,
        });
        // Exit immediately when the form is cancelled
        if (inputs === undefined) {
            process.exit(1);
        }
        print.info('———');
        if (fromExample) {
            await initSubgraphFromExample(toolbox, {
                fromExample,
                subgraphName: inputs.subgraphName,
                directory: inputs.directory,
                studio: inputs.studio,
                product: inputs.product,
            }, { commands });
        }
        else {
            ({ node, allowSimpleName } = (0, node_1.chooseNodeUrl)({
                product: inputs.product,
                studio,
                node,
                allowSimpleName,
            }));
            await initSubgraphFromContract(toolbox, {
                protocolInstance: inputs.protocolInstance,
                allowSimpleName,
                subgraphName: inputs.subgraphName,
                directory: inputs.directory,
                abi: inputs.abi,
                network: inputs.network,
                contract: inputs.contract,
                indexEvents: inputs.indexEvents,
                contractName: inputs.contractName,
                node,
                studio: inputs.studio,
                product: inputs.product,
            }, { commands, addContract: true });
        }
    },
};
const revalidateSubgraphName = async (toolbox, subgraphName, { allowSimpleName }) => {
    // Fail if the subgraph name is invalid
    try {
        (0, subgraph_1.validateSubgraphName)(subgraphName, { allowSimpleName });
        return true;
    }
    catch (e) {
        toolbox.print.error(`${e.message}

  Examples:

    $ graph init ${os_1.default.userInfo().username}/${subgraphName}
    $ graph init ${subgraphName} --allow-simple-name`);
        return false;
    }
};
const initRepository = async (toolbox, directory) => await (0, spinner_1.withSpinner)(`Initialize subgraph repository`, `Failed to initialize subgraph repository`, `Warnings while initializing subgraph repository`, async () => {
    // Remove .git dir in --from-example mode; in --from-contract, we're
    // starting from an empty directory
    const gitDir = path_1.default.join(directory, '.git');
    if (toolbox.filesystem.exists(gitDir)) {
        toolbox.filesystem.remove(gitDir);
    }
    await toolbox.system.run('git init', { cwd: directory });
    await toolbox.system.run('git add --all', { cwd: directory });
    await toolbox.system.run('git commit -m "Initial commit"', {
        cwd: directory,
    });
    return true;
});
// Only used for local testing / continuous integration.
//
// This requires that the command `npm link` is called
// on the root directory of this repository, as described here:
// https://docs.npmjs.com/cli/v7/commands/npm-link.
const npmLinkToLocalCli = async (toolbox, directory) => {
    if (process.env.GRAPH_CLI_TESTS) {
        await toolbox.system.run('npm link @graphprotocol/graph-cli', { cwd: directory });
    }
};
const installDependencies = async (toolbox, directory, installCommand) => await (0, spinner_1.withSpinner)(`Install dependencies with ${toolbox.print.colors.muted(installCommand)}`, `Failed to install dependencies`, `Warnings while installing dependencies`, async () => {
    // Links to local graph-cli if we're running the automated tests
    await npmLinkToLocalCli(toolbox, directory);
    await toolbox.system.run(installCommand, { cwd: directory });
    return true;
});
const runCodegen = async (toolbox, directory, codegenCommand) => await (0, spinner_1.withSpinner)(`Generate ABI and schema types with ${toolbox.print.colors.muted(codegenCommand)}`, `Failed to generate code from ABI and GraphQL schema`, `Warnings while generating code from ABI and GraphQL schema`, async () => {
    await toolbox.system.run(codegenCommand, { cwd: directory });
    return true;
});
const printNextSteps = (toolbox, { subgraphName, directory }, { commands, }) => {
    const { print } = toolbox;
    const relativeDir = path_1.default.relative(process.cwd(), directory);
    // Print instructions
    print.success(`
Subgraph ${print.colors.blue(subgraphName)} created in ${print.colors.blue(relativeDir)}
`);
    print.info(`Next steps:

  1. Run \`${print.colors.muted('graph auth')}\` to authenticate with your deploy key.

  2. Type \`${print.colors.muted(`cd ${relativeDir}`)}\` to enter the subgraph.

  3. Run \`${print.colors.muted(commands.deploy)}\` to deploy the subgraph.

Make sure to visit the documentation on https://thegraph.com/docs/ for further information.`);
};
const initSubgraphFromExample = async (toolbox, { fromExample, allowSimpleName, subgraphName, directory, studio, product, }, { commands, }) => {
    const { filesystem, print, system } = toolbox;
    // Fail if the subgraph name is invalid
    if (!revalidateSubgraphName(toolbox, subgraphName, { allowSimpleName: !!allowSimpleName })) {
        process.exitCode = 1;
        return;
    }
    // Fail if the output directory already exists
    if (filesystem.exists(directory)) {
        print.error(`Directory or file "${directory}" already exists`);
        process.exitCode = 1;
        return;
    }
    // Clone the example subgraph repository
    const cloned = await (0, spinner_1.withSpinner)(`Cloning example subgraph`, `Failed to clone example subgraph`, `Warnings while cloning example subgraph`, async () => {
        // Create a temporary directory
        const prefix = path_1.default.join(os_1.default.tmpdir(), 'example-subgraph-');
        const tmpDir = fs_1.default.mkdtempSync(prefix);
        try {
            await system.run(`git clone http://github.com/graphprotocol/example-subgraphs ${tmpDir}`);
            // If an example is not specified, use the default one
            if (fromExample === undefined || fromExample === true) {
                fromExample = DEFAULT_EXAMPLE_SUBGRAPH;
            }
            const exampleSubgraphPath = path_1.default.join(tmpDir, String(fromExample));
            if (!filesystem.exists(exampleSubgraphPath)) {
                return { result: false, error: `Example not found: ${fromExample}` };
            }
            filesystem.copy(exampleSubgraphPath, directory);
            return true;
        }
        finally {
            filesystem.remove(tmpDir);
        }
    });
    if (!cloned) {
        process.exitCode = 1;
        return;
    }
    try {
        // It doesn't matter if we changed the URL we clone the YAML,
        // we'll check it's network anyway. If it's a studio subgraph we're dealing with.
        const dataSourcesAndTemplates = await DataSourcesExtractor.fromFilePath(path_1.default.join(directory, 'subgraph.yaml'));
        for (const { network } of dataSourcesAndTemplates) {
            (0, studio_1.validateStudioNetwork)({ studio, product, network });
        }
    }
    catch (e) {
        print.error(e.message);
        process.exitCode = 1;
        return;
    }
    const networkConf = await (0, network_1.initNetworksConfig)(toolbox, directory, 'address');
    if (networkConf !== true) {
        process.exitCode = 1;
        return;
    }
    // Update package.json to match the subgraph name
    const prepared = await (0, spinner_1.withSpinner)(`Update subgraph name and commands in package.json`, `Failed to update subgraph name and commands in package.json`, `Warnings while updating subgraph name and commands in package.json`, async () => {
        try {
            // Load package.json
            const pkgJsonFilename = filesystem.path(directory, 'package.json');
            const pkgJson = await filesystem.read(pkgJsonFilename, 'json');
            pkgJson.name = (0, subgraph_1.getSubgraphBasename)(subgraphName);
            Object.keys(pkgJson.scripts).forEach(name => {
                pkgJson.scripts[name] = pkgJson.scripts[name].replace('example', subgraphName);
            });
            delete pkgJson['license'];
            delete pkgJson['repository'];
            // Remove example's cli in favor of the local one (added via `npm link`)
            if (process.env.GRAPH_CLI_TESTS) {
                delete pkgJson['devDependencies']['@graphprotocol/graph-cli'];
            }
            // Write package.json
            filesystem.write(pkgJsonFilename, pkgJson, { jsonIndent: 2 });
            return true;
        }
        catch (e) {
            print.error(`Failed to preconfigure the subgraph: ${e}`);
            filesystem.remove(directory);
            return false;
        }
    });
    if (!prepared) {
        process.exitCode = 1;
        return;
    }
    // Initialize a fresh Git repository
    const repo = await initRepository(toolbox, directory);
    if (repo !== true) {
        process.exitCode = 1;
        return;
    }
    // Install dependencies
    const installed = await installDependencies(toolbox, directory, commands.install);
    if (installed !== true) {
        process.exitCode = 1;
        return;
    }
    // Run code-generation
    const codegen = await runCodegen(toolbox, directory, commands.codegen);
    if (codegen !== true) {
        process.exitCode = 1;
        return;
    }
    printNextSteps(toolbox, { subgraphName, directory }, { commands });
};
const initSubgraphFromContract = async (toolbox, { protocolInstance, allowSimpleName, subgraphName, directory, abi, network, contract, indexEvents, contractName, node, studio, product, }, { commands, addContract, }) => {
    const { print } = toolbox;
    // Fail if the subgraph name is invalid
    if (!revalidateSubgraphName(toolbox, subgraphName, { allowSimpleName })) {
        process.exitCode = 1;
        return;
    }
    // Fail if the output directory already exists
    if (toolbox.filesystem.exists(directory)) {
        print.error(`Directory or file "${directory}" already exists`);
        process.exitCode = 1;
        return;
    }
    if (protocolInstance.hasABIs() &&
        ((0, schema_1.abiEvents)(abi).size === 0 ||
            // @ts-expect-error TODO: the abiEvents result is expected to be a List, how's it an array?
            (0, schema_1.abiEvents)(abi).length === 0)) {
        // Fail if the ABI does not contain any events
        print.error(`ABI does not contain any events`);
        process.exitCode = 1;
        return;
    }
    // We can validate this before the scaffold because we receive
    // the network from the form or via command line argument.
    // We don't need to read the manifest in this case.
    try {
        (0, studio_1.validateStudioNetwork)({ studio, product, network });
    }
    catch (e) {
        print.error(e.message);
        process.exitCode = 1;
        return;
    }
    // Scaffold subgraph
    const scaffold = await (0, spinner_1.withSpinner)(`Create subgraph scaffold`, `Failed to create subgraph scaffold`, `Warnings while creating subgraph scaffold`, async (spinner) => {
        const scaffold = await (0, scaffold_1.generateScaffold)({
            protocolInstance,
            subgraphName,
            abi,
            network,
            contract,
            indexEvents,
            contractName,
            node,
        }, spinner);
        await (0, scaffold_1.writeScaffold)(scaffold, directory, spinner);
        return true;
    });
    if (scaffold !== true) {
        process.exitCode = 1;
        return;
    }
    if (protocolInstance.hasContract()) {
        const identifierName = protocolInstance.getContract().identifierName();
        const networkConf = await (0, network_1.initNetworksConfig)(toolbox, directory, identifierName);
        if (networkConf !== true) {
            process.exitCode = 1;
            return;
        }
    }
    // Initialize a fresh Git repository
    const repo = await initRepository(toolbox, directory);
    if (repo !== true) {
        process.exitCode = 1;
        return;
    }
    // Install dependencies
    const installed = await installDependencies(toolbox, directory, commands.install);
    if (installed !== true) {
        process.exitCode = 1;
        return;
    }
    // Run code-generation
    const codegen = await runCodegen(toolbox, directory, commands.codegen);
    if (codegen !== true) {
        process.exitCode = 1;
        return;
    }
    while (addContract) {
        addContract = await addAnotherContract(toolbox, { protocolInstance, directory });
    }
    printNextSteps(toolbox, { subgraphName, directory }, { commands });
};
const addAnotherContract = async (toolbox, { protocolInstance, directory }) => {
    const addContractConfirmation = await toolbox.prompt.confirm('Add another contract?');
    if (addContractConfirmation) {
        let abiFromFile = false;
        const ProtocolContract = protocolInstance.getContract();
        const questions = [
            {
                type: 'input',
                name: 'contract',
                message: () => `Contract ${ProtocolContract.identifierName()}`,
                validate: async (value) => {
                    // Validate whether the contract is valid
                    const { valid, error } = (0, validation_1.validateContract)(value, ProtocolContract);
                    return valid ? true : error;
                },
            },
            {
                type: 'select',
                name: 'localAbi',
                message: 'Provide local ABI path?',
                choices: ['yes', 'no'],
                result: (value) => {
                    abiFromFile = value === 'yes' ? true : false;
                    return abiFromFile;
                },
            },
            {
                type: 'input',
                name: 'abi',
                message: 'ABI file (path)',
                skip: () => abiFromFile === false,
            },
            {
                type: 'input',
                name: 'contractName',
                message: 'Contract Name',
                initial: 'Contract',
                validate: (value) => value && value.length > 0,
            },
        ];
        // Get the cwd before process.chdir in order to switch back in the end of command execution
        const cwd = process.cwd();
        try {
            const { abi, contract, contractName } = await toolbox.prompt.ask(
            // @ts-expect-error questions do somehow fit
            questions);
            if (fs_1.default.existsSync(directory)) {
                process.chdir(directory);
            }
            const commandLine = ['add', contract, '--contract-name', contractName];
            if (abiFromFile) {
                if (abi.includes(directory)) {
                    commandLine.push('--abi', path_1.default.normalize(abi.replace(directory, '')));
                }
                else {
                    commandLine.push('--abi', abi);
                }
            }
            await graphCli.run(commandLine);
        }
        catch (e) {
            toolbox.print.error(e);
            process.exit(1);
        }
        finally {
            process.chdir(cwd);
        }
    }
    return addContractConfirmation;
};
