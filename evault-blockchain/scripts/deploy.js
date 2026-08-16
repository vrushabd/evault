require("dotenv").config();
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const solc = require("solc");

function compileContract() {
  const contractPath = path.join(__dirname, "../contracts/eVault.sol");
  const source = fs.readFileSync(contractPath, "utf8");

  const input = {
    language: "Solidity",
    sources: { "eVault.sol": { content: source } },
    settings: {
      outputSelection: {
        "*": { "*": ["abi", "evm.bytecode"] },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    const fatal = output.errors.filter((e) => e.severity === "error");
    if (fatal.length > 0) {
      throw new Error(fatal.map((e) => e.formattedMessage).join("\n"));
    }
  }

  const contract = output.contracts["eVault.sol"].eVault;
  return { abi: contract.abi, bytecode: contract.evm.bytecode.object };
}

async function main() {
  if (!process.env.SEPOLIA_RPC_URL || !process.env.PRIVATE_KEY) {
    console.error("Set SEPOLIA_RPC_URL and PRIVATE_KEY in .env");
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  let abi;
  let bytecode;

  const artifactPath = path.join(__dirname, "../artifacts/eVault.json");
  if (fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    abi = artifact.abi;
    bytecode = artifact.bytecode;
    console.log("Using pre-compiled artifact from artifacts/eVault.json");
  } else {
    console.log("Compiling eVault.sol with solc...");
    ({ abi, bytecode } = compileContract());
  }

  const factory = new ethers.ContractFactory(abi, bytecode, wallet);

  console.log("Deploying eVault from:", wallet.address);
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("eVault deployed to:", address);
  console.log("View on Etherscan: https://sepolia.etherscan.io/address/" + address);

  fs.writeFileSync(
    path.join(__dirname, "../contracts/eVault.abi.json"),
    JSON.stringify(abi, null, 2)
  );

  console.log("\nAdd this to your .env:");
  console.log("CONTRACT_ADDRESS=" + address);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
