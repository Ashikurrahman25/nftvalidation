"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// nftEndpoint.ts
const express_1 = __importDefault(require("express"));
const near_api_js_1 = require("near-api-js");
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// CORS configuration
app.use((0, cors_1.default)({
    origin: 'http://localhost:8080',
    credentials: true
}));
// Middleware to parse JSON payloads
app.use(express_1.default.json());
// Dynamic network configuration based on environment variable
const NETWORK = process.env.NEAR_NETWORK || 'testnet';
const getNetworkConfig = () => {
    if (NETWORK === 'mainnet') {
        return {
            networkId: 'mainnet',
            nodeUrl: 'https://rpc.mainnet.near.org',
            walletUrl: 'https://wallet.near.org',
            helperUrl: 'https://helper.mainnet.near.org',
            explorerUrl: 'https://explorer.near.org',
            keyStore: new near_api_js_1.keyStores.InMemoryKeyStore(),
        };
    }
    else {
        return {
            networkId: 'testnet',
            nodeUrl: 'https://rpc.testnet.near.org',
            walletUrl: 'https://wallet.testnet.near.org',
            helperUrl: 'https://helper.testnet.near.org',
            explorerUrl: 'https://explorer.testnet.near.org',
            keyStore: new near_api_js_1.keyStores.InMemoryKeyStore(),
        };
    }
};
const nearConfig = getNetworkConfig();
console.log(`🌐 Using NEAR ${NETWORK.toUpperCase()} network`);
// List of known NFT contracts (you can expand this)
const knownNFTContracts = [
    'sharddoggies.testnet',
    'dev-1675486904766-77262865372547'
];
app.get('/nfts/:accountId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { accountId } = req.params;
    try {
        const near = yield (0, near_api_js_1.connect)(nearConfig);
        const account = yield near.account(accountId);
        const allNFTs = [];
        for (const contractId of knownNFTContracts) {
            try {
                const tokens = yield account.viewFunction({
                    contractId,
                    methodName: 'nft_tokens_for_owner',
                    args: { account_id: accountId, from_index: '0', limit: 50 },
                });
                allNFTs.push(...tokens.map(token => (Object.assign(Object.assign({}, token), { contract: contractId }))));
            }
            catch (err) {
                console.warn(`Failed to fetch from ${contractId}:`, err.message);
            }
        }
        res.json(allNFTs);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
// Endpoint to get NFTs with custom contract list
app.post('/nfts/fetch', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { walletId, contracts } = req.body;
    if (!walletId || !contracts || !Array.isArray(contracts)) {
        return res.status(400).json({
            error: 'walletId and contracts array are required'
        });
    }
    try {
        const near = yield (0, near_api_js_1.connect)(nearConfig);
        const account = yield near.account(walletId);
        const allNFTs = [];
        for (const contractId of contracts) {
            try {
                const tokens = yield account.viewFunction({
                    contractId,
                    methodName: 'nft_tokens_for_owner',
                    args: { account_id: walletId, from_index: '0', limit: 50 },
                });
                allNFTs.push(...tokens.map(token => (Object.assign(Object.assign({}, token), { contract: contractId }))));
            }
            catch (err) {
                console.warn(`Failed to fetch from ${contractId}:`, err.message);
            }
        }
        res.json({
            walletId,
            nfts: allNFTs,
            totalCount: allNFTs.length
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
// Endpoint to check if wallet has NFTs from any of the specified contracts
app.post('/nfts/check-status', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { walletId, contracts } = req.body;
    if (!walletId || !contracts || !Array.isArray(contracts)) {
        return res.status(400).json({
            error: 'walletId and contracts array are required'
        });
    }
    try {
        const near = yield (0, near_api_js_1.connect)(nearConfig);
        const account = yield near.account(walletId);
        let hasNFTs = false;
        const contractResults = [];
        for (const contractId of contracts) {
            try {
                const tokens = yield account.viewFunction({
                    contractId,
                    methodName: 'nft_tokens_for_owner',
                    args: { account_id: walletId, from_index: '0', limit: 1 },
                });
                const hasTokensInContract = tokens.length > 0;
                contractResults.push({
                    contract: contractId,
                    hasNFTs: hasTokensInContract,
                    count: tokens.length
                });
                if (hasTokensInContract) {
                    hasNFTs = true;
                }
            }
            catch (err) {
                console.warn(`Failed to check ${contractId}:`, err.message);
                contractResults.push({
                    contract: contractId,
                    hasNFTs: false,
                    error: err.message
                });
            }
        }
        res.json({
            walletId,
            hasNFTs,
            details: contractResults
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
app.listen(PORT, () => {
    console.log(`🚀 NFT API running at http://localhost:${PORT}`);
    console.log(`📡 Connected to NEAR ${NETWORK} network`);
});
