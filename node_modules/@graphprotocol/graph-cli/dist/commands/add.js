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
const chalk_1 = __importDefault(require("chalk"));
const immutable_1 = __importDefault(require("immutable"));
const abi_1 = require("../command-helpers/abi");
const DataSourcesExtractor = __importStar(require("../command-helpers/data-sources"));
const gluegun_1 = require("../command-helpers/gluegun");
const network_1 = require("../command-helpers/network");
const scaffold_1 = require("../command-helpers/scaffold");
const spinner_1 = require("../command-helpers/spinner");
const protocols_1 = __importDefault(require("../protocols"));
const abi_2 = __importDefault(require("../protocols/ethereum/abi"));
const subgraph_1 = __importDefault(require("../subgraph"));
const HELP = `
${chalk_1.default.bold('graph add')} <address> [<subgraph-manifest default: "./subgraph.yaml">]

${chalk_1.default.dim('Options:')}

      --abi <path>              Path to the contract ABI (default: download from Etherscan)
      --contract-name           Name of the contract (default: Contract)
      --merge-entities          Whether to merge entities with the same name (default: false)
      --network-file <path>     Networks config file path (default: "./networks.json")
  -h, --help                    Show usage information
`;
exports.default = {
    description: 'Adds a new datasource to a subgraph',
    run: async (toolbox) => {
        // Obtain tools
        const { print, system } = toolbox;
        // Read CLI parameters
        let { abi, contractName, h, help, mergeEntities, networkFile } = toolbox.parameters.options;
        contractName || (contractName = 'Contract');
        try {
            (0, gluegun_1.fixParameters)(toolbox.parameters, {
                h,
                help,
                mergeEntities,
            });
        }
        catch (e) {
            print.error(e.message);
            process.exitCode = 1;
            return;
        }
        const address = toolbox.parameters.first || toolbox.parameters.array?.[0];
        const manifestPath = toolbox.parameters.second || toolbox.parameters.array?.[1] || './subgraph.yaml';
        // Show help text if requested
        if (help || h) {
            print.info(HELP);
            return;
        }
        // Validate the address
        if (!address) {
            print.error('No contract address provided');
            process.exitCode = 1;
            return;
        }
        const dataSourcesAndTemplates = await DataSourcesExtractor.fromFilePath(manifestPath);
        const protocol = protocols_1.default.fromDataSources(dataSourcesAndTemplates);
        const manifest = await subgraph_1.default.load(manifestPath, { protocol });
        const network = manifest.result.getIn(['dataSources', 0, 'network']);
        const result = manifest.result.asMutable();
        const entities = getEntities(manifest);
        const contractNames = getContractNames(manifest);
        if (contractNames.includes(contractName)) {
            print.error(`Datasource or template with name ${contractName} already exists, please choose a different name`);
            process.exitCode = 1;
            return;
        }
        let ethabi = null;
        if (abi) {
            ethabi = abi_2.default.load(contractName, abi);
        }
        else if (network === 'poa-core') {
            ethabi = await (0, abi_1.loadAbiFromBlockScout)(abi_2.default, network, address);
        }
        else {
            ethabi = await (0, abi_1.loadAbiFromEtherscan)(abi_2.default, network, address);
        }
        const { collisionEntities, onlyCollisions, abiData } = updateEventNamesOnCollision(toolbox, ethabi, entities, contractName, mergeEntities);
        ethabi.data = abiData;
        await (0, scaffold_1.writeABI)(ethabi, contractName);
        await (0, scaffold_1.writeSchema)(ethabi, protocol, result.getIn(['schema', 'file']), collisionEntities);
        await (0, scaffold_1.writeMapping)(ethabi, protocol, contractName, collisionEntities);
        await (0, scaffold_1.writeTestsFiles)(ethabi, protocol, contractName);
        const dataSources = result.get('dataSources');
        const dataSource = await (0, scaffold_1.generateDataSource)(protocol, contractName, network, address, ethabi);
        // Handle the collisions edge case by copying another data source yaml data
        if (mergeEntities && onlyCollisions) {
            const firstDataSource = dataSources.get(0);
            const source = dataSource.get('source');
            const mapping = firstDataSource.get('mapping').asMutable();
            // Save the address of the new data source
            source.abi = firstDataSource.get('source').get('abi');
            dataSource.set('mapping', mapping);
            dataSource.set('source', source);
        }
        result.set('dataSources', dataSources.push(dataSource));
        await subgraph_1.default.write(result, manifestPath);
        // Update networks.json
        const networksFile = networkFile || './networks.json';
        await (0, network_1.updateNetworksFile)(toolbox, network, contractName, address, networksFile);
        // Detect Yarn and/or NPM
        const yarn = system.which('yarn');
        const npm = system.which('npm');
        if (!yarn && !npm) {
            print.error(`Neither Yarn nor NPM were found on your system. Please install one of them.`);
            process.exitCode = 1;
            return;
        }
        await (0, spinner_1.withSpinner)('Running codegen', 'Failed to run codegen', 'Warning during codegen', async () => {
            await system.run(yarn ? 'yarn codegen' : 'npm run codegen');
        });
    },
};
const getEntities = (manifest) => {
    const dataSources = manifest.result.get('dataSources', immutable_1.default.List());
    const templates = manifest.result.get('templates', immutable_1.default.List());
    return dataSources
        .concat(templates)
        .map((dataSource) => dataSource.getIn(['mapping', 'entities']))
        .flatten();
};
const getContractNames = (manifest) => {
    const dataSources = manifest.result.get('dataSources', immutable_1.default.List());
    const templates = manifest.result.get('templates', immutable_1.default.List());
    return dataSources.concat(templates).map((dataSource) => dataSource.get('name'));
};
const updateEventNamesOnCollision = (toolbox, ethabi, entities, contractName, mergeEntities) => {
    let abiData = ethabi.data;
    const { print } = toolbox;
    const collisionEntities = [];
    let onlyCollisions = true;
    for (let i = 0; i < abiData.size; i++) {
        const dataRow = abiData.get(i).asMutable();
        if (dataRow.get('type') === 'event') {
            if (entities.includes(dataRow.get('name'))) {
                if (entities.includes(`${contractName}${dataRow.get('name')}`)) {
                    print.error(`Contract name ('${contractName}')
            + event name ('${dataRow.get('name')}') entity already exists.`);
                    process.exitCode = 1;
                    break;
                }
                if (mergeEntities) {
                    collisionEntities.push(dataRow.get('name'));
                    abiData = abiData.asImmutable().delete(i); // needs to be immutable when deleting, yes you read that right - https://github.com/immutable-js/immutable-js/issues/1901
                    i--; // deletion also shifts values to the left
                    continue;
                }
                else {
                    dataRow.set('name', `${contractName}${dataRow.get('name')}`);
                }
            }
            else {
                onlyCollisions = false;
            }
        }
        abiData = abiData.asMutable().set(i, dataRow);
    }
    return { abiData, collisionEntities, onlyCollisions };
};
