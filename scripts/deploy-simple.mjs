import { ethers } from 'ethers';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { createRequire } from 'module';
import 'dotenv/config';

const require = createRequire(import.meta.url);

// Compile the contract using solc
console.log('Compiling contract...');
const solc = require('solc');

const source = readFileSync('./contracts/OnChainWill.sol', 'utf8');

const input = {
  language: 'Solidity',
  sources: { 'OnChainWill.sol': { content: source } },
  settings: { outputSelection: { '*': { '*': ['abi', 'evm.bytecode'] } } }
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
  const errors = output.errors.filter(e => e.severity === 'error');
  if (errors.length > 0) {
    console.error('Compilation errors:', errors);
    process.exit(1);
  }
}

const contract = output.contracts['OnChainWill.sol']['OnChainWill'];
const abi = contract.abi;
const bytecode = contract.evm.bytecode.object;

console.log('✅ Compiled successfully');

// Deploy
const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);

console.log(`Deploying from: ${wallet.address}`);
const balance = await provider.getBalance(wallet.address);
console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

if (balance === 0n) {
  console.error('❌ No ETH in deployer wallet. Please add some Base ETH for gas.');
  process.exit(1);
}

const factory = new ethers.ContractFactory(abi, bytecode, wallet);
console.log('Deploying to Base Sepolia Testnet...');
const deployed = await factory.deploy();
await deployed.waitForDeployment();

const address = await deployed.getAddress();
console.log(`\n✅ OnChainWill deployed to: ${address}`);
console.log(`🔍 View on Basescan: https://sepolia.basescan.org/address/${address}`);
console.log(`\n📋 Copy this address — you'll need it for the frontend!`);

// Save ABI for frontend
import { writeFileSync } from 'fs';
writeFileSync('./src/OnChainWillABI.json', JSON.stringify(abi, null, 2));
console.log('✅ ABI saved to src/OnChainWillABI.json');
