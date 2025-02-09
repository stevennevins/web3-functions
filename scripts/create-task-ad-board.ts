import { Wallet } from "ethers";
import { JsonRpcProvider } from "@ethersproject/providers";
import { AutomateSDK, TriggerType } from "@gelatonetwork/automate-sdk";
import { Web3FunctionBuilder } from "@gelatonetwork/web3-functions-sdk/builder";
import * as dotenv from "dotenv";
import path from "path";
dotenv.config();

if (!process.env.PRIVATE_KEY) throw new Error("Missing env PRIVATE_KEY");
const pk = process.env.PRIVATE_KEY;

if (!process.env.PROVIDER_URLS) throw new Error("Missing env PROVIDER_URL");
const providerUrl = process.env.PROVIDER_URLS.split(",")[0];

const main = async () => {
  // Instantiate provider & signer
  const provider = new JsonRpcProvider(providerUrl);
  const chainId = Number(
    await provider.getNetwork().then((network) => network.chainId)
  );
  const signer = new Wallet(pk, provider);
  const automate = new AutomateSDK(chainId, signer);

  // Deploy Web3Function on IPFS
  console.log("Deploying Web3Function on IPFS...");

  const web3FunctionPath = path.join(
    "web3-functions",
    "advertising-board",
    "index.ts"
  );
  const cid = await Web3FunctionBuilder.deploy(web3FunctionPath);
  console.log(`Web3Function IPFS CID: ${cid}`);

  // Create task using automate-sdk
  console.log("Creating automate task...");
  const { taskId, tx } = await automate.createBatchExecTask({
    name: "Web3Function - Ad Board",
    web3FunctionHash: cid,
    web3FunctionArgs: { adBoard: "0x8aa5827617b1e19CDfDb2e4aE846281669c2C3dE" },
    trigger: {
      interval: 60 * 1000,
      type: TriggerType.TIME,
    },
  });
  await tx.wait();
  console.log(`Task created, taskId: ${taskId} (tx hash: ${tx.hash})`);
  console.log(
    `> https://beta.app.gelato.network/task/${taskId}?chainId=${chainId}`
  );
};

main()
  .then(() => {
    process.exit();
  })
  .catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  });
