'use client';

import { useState, useContext } from 'react';
import { PublicKey } from '@solana/web3.js';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { generateSigner, none, percentAmount } from '@metaplex-foundation/umi';
import { createNft } from '@metaplex-foundation/mpl-token-metadata';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import {
  WalletMultiButton,
} from '@solana/wallet-adapter-react-ui';
import { CheckCircleIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/solid';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { mplTokenMetadata, findMetadataPda } from '@metaplex-foundation/mpl-token-metadata';
import './mint-cnft.css';
import { fromWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters';
import { publicKey as umiPublicKey } from '@metaplex-foundation/umi';
import { MetadataArgsArgs, mintToCollectionV1 } from '@metaplex-foundation/mpl-bubblegum';

export interface MintCNFTProps {
  collectionMint?: string;
  merkleTree?: string;
  rpcUrl?: string;
}

export function MintCNFT({ collectionMint: propCollectionMint }: MintCNFTProps) {
  const wallet = useWallet();
  const { publicKey, connected } = wallet;
  const { connection } = useConnection();
  
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [uri, setUri] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mintMessage, setMintMessage] = useState<{ type: 'success' | 'error'; message: string; signature?: string; nftAddress?: string } | null>(null);
  const [network, setNetwork] = useState('devnet');
  const [merkleTreeAddress, setMerkleTreeAddress] = useState('');
  const [userCollectionMint, setUserCollectionMint] = useState(propCollectionMint || '');

  // Validate form
  const isFormValid = name.trim() !== '' && symbol.trim() !== '' && uri.trim() !== '' && merkleTreeAddress.trim() !== '';

  // Handle mint NFT
  const handleMintNFT = async () => {
    if (!publicKey) {
      setMintMessage({ type: 'error', message: 'Please connect your wallet!' });
      return;
    }

    if (!isFormValid) {
      setMintMessage({ type: 'error', message: 'Please fill in all the information!' });
      return;
    }

    if (!merkleTreeAddress) {
      setMintMessage({ type: 'error', message: 'Please provide a Merkle Tree address!' });
      return;
    }

    setIsLoading(true);
    setMintMessage(null);

    try {
      console.log("Using endpoint:", connection.rpcEndpoint);
      
      // Create UMI instance with necessary plugins and use endpoint from connection
      const umi = createUmi(connection.rpcEndpoint)
        .use(walletAdapterIdentity(wallet))
        .use(mplTokenMetadata());

      // Create NFT
      const nftMint = generateSigner(umi);

      // Convert addresses
      const walletPublicKey = publicKey.toBase58();
      const leafOwnerPubkey = umiPublicKey(walletPublicKey);
      const merkleTreePubkey = umiPublicKey(merkleTreeAddress);
      
      // Use mintToCollectionV1 instead of mintV1
      const { mplBubblegum } = await import('@metaplex-foundation/mpl-bubblegum');
      umi.use(mplBubblegum());
      
      // Check if collection exists
      let collectionMintPubkey;
      if (userCollectionMint) {
        try {
          collectionMintPubkey = umiPublicKey(userCollectionMint);
          console.log("Using user provided collection:", userCollectionMint);
          
          // Check collection by direct fetch instead of using findMetadataPda
          try {
            // Check if collection exists by getting account info
            const collectionAccount = await umi.rpc.getAccount(collectionMintPubkey);
            if (!collectionAccount.exists) {
              throw new Error("Collection does not exist");
            }
            console.log("Collection verified");
          } catch (err) {
            console.error("Error checking collection:", err);
            throw new Error("Invalid or not found Collection NFT. Please try another collection.");
          }
        } catch (err) {
          console.error("Error with provided collection:", err);
          throw new Error("Invalid collection. Please try another collection or leave empty to create new.");
        }
      } else {
        try {
          // Create a temporary collection if none exists
          const tempCollectionMint = generateSigner(umi);
          console.log("Creating collection with mint:", tempCollectionMint.publicKey);
          
          // Create collection NFT and wait for full confirmation
          const createCollectionResult = await createNft(umi, {
            mint: tempCollectionMint,
            name: name + " Collection",
            symbol: symbol,
            uri: uri,
            sellerFeeBasisPoints: percentAmount(5.0),
            isCollection: true,
          }).sendAndConfirm(umi);
          
          console.log("Collection created with signature:", createCollectionResult.signature);
          
          // Wait 2 seconds for transaction to be fully confirmed on network
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          collectionMintPubkey = tempCollectionMint.publicKey;
        } catch (err) {
          console.error("Failed to create collection:", err);
          throw new Error("Failed to create collection for CNFT. Please try with an existing collection.");
        }
      }
      
      console.log("Using collection:", collectionMintPubkey);
      
      // Configure mintToCollectionV1
      const metadataArgs = {
        name: name,
        uri: uri,
        sellerFeeBasisPoints: 500,
        collection: {
          key: collectionMintPubkey,
          verified: false
        },
        creators: [
          { address: umi.identity.publicKey, verified: false, share: 100 }
        ],
      };
      
      const mintConfig = {
        leafOwner: leafOwnerPubkey,
        merkleTree: merkleTreePubkey,
        collectionMint: collectionMintPubkey,
        metadata: metadataArgs,
      };
      
      // Mint CNFT
      console.log("Minting cNFT with config:", JSON.stringify(mintConfig, (key, value) => 
        typeof value === 'bigint' ? value.toString() : value
      ));
      
      try {
        const mintResult = await mintToCollectionV1(umi, mintConfig).sendAndConfirm(umi);
        // Display success message
        setMintMessage({
          type: 'success',
          message: 'CNFT created successfully!',
          signature: mintResult.signature.toString(),
          nftAddress: nftMint.publicKey.toString(),
        });
      } catch (mintErrorUnknown) {
        console.error("Specific error when minting CNFT:", mintErrorUnknown);
        
        const mintError = mintErrorUnknown as Error;
        // If error is related to collection metadata, try creating new collection
        if (mintError.message && mintError.message.includes("collection_metadata")) {
          console.log("Detected collection metadata error, trying to create new collection...");
          
          // Create new collection
          const newCollectionMint = generateSigner(umi);
          console.log("Creating new collection with mint:", newCollectionMint.publicKey);
          
          try {
            // Create collection NFT and wait for confirmation
            const createCollectionResult = await createNft(umi, {
              mint: newCollectionMint,
              name: name + " Collection",
              symbol: symbol,
              uri: uri,
              sellerFeeBasisPoints: percentAmount(5.0),
              isCollection: true,
            }).sendAndConfirm(umi);
            
            console.log("New collection created with signature:", createCollectionResult.signature);
            
            // Wait 2 seconds for transaction confirmation
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Try minting again with new collection
            const newMintConfig = {
              ...mintConfig,
              collectionMint: newCollectionMint.publicKey,
              metadata: {
                ...metadataArgs,
                collection: {
                  key: newCollectionMint.publicKey,
                  verified: false
                }
              }
            };
            
            console.log("Trying to mint again with new collection:", JSON.stringify(newMintConfig, (key, value) => 
              typeof value === 'bigint' ? value.toString() : value
            ));
            
            const newMintResult = await mintToCollectionV1(umi, newMintConfig).sendAndConfirm(umi);
            
            setMintMessage({
              type: 'success',
              message: 'CNFT created successfully with new collection!',
              signature: newMintResult.signature.toString(),
              nftAddress: nftMint.publicKey.toString(),
            });
            
            // Update collection mint in UI
            setUserCollectionMint(newCollectionMint.publicKey.toString());
          } catch (retryErrorUnknown) {
            console.error("Error when trying with new collection:", retryErrorUnknown);
            const retryError = retryErrorUnknown as Error;
            throw new Error(`Cannot create CNFT: ${retryError.message}`);
          }
        } else {
          // If it's a different error, throw it again
          throw mintError;
        }
      }
    } catch (error) {
      console.error('Error creating NFT:', error);
      setMintMessage({
        type: 'error',
        message: `Error: ${error instanceof Error ? error.message : 'Unknown'}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setName('');
    setSymbol('');
    setUri('');
    setUserCollectionMint('');
    setMintMessage(null);
  };

  const handleViewExplorer = (signature: string) => {
    if (!signature) return;
    const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=${network}`;
    window.open(explorerUrl, '_blank');
  };

  const handleViewNFT = (nftAddress: string) => {
    if (!nftAddress) return;
    const explorerUrl = `https://explorer.solana.com/address/${nftAddress}?cluster=${network}`;
    window.open(explorerUrl, '_blank');
  };

  return (
    <div className="mint-cnft-container">
      <div className="mint-cnft-header">
        <h2>Create CNFT</h2>
        <p className="mint-cnft-description">Create a new CNFT on Solana</p>
      </div>

      {connected && publicKey && (
        <div className="wallet-status">
          <span className="wallet-address">
            {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
          </span>
          <span className="network-badge">{network}</span>
        </div>
      )}

      {!connected ? (
        <div className="wallet-connect-container">
          <WalletMultiButton />
          <p className="input-help">Connect wallet to create CNFT</p>
        </div>
      ) : (
        <>
          {mintMessage?.type === 'success' ? (
            <div className="success-message">
              <div className="success-heading">
                <CheckCircleIcon width={20} height={20} />
                <span>{mintMessage.message}</span>
              </div>
              
              {mintMessage.nftAddress && (
                <div>
                  <p>NFT Address:</p>
                  <div className="success-details">{mintMessage.nftAddress}</div>
                </div>
              )}
              
              {mintMessage.signature && (
                <div>
                  <p>Transaction Signature:</p>
                  <div className="success-details">{mintMessage.signature}</div>
                </div>
              )}
              
              <div className="action-buttons">
                {mintMessage.nftAddress && (
                  <button 
                    onClick={() => handleViewNFT(mintMessage.nftAddress as string)}
                    className="action-button view-nft-button"
                  >
                    <ArrowTopRightOnSquareIcon width={16} height={16} />
                    View CNFT
                  </button>
                )}
                
                {mintMessage.signature && (
                  <button 
                    onClick={() => handleViewExplorer(mintMessage.signature as string)}
                    className="action-button view-tx-button"
                  >
                    <ArrowTopRightOnSquareIcon width={16} height={16} />
                    View Transaction
                  </button>
                )}
              </div>
              
              <button 
                onClick={resetForm}
                className="mint-button"
                style={{ marginTop: '16px' }}
              >
                Create New CNFT
              </button>
            </div>
          ) : (
            <>
              <div className="nft-card">
                <form onSubmit={(e) => { e.preventDefault(); handleMintNFT(); }}>
                  <div className="input-group">
                    <div className="input-label">
                      <label htmlFor="name">CNFT Name</label>
                    </div>
                    <div className="input-container">
                      <input
                        id="name"
                        className="mint-input"
                        type="text"
                        placeholder="Enter CNFT name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                    <p className="input-help">Display name of the CNFT</p>
                  </div>
                  
                  <div className="input-group">
                    <div className="input-label">
                      <label htmlFor="symbol">Symbol</label>
                    </div>
                    <div className="input-container">
                      <input
                        id="symbol"
                        className="mint-input"
                        type="text"
                        placeholder="Enter symbol (e.g., BTC, ETH)"
                        value={symbol}
                        onChange={(e) => setSymbol(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                    <p className="input-help">Short symbol for your CNFT</p>
                  </div>
                  
                  <div className="input-group">
                    <div className="input-label">
                      <label htmlFor="uri">Metadata URI</label>
                    </div>
                    <div className="input-container">
                      <input
                        id="uri"
                        className="mint-input"
                        type="text"
                        placeholder="Enter metadata URI"
                        value={uri}
                        onChange={(e) => setUri(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                    <p className="input-help">Link to the metadata of the CNFT (JSON)</p>
                  </div>

                  <div className="input-group">
                    <div className="input-label">
                      <label htmlFor="merkleTree">Merkle Tree Address</label>
                    </div>
                    <div className="input-container">
                      <input
                        id="merkleTree"
                        className="mint-input"
                        type="text"
                        placeholder="Enter Merkle Tree address"
                        value={merkleTreeAddress}
                        onChange={(e) => setMerkleTreeAddress(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                    <p className="input-help">Address of the Merkle Tree to mint CNFT into</p>
                  </div>

                  <div className="input-group">
                    <div className="input-label">
                      <label htmlFor="collectionMint">Collection Mint (Optional)</label>
                    </div>
                    <div className="input-container">
                      <input
                        id="collectionMint"
                        className="mint-input"
                        type="text"
                        placeholder="Enter Collection Mint address or leave empty to create new"
                        value={userCollectionMint}
                        onChange={(e) => setUserCollectionMint(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                    <p className="input-help">Collection NFT mint address, if left empty, a new collection will be created</p>
                  </div>
                </form>
              </div>
              
              {propCollectionMint && (
                <div className="collection-display">
                  <div className="collection-title">Merkle Tree Mint</div>
                  <div className="collection-address">{propCollectionMint}</div>
                </div>
              )}
              
              <div className="nft-info">
                <div className="info-row">
                  <span className="info-label">Network</span>
                  <span className="info-value">{network}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Endpoint</span>
                  <span className="info-value" title={connection.rpcEndpoint}>
                    {connection.rpcEndpoint.slice(0, 20)}...
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Seller Fee</span>
                  <span className="info-value">5%</span>
                </div>
                {publicKey && (
                  <div className="info-row">
                    <span className="info-label">Owner</span>
                    <span className="info-value">{publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}</span>
                  </div>
                )}
              </div>
              
              <button
                className={`mint-button ${isLoading ? 'loading' : ''}`}
                onClick={handleMintNFT}
                disabled={!isFormValid || isLoading || !connected}
                type="button"
              >
                {isLoading ? 'Creating...' : 'Create CNFT'}
              </button>
              
              {mintMessage?.type === 'error' && (
                <div className="error-message">
                  {mintMessage.message}
                </div>
              )}
              
              {isLoading && (
                <div className="mint-loader">
                  <div className="loader-spinner"></div>
                  <div className="loader-text">Creating CNFT...</div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
} 