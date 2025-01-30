import express, { Request, Response } from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
const port = 3000;
app.use(cors({ origin: 'https://spearonnear.github.io' }));

interface NFTToken {
  nft_contract_id: string;
  token_id: string;
  metadata_id: string;
  title: string;
  description: string;
  media: string;
}

interface MintbaseResponse {
  data: {
    mb_views_nft_tokens: NFTToken[];
  };
}

const API_KEY = process.env.MB_API_KEY as string;

app.get('/nfts/:wallet', async (req: Request, res: Response) => {
  const walletAddress: string = req.params.wallet;
  const query: string = `
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
    const response = await axios.post<MintbaseResponse>('https://graph.mintbase.xyz/mainnet', {
      query,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'mb-api-key': API_KEY,
      },
    });

    const tokens = response.data.data.mb_views_nft_tokens;

    // Aggregate NFTs by contract ID
    const aggregatedTokens: { [key: string]: { contract: string, quantity: number, nft_meta: any } } = {};

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
  } catch (error) {
    console.error('Error fetching NFTs:', error);
    res.status(500).send('Error fetching NFTs');
  }
});

// New endpoint to return all unique NFT contracts as an array
app.get('/nft-contracts/:wallet', async (req: Request, res: Response) => {
  const walletAddress: string = req.params.wallet;
  const query: string = `
  {
    mb_views_nft_tokens(
      where: {owner: {_eq: "${walletAddress}"}}
    ) {
      nft_contract_id
    }
  }
  `;

  try {
    const response = await axios.post<MintbaseResponse>('https://graph.mintbase.xyz/mainnet', {
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
  } catch (error) {
    console.error('Error fetching NFT contracts:', error);
    res.status(500).send('Error fetching NFT contracts');
  }
});

// New endpoint to check if any of the given NFT contracts are owned by the wallet
app.post('/check-nft-ownership', express.json(), async (req: Request, res: Response) => {
  const { walletAddress, contracts }: { walletAddress: string, contracts: string[] } = req.body;
  const query: string = `
  {
    mb_views_nft_tokens(
      where: {owner: {_eq: "${walletAddress}"}}
    ) {
      nft_contract_id
    }
  }
  `;

  try {
    const response = await axios.post<MintbaseResponse>('https://graph.mintbase.xyz/mainnet', {
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
  } catch (error) {
    console.error('Error checking NFT ownership:', error);
    res.status(500).send('Error checking NFT ownership');
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
