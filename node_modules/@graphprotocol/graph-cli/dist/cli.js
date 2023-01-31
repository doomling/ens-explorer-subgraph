"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = void 0;
const path_1 = __importDefault(require("path"));
const gluegun_1 = require("gluegun");
const run = async (argv) => {
    let builder = (0, gluegun_1.build)().brand('graph').src(__dirname);
    const pluginDirs = [];
    await Promise.all(['npm root -g', 'npm root', 'yarn global dir'].map(async (cmd) => {
        try {
            const dir = await gluegun_1.system.run(cmd, { trim: true });
            pluginDirs.push(dir);
        }
        catch (_) {
            // noop
        }
    }));
    // Inject potential plugin directories
    builder = pluginDirs.reduce((cli, dir) => cli.plugin(path_1.default.join(dir, '@graphprotocol', 'indexer-cli', 'dist')), builder);
    const cli = builder.help().version().defaultCommand().create();
    return await cli.run(argv);
};
exports.run = run;
