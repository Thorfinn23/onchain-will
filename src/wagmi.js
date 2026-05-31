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

export const CONTRACT_ADDRESS = '0xA46d4f92DAa148d39e9b24Cb1711762867fD58e6'
export const DEPLOY_CHAIN = baseSepolia
