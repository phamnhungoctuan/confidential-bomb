// components/VerifyModal.tsx
type VerifyModalProps = {
  show: boolean;
  loading: boolean;
  step: "" | "fetch" | "sign" | "decrypt" | "done";
  html: string | null;
  onClose: () => void;
};

// Modal component to show verification progress and results
export function VerifyModal({ show, loading, step, html, onClose }: VerifyModalProps) {
  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: "#111",
          color: "#eee",
          padding: 24,
          borderRadius: 12,
          minWidth: 320,
          maxWidth: "90%",
          textAlign: "center",
        }}
      >
        <h2>🔎 Verifying Game</h2>

        {loading && (
          <div>
            {step === "fetch" && <p>📡 Fetching ciphertexts…</p>}
            {step === "sign" && <p>🦊 Waiting for signature…</p>}
            {step === "decrypt" && <p>🔑 Decrypting board with FHEVM technology...</p>}
          </div>
        )}

        {!loading && html && (
          <div
            style={{ marginTop: 16 }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}

        <button
          onClick={onClose}
          style={{
            marginTop: 20,
            padding: "8px 16px",
            background: "#333",
            borderRadius: 6,
            cursor: "pointer",
            color: "#fff",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
