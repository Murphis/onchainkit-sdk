'use client';

import { useState, useEffect, useContext } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { ModalContext } from '../../../provider/connect-wallet/wallet-provider';
import { createNft } from '@metaplex-foundation/mpl-token-metadata'
import { percentAmount } from '@metaplex-foundation/umi';
import { CheckCircleIcon, ExternalLinkIcon } from '@heroicons/react/solid';
import './create-merkleTree.css';

interface CreateMerkleTreeResult {
  mint: string;
  signature: string;
}

export function CreateMerkleTree({ onMerkleTreeCreated }: { onMerkleTreeCreated?: (collectionMint: string) => void }) {
  const { connection } = useConnection();
  const { publicKey, connected, wallet, signTransaction, signAllTransactions } = useWallet();
  const { switchToNextEndpoint, endpoint } = useContext(ModalContext);
  
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CreateMerkleTreeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [network, setNetwork] = useState(endpoint?.includes('devnet') ? 'devnet' : 'mainnet');
  const [maxDepth, setMaxDepth] = useState('14');
  const [maxBuffer, setMaxBuffer] = useState('64');

  // Only render after the component is mounted on the client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update network state when endpoint changes
  useEffect(() => {
    setNetwork(endpoint?.includes('devnet') ? 'devnet' : 'mainnet');
  }, [endpoint]);

  const validateURI = (uri: string) => {
    try {
      // Check if the URI is a valid URL
      new URL(uri);
      return true;
    } catch (e) {
      return false;
    }
  };

  const handleCreateMerkleTree = async () => {
    if (!connected || !publicKey || !wallet) {
      setError('Please connect your wallet');
      return;
    }

    if (!maxDepth || !maxBuffer) {
      setError('Please enter max depth and buffer size');
      return;
    }

    if (parseInt(maxDepth) < 1 || parseInt(maxDepth) > 30) {
      setError('Max depth must be between 1 and 30');
      return;
    }

    if (parseInt(maxBuffer) < 1) {
      setError('Max buffer size must be greater than 0');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Create wallet adapter for signing transactions
      const walletAdapter = {
        publicKey: publicKey,
        signTransaction,
        signAllTransactions
      };

      // Import Metaplex libraries asynchronously
      const [
        { createUmi },
        { walletAdapterIdentity },
        { mplTokenMetadata },
        { generateSigner },
        { createTree }
      ] = await Promise.all([
        import('@metaplex-foundation/umi-bundle-defaults'),
        import('@metaplex-foundation/umi-signer-wallet-adapters'),
        import('@metaplex-foundation/mpl-token-metadata'),
        import('@metaplex-foundation/umi'),
        import('@metaplex-foundation/mpl-bubblegum')
      ]);

      // Create UMI instance with all necessary modules
      const umi = createUmi(connection.rpcEndpoint)
        .use(walletAdapterIdentity(walletAdapter))
        .use(mplTokenMetadata());
      
        const merkleTree = generateSigner(umi)
        const builder = await createTree(umi, {
          merkleTree,
          maxDepth: parseInt(maxDepth),
          maxBufferSize: parseInt(maxBuffer),
        })
        const result = await builder.sendAndConfirm(umi)
      
      // Convert signature to string format
      const signatureStr = typeof result.signature === 'string' 
        ? result.signature 
        : Buffer.from(result.signature).toString('base64');
      
      // Convert mint address to string
      const merkleTreeAddressStr = merkleTree.publicKey.toString();
      
      // Save result
      setResult({
        mint: merkleTreeAddressStr,
        signature: signatureStr
      });
      
      // Call callback if provided
      if (onMerkleTreeCreated) {
        onMerkleTreeCreated(merkleTreeAddressStr);
      }
      
    } catch (err: any) {
      console.error("Create Merkle Tree error:", err);
      setError(err.message);
      
      // If transaction fails due to connection error, try switching to another endpoint
      if (err.message.includes('failed to fetch') || 
          err.message.includes('timeout') || 
          err.message.includes('429') ||
          err.message.includes('503')) {
        switchToNextEndpoint();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const viewExplorer = () => {
    if (result?.signature) {
      const baseUrl = network === 'devnet' ? 'https://explorer.solana.com/tx/' : 'https://solscan.io/tx/';
      window.open(`${baseUrl}${result.signature}${network === 'devnet' ? '?cluster=devnet' : ''}`, '_blank');
    }
  };

  const viewMerkleTree = () => {
    if (result?.mint) {
      const baseUrl = network === 'devnet' ? 'https://explorer.solana.com/address/' : 'https://solscan.io/token/';
      window.open(`${baseUrl}${result.mint}${network === 'devnet' ? '?cluster=devnet' : ''}`, '_blank');
    }
  };

  // Reset form
  const resetForm = () => {
    setMaxDepth('14');
    setMaxBuffer('64');
    setResult(null);
    setError(null);
  };

  // Avoid hydration error
  if (!mounted) {
    return <div className="create-merkle-tree-container">
      <div className="create-merkle-tree-header">
        <h2>Create Merkle Tree</h2>
        <p className="create-merkle-tree-description">Create a new Merkle Tree on Solana</p>
      </div>
      <div className="loader">
        <div className="loader-spinner"></div>
        <div className="loader-text">Loading...</div>
      </div>
    </div>;
  }

  return (
    <div className="create-merkle-tree-container">
      <div className="create-merkle-tree-header">
        <h2>Create Merkle Tree</h2>
        <p className="create-merkle-tree-description">Create a new Merkle Tree on Solana</p>
      </div>
      
      {connected && publicKey && (
        <div className="wallet-status">
          <span className="wallet-address">
            {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
          </span>
          <span className="network-badge">
            {network}
          </span>
        </div>
      )}
      
      {!connected ? (
        <div className="wallet-connect-container">
          <WalletMultiButton />
          <p className="input-help">Connect wallet to create merkle tree</p>
        </div>
      ) : result ? (
        <div className="success-message">
          <div className="success-heading">
            <CheckCircleIcon width={20} height={20} />
            <span>Merkle Tree created successfully!</span>
          </div>
          
          <div>
            <p>Merkle Tree Mint:</p>
            <div className="success-details">{result.mint}</div>
          </div>
          
          <div>
            <p>Transaction Signature:</p>
            <div className="success-details">{result.signature}</div>
          </div>
          
          <div className="action-buttons">
            <button 
              onClick={viewMerkleTree}
              className="action-button view-merkle-tree-button"
            >
              <ExternalLinkIcon width={16} height={16} />
              View Merkle Tree
            </button>
            
            <button 
              onClick={viewExplorer}
              className="action-button view-tx-button"
            >
              <ExternalLinkIcon width={16} height={16} />
              View Transaction
            </button>
          </div>
          
          <button 
            onClick={resetForm}
            className="create-button"
            style={{ marginTop: '16px' }}
          >
            Create New Merkle Tree
          </button>
        </div>
      ) : (
        <>
          <div className="merkle-tree-card">
            
            <div className="input-group">
              <div className="input-label">
                <label htmlFor="max-depth">Max Depth</label>
              </div>
              <div className="input-container">
                <input
                  id="max-depth"
                  type="number"
                  value={maxDepth}
                  onChange={(e) => setMaxDepth(e.target.value)}
                  className="collection-input"
                  placeholder="14"
                  min="1"
                  max="30"
                  required
                />
              </div>
              <p className="input-help">Maximum depth of the Merkle tree (recommended: 14-20)</p>
            </div>
            
            <div className="input-group">
              <div className="input-label">
                <label htmlFor="max-buffer">Max Buffer Size</label>
              </div>
              <div className="input-container">
                <input
                  id="max-buffer"
                  type="number"
                  value={maxBuffer}
                  onChange={(e) => setMaxBuffer(e.target.value)}
                  className="merkle-tree-input"
                  placeholder="64"
                  min="1"
                  required
                />
              </div>
              <p className="input-help">Maximum buffer size for concurrent operations (recommended: 64-256)</p>
            </div>
            
            <button
              onClick={handleCreateMerkleTree}
              disabled={isLoading || !maxDepth || !maxBuffer}
              className={`create-button ${isLoading ? 'loading' : ''}`}
            >
              {isLoading ? 'Creating...' : 'Create Merkle Tree'}
            </button>
          </div>
        </>
      )}
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
    </div>
  );
} 