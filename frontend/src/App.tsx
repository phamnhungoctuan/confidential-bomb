// App.tsx
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { createGame } from "./hooks/useBombs";
import ConfidentialBombAbi from "./abi/ConfidentialBomb.json";
import { getErrorMessage } from "./errors";

const ROWS = 3;
const COLS = 3;
const TOTAL_TILES = ROWS * COLS;
const BOMB_COUNT = 2; // 🔥 Chỉ còn 2 bom

let VERIFY_SERVER = import.meta.env.VITE_VERIFY_SERVER as string;
if (!VERIFY_SERVER) {
  VERIFY_SERVER = "https://confidential-bomb-verify.vercel.app/verify";
}

function generateBoard(): number[][] {
  const out: number[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
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
}

function shortAddr(addr: string) {
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

function openVerify(gameId: number, proof: any) {
  const win = window.open("", "_blank");
  fetch(VERIFY_SERVER, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gameId, proofJson: proof }),
  })
    .then((res) => res.text())
    .then((html) => win && win.document.write(html))
    .catch(
      (err) => win && win.document.write(`<p style="color:red">Error: ${err.message}</p>`)
    );
}

export default function App() {
  const [account, setAccount] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState<"" | "encrypt" | "confirm" | "onchain">("");
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");

  const [gameId, setGameId] = useState<number | null>(null);
  const [board, setBoard] = useState<number[][]>([]);
  const [seed, setSeed] = useState<number>(0);

  const [isActive, setIsActive] = useState(false);
  const [canPick, setCanPick] = useState(false);

  const [state, setState] = useState({ safeCount: 0, boom: false });
  const [openedTiles, setOpenedTiles] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  const [proofJson, setProofJson] = useState<any | null>(null);

  useEffect(() => {
    (async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: "eth_accounts" });
          if (accounts && accounts.length > 0) setAccount(accounts[0]);
        } catch {}
      }
    })();
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) return alert("⚠️ MetaMask not detected");
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      if (accounts && accounts.length > 0) setAccount(accounts[0]);
    } catch (err) {
      console.error("Connect failed:", err);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setGameId(null);
    setIsActive(false);
    setCanPick(false);
    setProofJson(null);
  };

  const handleStart = async () => {
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

    setLoadingStep("encrypt");
    setStatusMsg("🔐 Encrypting board...");

    setProgress(0);
    const totalTime = 4000;
    const start = Date.now();
    const timer = setInterval(() => {
      const pct = Math.min(100, Math.floor(((Date.now() - start) / totalTime) * 100));
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
    } catch (err) {
      console.error("createGame failed:", err);
      setStatusMsg(getErrorMessage((err as any).message || "UNKNOWN_ERROR"));
      setIsActive(false);
    } finally {
      setLoadingStep("");
    }
  };

  const handlePick = (row: number, col: number) => {
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
      setProofJson({ board: board.flat(), seed, player: account, boardSize: TOTAL_TILES });
    } else {
      const newSafe = state.safeCount + 1;
      setState({ safeCount: newSafe, boom: false });
      if (newSafe === TOTAL_TILES - BOMB_COUNT) {
        setIsActive(false);
        setCanPick(false);
        setShowAll(true);
        setStatusMsg("🏆 You cleared all 7 safe tiles!");
        setProofJson({ board: board.flat(), seed, player: account, boardSize: TOTAL_TILES });
      }
    }
  };

  return (
    <div style={{ background: "#0d0d0d", color: "white", minHeight: "100vh", padding: 24 }}>
      <div style={{ textAlign: "center", maxWidth: 500, margin: "0 auto" }}>
        <h1 style={{ fontSize: 42, margin: "12px 0" }}>💣 Confidential Bomb 💣</h1>

        <div style={{ marginTop: 16 }}>
          {!account ? (
            <button onClick={connectWallet}>🦊 Connect Wallet</button>
          ) : (
            <button onClick={disconnectWallet}>{shortAddr(account)} (Disconnect)</button>
          )}
          {!isActive && !proofJson && (
            <button onClick={handleStart} style={{ marginLeft: 12 }}>
              ⚡ Start Game
            </button>
          )}
        </div>

        {/* 💡 Chú thích gameplay */}
        {!isActive && !proofJson && (
          <p style={{ marginTop: 12, fontSize: 14, color: "#aaa" }}>
            💡 Tip: There are <b>{BOMB_COUNT} bombs</b>. Open all{" "}
            <b>{TOTAL_TILES - BOMB_COUNT} safe tiles</b> to win!
          </p>
        )}

        {loadingStep && (
          <div style={{ marginTop: 16 }}>
            {loadingStep === "encrypt" && (
              <progress value={progress} max={100} style={{ width: "60%" }} />
            )}
            <p>{statusMsg}</p>
          </div>
        )}
        {!loadingStep && statusMsg && <p style={{ marginTop: 16 }}>{statusMsg}</p>}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${COLS}, 1fr)`,
            gap: 6,
            marginTop: 24,
          }}
        >
          {board.map((row, r) =>
            row.map((cell, c) => {
              const key = `${r}-${c}`;
              const opened = openedTiles.has(key) || showAll;
              let bg = "#333";
              let content = "";
              if (opened) {
                if (cell === 1) {
                  bg = "#c0392b";
                  content = "💣";
                } else {
                  bg = "#27ae60";
                  content = "";
                }
              }
              return (
                <div
                  key={key}
                  onClick={() => handlePick(r, c)}
                  style={{
                    aspectRatio: "1/1",
                    width: "100%",
                    background: bg,
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 28,
                    cursor:
                      opened || state.boom || !isActive || !canPick
                        ? "not-allowed"
                        : "pointer",
                    userSelect: "none",
                    boxShadow: opened
                      ? "0 0 6px rgba(255,255,255,0.3)"
                      : "inset 0 0 6px #000",
                    animation:
                      !opened && canPick && !state.boom ? "pulse 1.5s infinite" : "none",
                  }}
                >
                  {content}
                </div>
              );
            })
          )}
        </div>

        {!isActive && proofJson && gameId && (
          <div style={{ marginTop: 20 }}>
            <button onClick={handleStart}>🔄 New Game</button>
            <button
              onClick={() => openVerify(gameId, proofJson)}
              style={{ marginLeft: 12 }}
            >
              🔎 Verify Fairness
            </button>
          </div>
        )}
      </div>

      <footer
        style={{
          marginTop: 40,
          textAlign: "center",
          fontSize: 14,
          color: "#888",
          padding: "20px 0",
          borderTop: "1px solid #333",
        }}
      >
        <p style={{ margin: "6px 0" }}>
          Using <strong>FHEVM</strong> technology from{" "}
          <a
            href="https://zama.ai"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#bbb" }}
          >
            ZAMA
          </a>
        </p>
        <a
          href="https://github.com/phamnhungoctuan"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#bbb", textDecoration: "none" }}
        >
          🐙 https://github.com/phamnhungoctuan
        </a>
      </footer>
    </div>
  );
}
