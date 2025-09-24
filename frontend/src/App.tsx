// App.tsx
import { useBomb } from "./hooks/useBomb";
import { useVerify } from "./hooks/useVerify";
import { Board } from "./components/Board";
import { Footer } from "./components/Footer";
import { VerifyModal } from "./components/VerifyModal";
import { useWallet } from "./services/wallet";

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
  const { address, isConnected, connectWallet, disconnectWallet } = useWallet();
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
  } = useBomb(address);

  const {
    showVerifyModal,
    setShowVerifyModal,
    verifyLoading,
    verifyHtml,
    verifyStep,
    openVerify,
  } = useVerify(unpackBoard);

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
         {isConnected ? (
            <>
              <p>✅ Connected: {shortAddr(address!)}</p>
              <button onClick={disconnectWallet}>Disconnect</button>
            </>
          ) : (
            <button onClick={connectWallet}>Connect Wallet</button>
          )}
          {isConnected && !isActive && !proofJson && (
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
                address && openVerify(gameId, address, TOTAL_TILES, COLS)
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

      <Footer />
    </div>
  );
}
