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
const path_1 = __importDefault(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const DataSourcesExtractor = __importStar(require("../command-helpers/data-sources"));
const gluegun_1 = require("../command-helpers/gluegun");
const version_1 = require("../command-helpers/version");
const debug_1 = __importDefault(require("../debug"));
const protocols_1 = __importDefault(require("../protocols"));
const type_generator_1 = __importDefault(require("../type-generator"));
const HELP = `
${chalk_1.default.bold('graph codegen')} [options] ${chalk_1.default.bold('[<subgraph-manifest>]')}
Options:
  -h, --help                    Show usage information
  -o, --output-dir <path>       Output directory for generated types (default: generated/)
  --skip-migrations         Skip subgraph migrations (default: false)
  -w, --watch                   Regenerate types when subgraph files change (default: false)
  -u, --uncrashable            Generate Float Subgraph Uncrashable helper file
  -uc, --uncrashable-config <path>  Directory for uncrashable config (default: ./uncrashable-config.yaml)
  `;
const codegenDebug = (0, debug_1.default)('graph-cli:codegen');
exports.default = {
    description: 'Generates AssemblyScript types for a subgraph',
    run: async (toolbox) => {
        // Obtain tools
        const { filesystem, print } = toolbox;
        // Read CLI parameters
        let { h, help, o, outputDir, skipMigrations, w, watch, u, uncrashable, uc, uncrashableConfig } = toolbox.parameters.options;
        // Support both long and short option variants
        help || (help = h);
        outputDir || (outputDir = o);
        watch || (watch = w);
        uncrashable || (uncrashable = u);
        let uncrashable_config = uncrashableConfig || uc;
        let manifest;
        try {
            [manifest] = (0, gluegun_1.fixParameters)(toolbox.parameters, {
                h,
                help,
                skipMigrations,
                w,
                watch,
                u,
                uncrashable,
            });
        }
        catch (e) {
            print.error(e.message);
            process.exitCode = 1;
            return;
        }
        codegenDebug('Initialized codegen manifest: %o', manifest);
        // Fall back to default values for options / parameters
        outputDir =
            outputDir !== undefined && outputDir !== '' ? outputDir : filesystem.path('generated');
        manifest =
            manifest !== undefined && manifest !== '' ? manifest : filesystem.resolve('subgraph.yaml');
        uncrashable_config =
            uncrashable_config !== undefined && uncrashable_config !== ''
                ? uncrashable_config
                : filesystem.resolve('uncrashable-config.yaml');
        // Show help text if requested
        if (help) {
            print.info(HELP);
            return;
        }
        let protocol;
        try {
            // Checks to make sure codegen doesn't run against
            // older subgraphs (both apiVersion and graph-ts version).
            //
            // We don't want codegen to run without these conditions
            // because that would mean the CLI would generate code to
            // the wrong AssemblyScript version.
            await (0, version_1.assertManifestApiVersion)(manifest, '0.0.5');
            await (0, version_1.assertGraphTsVersion)(path_1.default.dirname(manifest), '0.25.0');
            const dataSourcesAndTemplates = await DataSourcesExtractor.fromFilePath(manifest);
            protocol = protocols_1.default.fromDataSources(dataSourcesAndTemplates);
        }
        catch (e) {
            print.error(e.message);
            process.exitCode = 1;
            return;
        }
        const generator = new type_generator_1.default({
            subgraphManifest: manifest,
            outputDir,
            skipMigrations,
            protocol,
            uncrashable,
            uncrashableConfig: uncrashable_config,
        });
        // Watch working directory for file updates or additions, trigger
        // type generation (if watch argument specified)
        if (watch) {
            await generator.watchAndGenerateTypes();
        }
        else if (!(await generator.generateTypes())) {
            process.exitCode = 1;
        }
    },
};
