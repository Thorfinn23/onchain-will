import { createConfig, http } from 'wagmi'
import { base, baseSepolia } from 'wagmi/chains'
import { injected, coinbaseWallet } from 'wagmi/connectors'

export const config = createConfig({
  chains: [baseSepolia, base],
  connectors: [
    injected(),
    coinbaseWallet({
      appName: 'OnChain Will',
      preference: 'all',
    }),
  ],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http('https://base-sepolia.g.alchemy.com/v2/demo'),
  },
})

// Contract addresses per network
export const CONTRACTS = {
  [baseSepolia.id]: '0xe16146BDfc7B18Cd61Ea5F3cf159D671bB9F1d06', // Base Sepolia (testnet)
  [base.id]: null, // Base Mainnet — deploy when ready
}

// USDC addresses per network
export const USDC = {
  [baseSepolia.id]: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  [base.id]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
}

export { base, baseSepolia }
