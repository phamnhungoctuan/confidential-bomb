export function Footer() {
  return (
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
        🐙 github.com/phamnhungoctuan
      </a>
    </footer>
  );
}
