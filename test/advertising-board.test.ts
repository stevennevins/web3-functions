import path from "path";
import { Web3FunctionContextData } from "@gelatonetwork/web3-functions-sdk";
import { Web3FunctionLoader } from "@gelatonetwork/web3-functions-sdk/loader";
import { runWeb3Function } from "./utils";
import { AnvilServer } from "./utils/anvil-server";

const w3fName = "advertising-board";
const w3fRootDir = path.join("web3-functions");
const w3fPath = path.join(w3fRootDir, w3fName, "index.ts");

describe("Advertising Board Web3 Function test", () => {
  let context: Web3FunctionContextData;
  let sepoliaFork: AnvilServer;

  beforeAll(async () => {
    sepoliaFork = await AnvilServer.fork({
      forkBlockNumber: 100000,
      forkUrl: "https://rpc.ankr.com/eth_sepolia",
    });

    const { secrets } = Web3FunctionLoader.load(w3fName, w3fRootDir);
    const gasPrice = (await sepoliaFork.provider.getGasPrice()).toString();

    context = {
      secrets,
      storage: {},
      gelatoArgs: {
        chainId: 11155111,
        gasPrice,
      },
      userArgs: {},
    };
  }, 10000);

  afterAll(async () => {
    sepoliaFork.kill();
  });

  it("canExec: false - Time not elapsed", async () => {
    const blockTime = (await sepoliaFork.provider.getBlock("latest")).timestamp;

    // mock storage state of "lastPost"
    context.storage = { lastPost: blockTime.toString() };

    const res = await runWeb3Function(w3fPath, context, [sepoliaFork.provider]);

    expect(res.result.canExec).toEqual(false);
  });

  it("canExec: True - Time elapsed", async () => {
    const blockTimeBefore = (await sepoliaFork.provider.getBlock("latest"))
      .timestamp;
    const nextPostTime = blockTimeBefore + 3600;

    // fast forward block time
    await sepoliaFork.provider.send("evm_mine", [nextPostTime]);

    // pass current block time
    const blockTime = (await sepoliaFork.provider.getBlock("latest")).timestamp;

    const res = await runWeb3Function(w3fPath, context, [sepoliaFork.provider]);

    expect(res.result.canExec).toEqual(true);

    // expect "lastPost" to be updated
    expect(res.storage.state).toEqual("updated");
    expect(res.storage.storage["lastPost"]).toEqual(blockTime.toString());
  });
});
