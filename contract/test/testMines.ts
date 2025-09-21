import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { expect } from "chai";
import { ConfidentialBomb, ConfidentialBomb__factory } from "../types";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory(
    "ConfidentialBomb"
  )) as ConfidentialBomb__factory;
  const mines = (await factory.deploy()) as ConfidentialBomb;
  return { mines, minesAddress: await mines.getAddress() };
}

// Helper: encrypt full board in one proof
async function encryptBoard(board: number[], contract: string, user: string) {
  const enc = await fhevm.createEncryptedInput(contract, user);
  board.forEach((v) => enc.add32(v));
  const res = await enc.encrypt();
  return { encryptedTiles: res.handles, proof: res.inputProof };
}

describe("ConfidentialBomb", () => {
  let signers: Signers;
  let mines: ConfidentialBomb;
  let minesAddress: string;

  before(async () => {
    const ethSigners = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn("⚠️ Skipping tests: not running on fhEVM mock");
      this.skip();
    }
    ({ mines, minesAddress } = await deployFixture());
  });

  it("should create game, pick a SAFE tile and end + reveal", async () => {
    const board = [0, 0, 1, 0, 0];
    const seed = 123456;
    const commitHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "address", "uint8"],
        [seed, signers.alice.address, board.length]
      )
    );

    const { encryptedTiles, proof } = await encryptBoard(
      board,
      minesAddress,
      signers.alice.address
    );

    const receipt = await (
      await mines
        .connect(signers.alice)
        .createGame(encryptedTiles, proof, commitHash, board.length)
    ).wait();
    const event = receipt?.logs.find((l) => l.fragment?.name === "GameCreated");
    const gameId = event?.args?.[0];
    expect(gameId).to.not.be.undefined;

    // pick SAFE at index 0
    await expect(
      mines.connect(signers.alice).pickTile(gameId, 0)
    ).to.not.be.reverted;
    expect(await mines.getOpenedCount(gameId)).to.eq(1);

    // end game
    await expect(mines.connect(signers.alice).endGame(gameId)).to.not.be
      .reverted;
    expect(await mines.getState(gameId)).to.eq(1); // Ended

    // revealSeed + revealGame
    await expect(
      mines.connect(signers.alice).revealSeed(gameId, seed)
    ).to.not.be.reverted;

    await expect(
      mines.connect(signers.alice).revealGame(gameId, board)
    ).to.not.be.reverted;
  });

  it("should reject revealSeed with wrong seed", async () => {
    const board = [0, 1, 0];
    const seed = 111;
    const wrongSeed = 222;
    const commitHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "address", "uint8"],
        [seed, signers.alice.address, board.length]
      )
    );
    const { encryptedTiles, proof } = await encryptBoard(
      board,
      minesAddress,
      signers.alice.address
    );
    const receipt = await (
      await mines
        .connect(signers.alice)
        .createGame(encryptedTiles, proof, commitHash, board.length)
    ).wait();
    const gameId = receipt?.logs.find((l) => l.fragment?.name === "GameCreated")
      ?.args?.[0];

    await mines.connect(signers.alice).pickTile(gameId, 0);
    await mines.connect(signers.alice).endGame(gameId);

    await expect(
      mines.connect(signers.alice).revealSeed(gameId, wrongSeed)
    ).to.be.revertedWith("Commit mismatch");
  });
});
