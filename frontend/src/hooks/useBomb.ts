// hooks/useBomb.ts
import { useState } from "react";
import { ethers } from "ethers";
import { createGame } from "../services/contract";
import ConfidentialBombAbi from "../abi/ConfidentialBomb.json";
import { getErrorMessage } from "../errors";

// Game config
const ROWS = 3;
const COLS = 3;
const TOTAL_TILES = ROWS * COLS;
const BOMB_COUNT = 2;

// Hook to manage game state and logic
export function useBomb(account: string | null) {
  const [gameId, setGameId] = useState<number | null>(null);
  const [board, setBoard] = useState<number[][]>([]);
  const [seed, setSeed] = useState<number>(0);

  const [isActive, setIsActive] = useState(false);
  const [canPick, setCanPick] = useState(false);

  const [state, setState] = useState({ safeCount: 0, boom: false });
  const [openedTiles, setOpenedTiles] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  const [proofJson, setProofJson] = useState<any | null>(null);
  const [statusMsg, setStatusMsg] = useState("");

  // Loading steps
  const [loadingStep, setLoadingStep] = useState<
    "" | "encrypt" | "confirm" | "onchain"
  >("");
  const [progress, setProgress] = useState(0);

  // Generate board
  const generateBoard = () => {
    const out: number[][] = Array.from({ length: ROWS }, () =>
      Array(COLS).fill(0)
    );
    const bombPositions = new Set<number>();
    while (bombPositions.size < BOMB_COUNT) {
      bombPositions.add(Math.floor(Math.random() * TOTAL_TILES));
    }
    bombPositions.forEach((pos) => {
      const r = Math.floor(pos / COLS);
      const c = pos % COLS;
      out[r][c] = 1;
    });
    return out;
  };

  // Start game
  const startGame = async () => {
    if (!account) return setStatusMsg("⚠️ Please connect your wallet");

    const newSeed = Math.floor(Math.random() * 1_000_000);
    const newBoard = generateBoard();

    setSeed(newSeed);
    setBoard(newBoard);
    setState({ safeCount: 0, boom: false });
    setIsActive(true);
    setCanPick(false);
    setOpenedTiles(new Set());
    setShowAll(false);
    setProofJson(null);

    // Encrypt loading bar
    setLoadingStep("encrypt");
    setStatusMsg("🔐 Encrypting board...");
    setProgress(0);

    const totalTime = 10000;
    const start = Date.now();
    const timer = setInterval(() => {
      const pct = Math.min(
        100,
        Math.floor(((Date.now() - start) / totalTime) * 100)
      );
      setProgress(pct);
      if (pct === 100) clearInterval(timer);
    }, 200);

    try {
      const tx = await createGame(newBoard.flat(), newSeed);
      clearInterval(timer);

      setLoadingStep("confirm");
      setStatusMsg("🦊 Confirm transaction...");

      setLoadingStep("onchain");
      setStatusMsg("⏳ Waiting for confirmation...");

      const receipt = await tx.wait();
      // Parse GameCreated event to get gameId
      const iface = new ethers.Interface(ConfidentialBombAbi.abi);
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog(log);
          if (parsed?.name === "GameCreated") {
            setGameId(Number(parsed.args[0]));
            break;
          }
        } catch {}
      }

      setCanPick(true);
      setStatusMsg("✅ Game created! Pick any tile.");
    } catch (err: any) {
      clearInterval(timer);
      setStatusMsg(getErrorMessage(err.message || "UNKNOWN_ERROR"));
      setIsActive(false);
    } finally {
      setLoadingStep("");
    }
  };

  // Pick tile
  const pickTile = (row: number, col: number) => {
    if (!isActive || !canPick || state.boom) return;

    const key = `${row}-${col}`;
    if (openedTiles.has(key)) return;

    const newOpened = new Set(openedTiles);
    newOpened.add(key);
    setOpenedTiles(newOpened);

    const cell = board[row][col];
    if (cell === 1) {
      setIsActive(false);
      setCanPick(false);
      setState({ ...state, boom: true });
      setShowAll(true);
      setStatusMsg("💥 BOOM! You hit a bomb.");
      setProofJson({
        board: board.flat(),
        seed,
        player: account,
        boardSize: TOTAL_TILES,
      });
    } else {
      const newSafe = state.safeCount + 1;
      setState({ safeCount: newSafe, boom: false });
      // Check win condition
      if (newSafe === TOTAL_TILES - BOMB_COUNT) {
        setIsActive(false);
        setCanPick(false);
        setShowAll(true);
        setStatusMsg("🏆 You cleared all safe tiles!");
        setProofJson({
          board: board.flat(),
          seed,
          player: account,
          boardSize: TOTAL_TILES,
        });
      }
    }
  };

  return {
    gameId,
    board,
    state,
    openedTiles,
    showAll,
    proofJson,
    statusMsg,
    isActive,
    canPick,
    startGame,
    pickTile,
    loadingStep,
    progress,
  };
}
