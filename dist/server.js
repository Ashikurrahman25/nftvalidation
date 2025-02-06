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
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = 3000;
app.use((0, cors_1.default)({
    origin: ['https://spearonnear.github.io', 'https://game.spearonnear.com']
}));
const API_KEY = process.env.MB_API_KEY;
app.get('/nfts/:wallet', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const walletAddress = req.params.wallet;
    const query = `
  {
    mb_views_nft_tokens(
      where: {owner: {_eq: "${walletAddress}"}}
    ) {
      nft_contract_id
      token_id
      metadata_id
      title
      description
      media
    }
  }
  `;
    try {
        const response = yield axios_1.default.post('https://graph.mintbase.xyz/mainnet', {
            query,
        }, {
            headers: {
                'Content-Type': 'application/json',
                'mb-api-key': API_KEY,
            },
        });
        const tokens = response.data.data.mb_views_nft_tokens;
        // Aggregate NFTs by contract ID
        const aggregatedTokens = {};
        tokens.forEach(token => {
            if (!aggregatedTokens[token.nft_contract_id]) {
                aggregatedTokens[token.nft_contract_id] = {
                    contract: token.nft_contract_id,
                    quantity: 0,
                    nft_meta: {
                        name: token.title,
                        symbol: "SymbolPlaceholder", // Replace with actual symbol if available
                        icon: token.media,
                        reference: `https://arweave.net/${token.metadata_id}`
                    }
                };
            }
            aggregatedTokens[token.nft_contract_id].quantity++;
        });
        // Convert aggregatedTokens object to an array
        const formattedTokens = Object.values(aggregatedTokens);
        res.json(formattedTokens);
    }
    catch (error) {
        console.error('Error fetching NFTs:', error);
        res.status(500).send('Error fetching NFTs');
    }
}));
// New endpoint to return all unique NFT contracts as an array
app.get('/nft-contracts/:wallet', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const walletAddress = req.params.wallet;
    const query = `
  {
    mb_views_nft_tokens(
      where: {owner: {_eq: "${walletAddress}"}}
    ) {
      nft_contract_id
    }
  }
  `;
    try {
        const response = yield axios_1.default.post('https://graph.mintbase.xyz/mainnet', {
            query,
        }, {
            headers: {
                'Content-Type': 'application/json',
                'mb-api-key': API_KEY,
            },
        });
        const tokens = response.data.data.mb_views_nft_tokens;
        const uniqueContracts = Array.from(new Set(tokens.map(token => token.nft_contract_id)));
        res.json(uniqueContracts);
    }
    catch (error) {
        console.error('Error fetching NFT contracts:', error);
        res.status(500).send('Error fetching NFT contracts');
    }
}));
// New endpoint to check if any of the given NFT contracts are owned by the wallet
app.post('/check-nft-ownership', express_1.default.json(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { walletAddress, contracts } = req.body;
    const query = `
  {
    mb_views_nft_tokens(
      where: {owner: {_eq: "${walletAddress}"}}
    ) {
      nft_contract_id
    }
  }
  `;
    try {
        const response = yield axios_1.default.post('https://graph.mintbase.xyz/mainnet', {
            query,
        }, {
            headers: {
                'Content-Type': 'application/json',
                'mb-api-key': API_KEY,
            },
        });
        const tokens = response.data.data.mb_views_nft_tokens;
        const ownedContracts = new Set(tokens.map(token => token.nft_contract_id));
        const hasOwnership = contracts.some(contract => ownedContracts.has(contract));
        res.json({ hasOwnership });
    }
    catch (error) {
        console.error('Error checking NFT ownership:', error);
        res.status(500).send('Error checking NFT ownership');
    }
}));
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
