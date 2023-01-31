"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const http_1 = __importDefault(require("http"));
const net_1 = __importDefault(require("net"));
const path_1 = __importDefault(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const docker_compose_1 = __importDefault(require("docker-compose"));
const strip_ansi_1 = __importDefault(require("strip-ansi"));
const tmp_promise_1 = __importDefault(require("tmp-promise"));
const gluegun_1 = require("../command-helpers/gluegun");
const spinner_1 = require("../command-helpers/spinner");
// Clean up temporary files even when an uncaught exception occurs
tmp_promise_1.default.setGracefulCleanup();
const HELP = `
${chalk_1.default.bold('graph local')} [options] ${chalk_1.default.bold('<local-command>')}

Options:

  -h, --help                    Show usage information
      --node-logs               Print the Graph Node logs (optional)
      --ethereum-logs           Print the Ethereum logs (optional)
      --compose-file <file>     Custom Docker Compose file for additional services (optional)
      --node-image <image>      Custom Graph Node image to test against (default: graphprotocol/graph-node:latest)
      --standalone-node <cmd>   Use a standalone Graph Node outside Docker Compose (optional)
      --standalone-node-args    Custom arguments to be passed to the standalone Graph Node (optional)
      --skip-wait-for-ipfs      Don't wait for IPFS to be up at localhost:15001 (optional)
      --skip-wait-for-ethereum  Don't wait for Ethereum to be up at localhost:18545 (optional)
      --skip-wait-for-postgres  Don't wait for Postgres to be up at localhost:15432 (optional)
      --timeout                 Time to wait for service containers. (optional, defaults to 120000 milliseconds)
`;
exports.default = {
    description: 'Runs local tests against a Graph Node environment (using Ganache by default)',
    run: async (toolbox) => {
        // Obtain tools
        const { filesystem, print } = toolbox;
        // Parse CLI parameters
        let { composeFile, ethereumLogs, h, help, nodeImage, nodeLogs, skipWaitForEthereum, skipWaitForIpfs, skipWaitForPostgres, standaloneNode, standaloneNodeArgs, timeout, } = toolbox.parameters.options;
        // Support both short and long option variants
        help || (help = h);
        // Extract test command
        const params = (0, gluegun_1.fixParameters)(toolbox.parameters, {
            ethereumLogs,
            h,
            help,
            nodeLogs,
            skipWaitForEthereum,
            skipWaitForIpfs,
            skipWaitForPostgres,
        });
        // Show help text if requested
        if (help) {
            print.info(HELP);
            return;
        }
        if (params.length == 0) {
            print.error(`Test command not provided as the last argument`);
            process.exitCode = 1;
            return;
        }
        const testCommand = params[0];
        // Obtain the Docker Compose file for services that the tests run against
        composeFile || (composeFile = path_1.default.join(__dirname, '..', '..', 'resources', 'test', standaloneNode ? 'docker-compose-standalone-node.yml' : 'docker-compose.yml'));
        // parse timeout. Defaults to 120 seconds
        timeout = Math.abs(parseInt(timeout)) || 120000;
        if (!filesystem.exists(composeFile)) {
            print.error(`Docker Compose file \`${composeFile}\` not found`);
            process.exitCode = 1;
            return;
        }
        // Create temporary directory to operate in
        const { path: tempdir } = await tmp_promise_1.default.dir({ prefix: 'graph-test', unsafeCleanup: true });
        try {
            await configureTestEnvironment(toolbox, tempdir, composeFile, nodeImage);
        }
        catch (e) {
            process.exitCode = 1;
            return;
        }
        // Bring up test environment
        try {
            await startTestEnvironment(tempdir);
        }
        catch (e) {
            print.error(e);
            process.exitCode = 1;
            return;
        }
        // Wait for test environment to come up
        try {
            await waitForTestEnvironment({
                skipWaitForEthereum,
                skipWaitForIpfs,
                skipWaitForPostgres,
                timeout,
            });
        }
        catch (e) {
            await stopTestEnvironment(tempdir);
            process.exitCode = 1;
            return;
        }
        // Bring up Graph Node separately, if a standalone node is used
        let nodeProcess;
        const nodeOutputChunks = [];
        if (standaloneNode) {
            try {
                nodeProcess = await startGraphNode(standaloneNode, standaloneNodeArgs, nodeOutputChunks);
            }
            catch (e) {
                toolbox.print.error('');
                toolbox.print.error('  Graph Node');
                toolbox.print.error('  ----------');
                toolbox.print.error(indent('  ', Buffer.concat(nodeOutputChunks).toString('utf-8')));
                toolbox.print.error('');
                await stopTestEnvironment(tempdir);
                process.exitCode = 1;
                return;
            }
        }
        // Wait for Graph Node to come up
        try {
            await waitForGraphNode(timeout);
        }
        catch (e) {
            toolbox.print.error('');
            toolbox.print.error('  Graph Node');
            toolbox.print.error('  ----------');
            toolbox.print.error(indent('  ', await collectGraphNodeLogs(tempdir, standaloneNode, nodeOutputChunks)));
            toolbox.print.error('');
            await stopTestEnvironment(tempdir);
            process.exitCode = 1;
            return;
        }
        // Run tests
        const result = await runTests(testCommand);
        // Bring down Graph Node, if a standalone node is used
        if (nodeProcess) {
            try {
                await stopGraphNode(nodeProcess);
            }
            catch (e) {
                // do nothing (the spinner already logs the problem)
            }
        }
        if (result.exitCode == 0) {
            toolbox.print.success('✔ Tests passed');
        }
        else {
            toolbox.print.error('✖ Tests failed');
        }
        // Capture logs
        nodeLogs =
            nodeLogs || result.exitCode !== 0
                ? await collectGraphNodeLogs(tempdir, standaloneNode, nodeOutputChunks)
                : undefined;
        ethereumLogs = ethereumLogs ? await collectEthereumLogs(tempdir) : undefined;
        // Bring down the test environment
        try {
            await stopTestEnvironment(tempdir);
        }
        catch (e) {
            // do nothing (the spinner already logs the problem)
        }
        if (nodeLogs) {
            toolbox.print.info('');
            toolbox.print.info('  Graph node');
            toolbox.print.info('  ----------');
            toolbox.print.info('');
            toolbox.print.info(indent('  ', nodeLogs));
        }
        if (ethereumLogs) {
            toolbox.print.info('');
            toolbox.print.info('  Ethereum');
            toolbox.print.info('  --------');
            toolbox.print.info('');
            toolbox.print.info(indent('  ', ethereumLogs));
        }
        // Always print the test output
        toolbox.print.info('');
        toolbox.print.info('  Output');
        toolbox.print.info('  ------');
        toolbox.print.info('');
        toolbox.print.info(indent('  ', result.output));
        // Propagate the exit code from the test run
        process.exitCode = result.exitCode;
    },
};
/**
 * Indents all lines of a string
 */
const indent = (indentation, str) => str
    .split('\n')
    .map(s => `${indentation}${s}`)
    // Remove whitespace from empty lines
    .map(s => s.replace(/^\s+$/g, ''))
    .join('\n');
const configureTestEnvironment = async (toolbox, tempdir, composeFile, nodeImage) => await (0, spinner_1.withSpinner)(`Configure test environment`, `Failed to configure test environment`, `Warnings configuring test environment`, async () => {
    // Temporary compose file
    const tempComposeFile = path_1.default.join(tempdir, 'compose', 'docker-compose.yml');
    // Copy the compose file to the temporary directory
    toolbox.filesystem.copy(composeFile, tempComposeFile);
    // Substitute the graph-node image with the custom one, if appropriate
    if (nodeImage) {
        await toolbox.patching.replace(tempComposeFile, 'graphprotocol/graph-node:latest', nodeImage);
    }
});
const waitFor = async (timeout, testFn) => {
    const deadline = Date.now() + timeout;
    let error = undefined;
    return new Promise((resolve, reject) => {
        const check = async () => {
            if (Date.now() > deadline) {
                reject(error);
            }
            else {
                try {
                    const result = await testFn();
                    resolve(result);
                }
                catch (e) {
                    error = e;
                    setTimeout(check, 500);
                }
            }
        };
        setTimeout(check, 0);
    });
};
const startTestEnvironment = async (tempdir) => await (0, spinner_1.withSpinner)(`Start test environment`, `Failed to start test environment`, `Warnings starting test environment`, async (_spinner) => {
    // Bring up the test environment
    await docker_compose_1.default.upAll({
        cwd: path_1.default.join(tempdir, 'compose'),
    });
});
const waitForTestEnvironment = async ({ skipWaitForEthereum, skipWaitForIpfs, skipWaitForPostgres, timeout, }) => await (0, spinner_1.withSpinner)(`Wait for test environment`, `Failed to wait for test environment`, `Warnings waiting for test environment`, async (spinner) => {
    // Wait 10s for IPFS (if desired)
    if (skipWaitForIpfs) {
        (0, spinner_1.step)(spinner, 'Skip waiting for IPFS');
    }
    else {
        await waitFor(timeout, async () => new Promise((resolve, reject) => {
            http_1.default
                .get('http://localhost:15001/api/v0/version', () => {
                resolve();
            })
                .on('error', e => {
                reject(new Error(`Could not connect to IPFS: ${e}`));
            });
        }));
        (0, spinner_1.step)(spinner, 'IPFS is up');
    }
    // Wait 10s for Ethereum (if desired)
    if (skipWaitForEthereum) {
        (0, spinner_1.step)(spinner, 'Skip waiting for Ethereum');
    }
    else {
        await waitFor(timeout, async () => new Promise((resolve, reject) => {
            http_1.default
                .get('http://localhost:18545', () => {
                resolve();
            })
                .on('error', e => {
                reject(new Error(`Could not connect to Ethereum: ${e}`));
            });
        }));
        (0, spinner_1.step)(spinner, 'Ethereum is up');
    }
    // Wait 10s for Postgres (if desired)
    if (skipWaitForPostgres) {
        (0, spinner_1.step)(spinner, 'Skip waiting for Postgres');
    }
    else {
        await waitFor(timeout, async () => new Promise((resolve, reject) => {
            try {
                const socket = net_1.default.connect(15432, 'localhost', () => resolve());
                socket.on('error', e => reject(new Error(`Could not connect to Postgres: ${e}`)));
                socket.end();
            }
            catch (e) {
                reject(new Error(`Could not connect to Postgres: ${e}`));
            }
        }));
        (0, spinner_1.step)(spinner, 'Postgres is up');
    }
});
const stopTestEnvironment = async (tempdir) => await (0, spinner_1.withSpinner)(`Stop test environment`, `Failed to stop test environment`, `Warnings stopping test environment`, async () => {
    // Our containers do not respond quickly to the SIGTERM which `down` tries before timing out
    // and killing them, so speed things up by sending a SIGKILL right away.
    try {
        await docker_compose_1.default.kill({ cwd: path_1.default.join(tempdir, 'compose') });
    }
    catch (e) {
        // Do nothing, we will just try to run 'down'
        // to bring down the environment
    }
    await docker_compose_1.default.down({ cwd: path_1.default.join(tempdir, 'compose') });
});
const startGraphNode = async (standaloneNode, standaloneNodeArgs, nodeOutputChunks) => await (0, spinner_1.withSpinner)(`Start Graph node`, `Failed to start Graph node`, `Warnings starting Graph node`, async (spinner) => {
    const defaultArgs = [
        '--ipfs',
        'localhost:15001',
        '--postgres-url',
        'postgresql://graph:let-me-in@localhost:15432/graph',
        '--ethereum-rpc',
        'test:http://localhost:18545',
        '--http-port',
        '18000',
        '--ws-port',
        '18001',
        '--admin-port',
        '18020',
        '--index-node-port',
        '18030',
        '--metrics-port',
        '18040',
    ];
    const defaultEnv = {
        GRAPH_LOG: 'debug',
        GRAPH_MAX_API_VERSION: '0.0.5',
    };
    const args = standaloneNodeArgs ? standaloneNodeArgs.split(' ') : defaultArgs;
    const env = { ...defaultEnv, ...process.env };
    const nodeProcess = (0, child_process_1.spawn)(standaloneNode, args, {
        cwd: process.cwd(),
        env,
    });
    (0, spinner_1.step)(spinner, 'Graph node:', String(nodeProcess.spawnargs.join(' ')));
    nodeProcess.stdout.on('data', data => nodeOutputChunks.push(Buffer.from(data)));
    nodeProcess.stderr.on('data', data => nodeOutputChunks.push(Buffer.from(data)));
    nodeProcess.on('error', e => {
        nodeOutputChunks.push(Buffer.from(String(e), 'utf-8'));
    });
    // Return the node child process
    return nodeProcess;
});
const waitForGraphNode = async (timeout) => await (0, spinner_1.withSpinner)(`Wait for Graph node`, `Failed to wait for Graph node`, `Warnings waiting for Graph node`, async () => {
    await waitFor(timeout, async () => new Promise((resolve, reject) => {
        http_1.default
            .get('http://localhost:18000', { timeout }, () => resolve())
            .on('error', e => reject(e));
    }));
});
const stopGraphNode = async (nodeProcess) => await (0, spinner_1.withSpinner)(`Stop Graph node`, `Failed to stop Graph node`, `Warnings stopping Graph node`, async () => {
    nodeProcess.kill(9);
});
const collectGraphNodeLogs = async (tempdir, standaloneNode, nodeOutputChunks) => {
    if (standaloneNode) {
        // Pull the logs from the captured output
        return (0, strip_ansi_1.default)(Buffer.concat(nodeOutputChunks).toString('utf-8'));
    }
    // Pull the logs from docker compose
    const logs = await docker_compose_1.default.logs('graph-node', {
        follow: false,
        cwd: path_1.default.join(tempdir, 'compose'),
    });
    return (0, strip_ansi_1.default)(logs.out.trim()).replace(/graph-node_1 {2}\| /g, '');
};
const collectEthereumLogs = async (tempdir) => {
    const logs = await docker_compose_1.default.logs('ethereum', {
        follow: false,
        cwd: path_1.default.join(tempdir, 'compose'),
    });
    return (0, strip_ansi_1.default)(logs.out.trim()).replace(/ethereum_1 {2}\| /g, '');
};
const runTests = async (testCommand) => await (0, spinner_1.withSpinner)(`Run tests`, `Failed to run tests`, `Warnings running tests`, async () => new Promise(resolve => {
    const output = [];
    const testProcess = (0, child_process_1.spawn)(String(testCommand), { shell: true });
    testProcess.stdout.on('data', data => output.push(Buffer.from(data)));
    testProcess.stderr.on('data', data => output.push(Buffer.from(data)));
    testProcess.on('close', code => {
        resolve({
            exitCode: code,
            output: Buffer.concat(output).toString('utf-8'),
        });
    });
}));
