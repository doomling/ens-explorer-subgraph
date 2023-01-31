"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadAbiFromBlockScout = exports.loadAbiFromEtherscan = void 0;
const immutable_1 = __importDefault(require("immutable"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const spinner_1 = require("./spinner");
const loadAbiFromEtherscan = async (ABICtor, network, address) => await (0, spinner_1.withSpinner)(`Fetching ABI from Etherscan`, `Failed to fetch ABI from Etherscan`, `Warnings while fetching ABI from Etherscan`, async () => {
    const scanApiUrl = getEtherscanLikeAPIUrl(network);
    const result = await (0, node_fetch_1.default)(`${scanApiUrl}?module=contract&action=getabi&address=${address}`);
    const json = await result.json();
    // Etherscan returns a JSON object that has a `status`, a `message` and
    // a `result` field. The `status` is '0' in case of errors and '1' in
    // case of success
    if (json.status === '1') {
        return new ABICtor('Contract', undefined, immutable_1.default.fromJS(JSON.parse(json.result)));
    }
    throw new Error('ABI not found, try loading it from a local file');
});
exports.loadAbiFromEtherscan = loadAbiFromEtherscan;
const loadAbiFromBlockScout = async (ABICtor, network, address) => await (0, spinner_1.withSpinner)(`Fetching ABI from BlockScout`, `Failed to fetch ABI from BlockScout`, `Warnings while fetching ABI from BlockScout`, async () => {
    const result = await (0, node_fetch_1.default)(`https://blockscout.com/${network.replace('-', '/')}/api?module=contract&action=getabi&address=${address}`);
    const json = await result.json();
    // BlockScout returns a JSON object that has a `status`, a `message` and
    // a `result` field. The `status` is '0' in case of errors and '1' in
    // case of success
    if (json.status === '1') {
        return new ABICtor('Contract', undefined, immutable_1.default.fromJS(JSON.parse(json.result)));
    }
    throw new Error('ABI not found, try loading it from a local file');
});
exports.loadAbiFromBlockScout = loadAbiFromBlockScout;
const getEtherscanLikeAPIUrl = (network) => {
    switch (network) {
        case 'mainnet':
            return `https://api.etherscan.io/api`;
        case 'arbitrum-one':
            return `https://api.arbiscan.io/api`;
        case 'bsc':
            return `https://api.bscscan.com/api`;
        case 'chapel':
            return `https://api-testnet.bscscan.com/api`;
        case 'matic':
            return `https://api.polygonscan.com/api`;
        case 'mumbai':
            return `https://api-testnet.polygonscan.com/api`;
        case 'aurora':
            return `https://api.aurorascan.dev/api`;
        case 'aurora-testnet':
            return `https://api-testnet.aurorascan.dev/api`;
        case 'optimism-kovan':
            return `https://api-kovan-optimistic.etherscan.io/api`;
        case 'optimism':
            return `https://api-optimistic.etherscan.io/api`;
        case 'moonbeam':
            return `https://api-moonbeam.moonscan.io/api`;
        case 'moonriver':
            return `https://api-moonriver.moonscan.io/api`;
        case 'mbase':
            return `https://api-moonbase.moonscan.io/api`;
        case 'avalanche':
            return `https://api.snowtrace.io/api`;
        case 'fuji':
            return `https://api-testnet.snowtrace.io/api`;
        case 'gnosis':
            return `https://api.gnosisscan.io/api`;
        case 'fantom':
            return `https://api.ftmscan.com/api`;
        case 'fantom-testnet':
            return `https://api-testnet.ftmscan.com/api`;
        default:
            return `https://api-${network}.etherscan.io/api`;
    }
};
