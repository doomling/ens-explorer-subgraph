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
const compiler_1 = require("../command-helpers/compiler");
const DataSourcesExtractor = __importStar(require("../command-helpers/data-sources"));
const gluegun_1 = require("../command-helpers/gluegun");
const network_1 = require("../command-helpers/network");
const debug_1 = __importDefault(require("../debug"));
const protocols_1 = __importDefault(require("../protocols"));
const buildDebug = (0, debug_1.default)('graph-cli:build');
const HELP = `
${chalk_1.default.bold('graph build')} [options] ${chalk_1.default.bold('[<subgraph-manifest>]')}

Options:

  -h, --help                    Show usage information
  -i, --ipfs <node>             Upload build results to an IPFS node
  -o, --output-dir <path>       Output directory for build results (default: build/)
  -t, --output-format <format>  Output format for mappings (wasm, wast) (default: wasm)
      --skip-migrations         Skip subgraph migrations (default: false)
  -w, --watch                   Regenerate types when subgraph files change (default: false)
      --network <name>          Network configuration to use from the networks config file
      --network-file <path>     Networks config file path (default: "./networks.json")
`;
exports.default = {
    description: 'Builds a subgraph and (optionally) uploads it to IPFS',
    run: async (toolbox) => {
        // Obtain tools
        const { filesystem, print } = toolbox;
        // Parse CLI parameters
        let { i, h, help, ipfs, o, outputDir, outputFormat, skipMigrations, t, w, watch, network, networkFile, } = toolbox.parameters.options;
        // Support both short and long option variants
        help || (help = h);
        ipfs || (ipfs = i);
        outputDir || (outputDir = o);
        outputFormat || (outputFormat = t);
        watch || (watch = w);
        let manifest;
        try {
            [manifest] = (0, gluegun_1.fixParameters)(toolbox.parameters, {
                h,
                help,
                w,
                watch,
            });
        }
        catch (e) {
            print.error(e.message);
            process.exitCode = 1;
            return;
        }
        // Fall back to default values for options / parameters
        outputFormat = outputFormat && ['wasm', 'wast'].includes(outputFormat) ? outputFormat : 'wasm';
        outputDir = outputDir && outputDir !== '' ? outputDir : filesystem.path('build');
        manifest =
            manifest !== undefined && manifest !== '' ? manifest : filesystem.resolve('subgraph.yaml');
        networkFile =
            networkFile !== undefined && networkFile !== ''
                ? networkFile
                : filesystem.resolve('networks.json');
        // Show help text if requested
        if (help) {
            print.info(HELP);
            return;
        }
        let protocol;
        try {
            const dataSourcesAndTemplates = await DataSourcesExtractor.fromFilePath(manifest);
            protocol = protocols_1.default.fromDataSources(dataSourcesAndTemplates);
        }
        catch (e) {
            print.error(e.message);
            process.exitCode = 1;
            return;
        }
        buildDebug('Detected protocol "%s" (%o)', protocol.name, protocol);
        if (network && filesystem.exists(networkFile) !== 'file') {
            print.error(`Network file '${networkFile}' does not exists or is not a file!`);
            process.exitCode = 1;
            return;
        }
        if (network) {
            const identifierName = protocol.getContract().identifierName();
            await (0, network_1.updateSubgraphNetwork)(toolbox, manifest, network, networkFile, identifierName);
        }
        const compiler = (0, compiler_1.createCompiler)(manifest, {
            ipfs,
            outputDir,
            outputFormat,
            skipMigrations,
            protocol,
        });
        // Exit with an error code if the compiler couldn't be created
        if (!compiler) {
            process.exitCode = 1;
            return;
        }
        // Watch subgraph files for changes or additions, trigger
        // compile (if watch argument specified)
        if (watch) {
            await compiler.watchAndCompile();
        }
        else {
            const result = await compiler.compile();
            if (result === false) {
                process.exitCode = 1;
            }
        }
    },
};
