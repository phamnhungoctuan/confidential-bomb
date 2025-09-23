// App.tsx
import { useState, useEffect } from "react";
import { useBomb } from "./hooks/useBomb";
import { useVerify } from "./hooks/useVerify";
import { Board } from "./components/Board";
import { VerifyModal } from "./components/VerifyModal";

const VERIFY_SERVER =
  import.meta.env.VITE_VERIFY_SERVER ||
  "https://confidential-bomb-verify.vercel.app/api/verify";

// Game config
const ROWS = 3;
const COLS = 3;
const TOTAL_TILES = ROWS * COLS;
const BOMB_COUNT = 2;

// Short address helper
function shortAddr(addr: string | null) {
  if (!addr) return "";
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

// Pack board (array of 0/1) into a single bigint
// Refer: README-coding.md, you can check here for details
function unpackBoard(encoded: bigint, size: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < size; i++) {
    out.push(((encoded >> BigInt(i)) & 1n) === 1n ? 1 : 0);
  }
  return out;
}

export default function App() {
  const [account, setAccount] = useState<string | null>(null);

  const {
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
  } = useBomb(account);

  const {
    showVerifyModal,
    setShowVerifyModal,
    verifyLoading,
    verifyHtml,
    verifyStep,
    openVerify,
  } = useVerify(VERIFY_SERVER, unpackBoard);

  useEffect(() => {
    (async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({
            method: "eth_accounts",
          });
          if (accounts?.length > 0) setAccount(accounts[0]);
        } catch {}
      }
    })();
  }, []);

  // Connect wallet handler
  const connectWallet = async () => {
    if (!window.ethereum) return alert("⚠️ MetaMask not detected");
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });
    if (accounts?.length > 0) setAccount(accounts[0]);
  };

  const disconnectWallet = () => setAccount(null);

  return (
    <div
      style={{
        background: "#0d0d0d",
        color: "white",
        minHeight: "100vh",
        padding: 24,
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 500, margin: "0 auto" }}>
        <h1 style={{ fontSize: 42, margin: "12px 0" }}>💣 Confidential Bomb 💣</h1>

        <div style={{ marginTop: 16 }}>
          {!account ? (
            <button onClick={connectWallet}>🦊 Connect Wallet</button>
          ) : (
            <button onClick={disconnectWallet}>
              {shortAddr(account)} (Disconnect)
            </button>
          )}
          {!isActive && !proofJson && (
            <button onClick={startGame} style={{ marginLeft: 12 }}>
              ⚡ Start Game
            </button>
          )}
        </div>

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

        {board.length > 0 && (
          <Board
            board={board}
            openedTiles={openedTiles}
            showAll={showAll}
            state={state}
            canPick={canPick}
            isActive={isActive}
            onPick={pickTile}
          />
        )}

        {!isActive && proofJson && gameId && (
          <div style={{ marginTop: 20 }}>
            <button onClick={startGame}>🔄 New Game</button>
            <button
              onClick={() =>
                account && openVerify(gameId, account, TOTAL_TILES, COLS)
              }
              style={{ marginLeft: 12 }}
            >
              🔎 Verify Fairness
            </button>
          </div>
        )}
      </div>

      <VerifyModal
        show={showVerifyModal}
        loading={verifyLoading}
        step={verifyStep}
        html={verifyHtml}
        onClose={() => setShowVerifyModal(false)}
      />

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
