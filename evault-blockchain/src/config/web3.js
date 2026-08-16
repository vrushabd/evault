const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const abiPath = path.join(__dirname, "../../contracts/eVault.abi.json");
const abi = JSON.parse(fs.readFileSync(abiPath, "utf8"));

const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const contractAddress = process.env.CONTRACT_ADDRESS;

const contract = new ethers.Contract(contractAddress, abi, wallet);
const readContract = new ethers.Contract(contractAddress, abi, provider);

const ROLE_NAMES = ["NONE", "CLIENT", "LAWYER", "JUDGE", "ADMIN"];
const STATUS_NAMES = ["ACTIVE", "ARCHIVED", "REVOKED"];

async function checkConnection() {
  try {
    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();
    return {
      connected: true,
      chainId: Number(network.chainId),
      blockNumber,
      walletAddress: wallet.address,
    };
  } catch (err) {
    return { connected: false, error: err.message };
  }
}

module.exports = {
  provider,
  wallet,
  signer: wallet,
  contract,
  readContract,
  contractAddress,
  ROLE_NAMES,
  STATUS_NAMES,
  checkConnection,
};
