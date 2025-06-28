// nftEndpoint.ts
import express from 'express';
import { connect, keyStores } from 'near-api-js';
import dotenv from 'dotenv';
import cors from 'cors';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
app.use(cors({
  origin: 'http://localhost:8080',
  credentials: true
}));

// Middleware to parse JSON payloads
app.use(express.json());

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
      keyStore: new keyStores.InMemoryKeyStore(),
    };
  } else {
    return {
      networkId: 'testnet',
      nodeUrl: 'https://rpc.testnet.near.org',
      walletUrl: 'https://wallet.testnet.near.org',
      helperUrl: 'https://helper.testnet.near.org',
      explorerUrl: 'https://explorer.testnet.near.org',
      keyStore: new keyStores.InMemoryKeyStore(),
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

app.get('/nfts/:accountId', async (req, res) => {
  const { accountId } = req.params;

  try {
    const near = await connect(nearConfig);
    const account = await near.account(accountId);

    const allNFTs = [];

    for (const contractId of knownNFTContracts) {
      try {
        const tokens: any[] = await account.viewFunction({
          contractId,
          methodName: 'nft_tokens_for_owner',
          args: { account_id: accountId, from_index: '0', limit: 50 },
        });

        allNFTs.push(...tokens.map(token => ({ ...token, contract: contractId })));
      } catch (err:any) {
        console.warn(`Failed to fetch from ${contractId}:`, err.message);
      }
    }

    res.json(allNFTs);
  } catch (error:any) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to get NFTs with custom contract list
app.post('/nfts/fetch', async (req, res) => {
  const { walletId, contracts } = req.body;

  if (!walletId || !contracts || !Array.isArray(contracts)) {
    return res.status(400).json({ 
      error: 'walletId and contracts array are required' 
    });
  }

  try {
    const near = await connect(nearConfig);
    const account = await near.account(walletId);

    const allNFTs = [];

    for (const contractId of contracts) {
      try {
        const tokens: any[] = await account.viewFunction({
          contractId,
          methodName: 'nft_tokens_for_owner',
          args: { account_id: walletId, from_index: '0', limit: 50 },
        });

        allNFTs.push(...tokens.map(token => ({ ...token, contract: contractId })));
      } catch (err: any) {
        console.warn(`Failed to fetch from ${contractId}:`, err.message);
      }
    }

    res.json({
      walletId,
      nfts: allNFTs,
      totalCount: allNFTs.length
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to check if wallet has NFTs from any of the specified contracts
app.post('/nfts/check-status', async (req, res) => {
  const { walletId, contracts } = req.body;

  if (!walletId || !contracts || !Array.isArray(contracts)) {
    return res.status(400).json({ 
      error: 'walletId and contracts array are required' 
    });
  }

  try {
    const near = await connect(nearConfig);
    const account = await near.account(walletId);

    let hasNFTs = false;
    const contractResults = [];

    for (const contractId of contracts) {
      try {
        const tokens: any[] = await account.viewFunction({
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
      } catch (err: any) {
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 NFT API running at http://localhost:${PORT}`);
  console.log(`📡 Connected to NEAR ${NETWORK} network`);
});
