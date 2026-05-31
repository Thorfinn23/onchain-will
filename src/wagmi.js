import { createConfig, http } from 'wagmi'
import { base, baseSepolia } from 'wagmi/chains'
import { injected, coinbaseWallet } from 'wagmi/connectors'

export const config = createConfig({
  chains: [baseSepolia, base],
  connectors: [
    coinbaseWallet({
      appName: 'OnChain Will',
      preference: 'smartWalletOnly',
    }),
    injected(),
  ],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http('https://base-sepolia-rpc.publicnode.com'),
  },
})

// Contract addresses per network
export const CONTRACTS = {
  [baseSepolia.id]: '0xA46d4f92DAa148d39e9b24Cb1711762867fD58e6', // Base Sepolia (testnet)
  [base.id]: null, // Base Mainnet — deploy when ready
}

// USDC addresses per network
export const USDC = {
  [baseSepolia.id]: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  [base.id]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
}

export { base, baseSepolia }
