declare module 'class-variance-authority' {
  export const cva: any;
  export type VariantProps<T> = any;
}

declare module '@solana/wallet-adapter-react-ui' {
  export const WalletMultiButton: any;
  export const WalletModalProvider: any;
}

declare module '@solana/wallet-adapter-react' {
  export const useWallet: any;
  export const ConnectionProvider: any;
  export const WalletProvider: any;
  export type WalletContextState = any;
  export type ConnectionProviderProps = any;
  export const useConnection: any;
}

declare module '@solana/wallet-adapter-base' {
  export const WalletAdapterNetwork: any;
  export type Adapter = any;
  export type WalletName = any;
}

declare module '@solana/wallet-adapter-wallets' {
  export const PhantomWalletAdapter: any;
}

declare module '@solana/web3.js' {
  export const clusterApiUrl: any;
  export const Connection: any;
  export type Connection = any;
  export class PublicKey {
    constructor(value: string | Uint8Array | Buffer | number[] | PublicKey);
    toString(): string;
    equals(publicKey: PublicKey): boolean;
    toBuffer(): Buffer;
    static findProgramAddressSync(seeds: Buffer[], programId: PublicKey): [PublicKey, number];
  }
  export class VersionedTransaction {
    static deserialize(data: Buffer): VersionedTransaction;
    serialize(): Uint8Array;
  }
}

declare module '@solana/spl-token' {
  export function getMint(connection: any, mint: any): Promise<any>;
  export function getAccount(connection: any, address: any): Promise<any>;
  export function getAssociatedTokenAddress(mint: any, owner: any): Promise<any>;
  export class TokenAccountNotFoundError extends Error {}
  export class TokenInvalidAccountOwnerError extends Error {}
  export interface Account {
    amount: bigint;
  }
}

declare module 'clsx' {
  export default function clsx(...inputs: any[]): string;
  export type ClassValue = any;
}

declare module 'tailwind-merge' {
  export const twMerge: any;
}

declare module 'clsx' {
  export const clsx: (...inputs: any[]) => string;
  export type ClassValue = any;
}

/**
 * Module type declarations
 */
declare module 'swap' {
  export interface Config {
    JUPITER_REFERRAL_ACCOUNT?: string;
    JUPITER_FEE_BPS?: number;
  }
}

declare module 'stake';

// Tạo thêm alias modules để giữ cho TypeScript vui vẻ
declare global {
  type SwapModule = {
    Config: {
      JUPITER_REFERRAL_ACCOUNT?: string;
      JUPITER_FEE_BPS?: number;
    }
  };
  type StakeModule = unknown;
}

// Add path aliases
declare module '@murphis/source/*' {
  const content: any;
  export default content;
}

declare module '@metaplex-foundation/mpl-token-metadata' {
  export const createNft: any;
  export const mintToCollectionV1: any;
  export const mplTokenMetadata: any;
  export const findMetadataPda: any;
}

declare module '@metaplex-foundation/umi' {
  export const generateSigner: any;
  export const none: any;
  export const percentAmount: any;
  export const publicKey: any;
}

declare module '@metaplex-foundation/umi-bundle-defaults' {
  export const createUmi: any;
}

declare module '@metaplex-foundation/mpl-core' {
  export const create: any;
  export const fetchCollection: any;
  export const mplCore: any;
}

declare module '@metaplex-foundation/umi-web3js-adapters' {
  export const fromWeb3JsPublicKey: any;
  export const toWeb3JsPublicKey: any;
}

declare module '@metaplex-foundation/umi-signer-wallet-adapters' {
  export const walletAdapterIdentity: any;
}

declare module '@metaplex-foundation/umi-bundle-defaults' {
  export const createUmi: any;
}

declare module '@metaplex-foundation/mpl-bubblegum' {
  export const mplBubblegum: any;
  export const MetadataArgsArgs: any;
  export const mintToCollectionV1: any;
  export const createTree: any;
}

declare module '@heroicons/react/24/solid' {
  export const CheckCircleIcon: any;
  export const ArrowTopRightOnSquareIcon: any;
}

/**
 * Global window with Solana
 */
interface Window {
  solana: {
    uiMethods: {
      deserializeTransaction: (txBuffer: Buffer) => any;
    };
    signTransaction: (tx: any) => Promise<any>;
  }
}