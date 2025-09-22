// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {
  FHE,
  euint32,
  ebool,
  externalEuint32
} from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title ConfidentialBomb (Ciphertext Mode)
/// @notice A Minesweeper-style game that stores the board encrypted on-chain.
/// @dev Warning: Storing ciphertext is significantly more expensive than commit–reveal.
contract ConfidentialBomb is SepoliaConfig {
    enum State { Active, Ended }

    struct Game {
        address player;
        uint8 boardSize;       // e.g., 9 for a 3x3 board
        euint32[] board;       // 0 = safe, 1 = bomb (encrypted)
        bytes32 commitHash;    // keccak256(seed, player, boardSize)
        uint32 openedCount;    // how many tiles were opened (non-sensitive)
        State state;
    }

    uint256 public gameCounter;
    mapping(uint256 => Game) public games;

    // Bitmap to mark opened tiles (supports up to 256 tiles)
    mapping(uint256 => uint256) private _openedMask;

    // -------- Events --------

    event GameCreated(
        uint256 indexed gameId,
        address indexed player,
        uint8 boardSize,
        bytes32 commitHash
    );

    /// Emit ciphertext of isBomb (off-chain can decrypt if authorized)
    event TilePicked(
        uint256 indexed gameId,
        uint8 index,
        bytes isBombCiphertext,
        uint32 openedCount
    );

    event GameEnded(uint256 indexed gameId);
    event SeedRevealed(uint256 indexed gameId, uint256 seed);
    event GameRevealed(uint256 indexed gameId, uint32[] plainBoard);

    // -------- Create --------

    /// @notice Create a new game with an encrypted board
    /// @param encryptedTiles   ciphertext handles from SDK
    /// @param proof            batch proof from SDK
    /// @param commitHash       keccak256(seed, msg.sender, boardSize)
    /// @param boardSize        must match encryptedTiles.length
    function createGame(
        externalEuint32[] calldata encryptedTiles,
        bytes calldata proof,
        bytes32 commitHash,
        uint8 boardSize
    ) external returns (uint256 gameId) {
        require(boardSize > 0, "Invalid board size");
        require(encryptedTiles.length == boardSize, "Board size mismatch");
        require(commitHash != bytes32(0), "Empty commit");

        euint32[] memory board = new euint32[](boardSize);
        for (uint256 i = 0; i < boardSize; i++) {
            euint32 tile = FHE.fromExternal(encryptedTiles[i], proof);
            // Allow contract to compute with this ciphertext
            FHE.allowThis(tile);
            // Allow player to decrypt later (reveal/verify off-chain)
            FHE.allow(tile, msg.sender);
            board[i] = tile;
        }

        gameId = ++gameCounter;
        games[gameId] = Game({
            player: msg.sender,
            boardSize: boardSize,
            board: board,
            commitHash: commitHash,
            openedCount: 0,
            state: State.Active
        });

        _openedMask[gameId] = 0;
        emit GameCreated(gameId, msg.sender, boardSize, commitHash);
    }

    // -------- Play --------

    /// @notice Open a tile; emit ciphertext of isBomb as raw bytes.
    function pickTile(uint256 gameId, uint8 index) external {
        Game storage g = games[gameId];
        require(g.state == State.Active, "Game ended");
        require(msg.sender == g.player, "Not your game");
        require(index < g.boardSize, "Bad index");

        uint256 mask = _openedMask[gameId];
        uint256 bit = (1 << index);
        require(mask & bit == 0, "Already opened");
        _openedMask[gameId] = mask | bit;

        euint32 tile = g.board[index];
        ebool isBomb = FHE.eq(tile, FHE.asEuint32(1));

        g.openedCount += 1;

        // Encode the encrypted boolean as bytes so it can be logged
        bytes memory isBombCipher = abi.encode(isBomb);
        emit TilePicked(gameId, index, isBombCipher, g.openedCount);
    }

    /// @notice End the game (after bomb hit or quit).
    function endGame(uint256 gameId) external {
        Game storage g = games[gameId];
        require(msg.sender == g.player, "Not your game");
        require(g.state == State.Active, "Already ended");
        g.state = State.Ended;
        emit GameEnded(gameId);
    }

    // -------- Provably-Fair Reveal --------

    /// @notice Reveal the seed to prove commit validity.
    function revealSeed(uint256 gameId, uint256 seed) external {
        Game storage g = games[gameId];
        require(msg.sender == g.player, "Not your game");
        require(g.state == State.Ended, "End first");

        bytes32 expected = keccak256(abi.encode(seed, g.player, g.boardSize));
        require(expected == g.commitHash, "Commit mismatch");

        emit SeedRevealed(gameId, seed);
    }

    /// @notice (Optional) Reveal plaintext board for off-chain verification.
    function revealGame(uint256 gameId, uint32[] calldata plainBoard) external {
        Game storage g = games[gameId];
        require(msg.sender == g.player, "Not your game");
        require(g.state == State.Ended, "End first");
        require(plainBoard.length == g.boardSize, "Size mismatch");
        emit GameRevealed(gameId, plainBoard);
    }

    // -------- Views --------

    function getState(uint256 gameId) external view returns (State) {
        return games[gameId].state;
    }

    function getBoardSize(uint256 gameId) external view returns (uint8) {
        return games[gameId].boardSize;
    }

    function getOpenedCount(uint256 gameId) external view returns (uint32) {
        return games[gameId].openedCount;
    }

    function getCommit(uint256 gameId) external view returns (bytes32) {
        return games[gameId].commitHash;
    }

    function isOpened(uint256 gameId, uint8 index) external view returns (bool) {
        return (_openedMask[gameId] & (1 << index)) != 0;
    }

    /// @notice Query an encrypted tile (for off-chain decryption if authorized)
    function getEncryptedTile(uint256 gameId, uint256 index) external view returns (euint32) {
        Game storage g = games[gameId];
        require(index < g.boardSize, "Bad index");
        return g.board[index];
    }

    function getEncryptedBoardLength(uint256 gameId) external view returns (uint256) {
        return games[gameId].board.length;
    }
}
