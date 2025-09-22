// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {
  FHE,
  euint64,
  externalEuint64
} from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title ConfidentialBomb (single ciphertext mode)
/// @notice A Minesweeper-style game where the board is packed into one ciphertext (up to 64 tiles).
/// @dev The board is represented as a bitmap. Each bit is 0 = safe, 1 = bomb.
contract ConfidentialBomb is SepoliaConfig {
    enum State { Active, Ended }

    struct Game {
        address player;
        uint8 boardSize;          // number of tiles (max 64)
        euint64 encryptedBoard;   // single ciphertext holding the full board
        bytes32 commitHash;       // keccak256(seed, player, boardSize)
        uint32 openedCount;       // number of tiles opened (non-sensitive info)
        State state;
    }

    uint256 public gameCounter;
    mapping(uint256 => Game) public games;

    // Bitmap of opened tiles (up to 64 bits)
    mapping(uint256 => uint64) private _openedMask;

    // -------- Events --------
    event GameCreated(uint256 indexed gameId, address indexed player, uint8 boardSize, bytes32 commitHash);
    event TilePicked(uint256 indexed gameId, uint8 index, bytes isBombCiphertext, uint32 openedCount);
    event GameEnded(uint256 indexed gameId);
    event SeedRevealed(uint256 indexed gameId, uint256 seed);
    event GameRevealed(uint256 indexed gameId, uint64 plainBoard);

    // -------- Create --------
    /// @notice Creates a new encrypted game board.
    /// @param encryptedBoard Board packed as a single 64-bit ciphertext.
    /// @param proof Input proof provided by the relayer/FHEVM SDK.
    /// @param commitHash Commitment hash: keccak256(seed, player, boardSize).
    /// @param boardSize Number of tiles on the board (max 64).
    function createGame(
        externalEuint64 encryptedBoard,
        bytes calldata proof,
        bytes32 commitHash,
        uint8 boardSize
    ) external returns (uint256 gameId) {
        require(boardSize > 0 && boardSize <= 64, "Board size must be 1-64");
        require(commitHash != bytes32(0), "Empty commit");

        euint64 board = FHE.fromExternal(encryptedBoard, proof);
        FHE.allowThis(board);          // allow this contract to compute on the ciphertext
        FHE.allow(board, msg.sender);  // allow the player to decrypt later

        gameId = ++gameCounter;
        games[gameId] = Game({
            player: msg.sender,
            boardSize: boardSize,
            encryptedBoard: board,
            commitHash: commitHash,
            openedCount: 0,
            state: State.Active
        });

        _openedMask[gameId] = 0;
        emit GameCreated(gameId, msg.sender, boardSize, commitHash);
    }

    // -------- Play --------
    /// @notice Open a tile and emit an encrypted result indicating if it is a bomb.
    function pickTile(uint256 gameId, uint8 index) external {
        Game storage g = games[gameId];
        require(g.state == State.Active, "Game ended");
        require(msg.sender == g.player, "Not your game");
        require(index < g.boardSize, "Invalid index");

        uint64 mask = _openedMask[gameId];
        uint64 bit = uint64(1) << index;
        require(mask & bit == 0, "Already opened");
        _openedMask[gameId] = mask | bit;

        // Extract the bit: (board >> index) & 1
        euint64 shifted = FHE.shr(g.encryptedBoard, index);
        euint64 bitVal = FHE.and(shifted, FHE.asEuint64(1));
        bytes memory isBombCipher = abi.encode(FHE.eq(bitVal, FHE.asEuint64(1)));

        g.openedCount += 1;
        emit TilePicked(gameId, index, isBombCipher, g.openedCount);
    }

    /// @notice End the game manually.
    function endGame(uint256 gameId) external {
        Game storage g = games[gameId];
        require(msg.sender == g.player, "Not your game");
        require(g.state == State.Active, "Already ended");
        g.state = State.Ended;
        emit GameEnded(gameId);
    }

    // -------- Provably-Fair Reveal --------
    /// @notice Reveal the seed used to generate the board.
    function revealSeed(uint256 gameId, uint256 seed) external {
        Game storage g = games[gameId];
        require(msg.sender == g.player, "Not your game");
        require(g.state == State.Ended, "Game must be ended first");

        bytes32 expected = keccak256(abi.encode(seed, g.player, g.boardSize));
        require(expected == g.commitHash, "Commit mismatch");

        emit SeedRevealed(gameId, seed);
    }

    /// @notice Reveal the full plaintext board for verification.
    function revealGame(uint256 gameId, uint64 plainBoard) external {
        Game storage g = games[gameId];
        require(msg.sender == g.player, "Not your game");
        require(g.state == State.Ended, "Game must be ended first");
        emit GameRevealed(gameId, plainBoard);
    }

    // -------- Views --------
    function getState(uint256 gameId) external view returns (State) {
        return games[gameId].state;
    }

    function isOpened(uint256 gameId, uint8 index) external view returns (bool) {
        return (_openedMask[gameId] & (uint64(1) << index)) != 0;
    }

    function getCommit(uint256 gameId) external view returns (bytes32) {
        return games[gameId].commitHash;
    }

    /// @notice Returns the encrypted board (single ciphertext).
    function getEncryptedBoard(uint256 gameId) external view returns (euint64) {
        Game storage g = games[gameId];
        return g.encryptedBoard;
    }
}
