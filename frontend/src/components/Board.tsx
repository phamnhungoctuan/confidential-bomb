// components/Board.tsx
type Props = {
  board: number[][];
  openedTiles: Set<string>;
  showAll: boolean;
  state: { boom: boolean };
  canPick: boolean;
  isActive: boolean;
  onPick: (r: number, c: number) => void;
};

//  Board component to display the game board
export function Board({
  board,
  openedTiles,
  showAll,
  state,
  canPick,
  isActive,
  onPick,
}: Props) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${board[0]?.length || 0}, 1fr)`,
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
              bg = "#c0392b"; // bomb
              content = "💣";
            } else {
              bg = "#27ae60"; // safe
            }
          }

          return (
            <div
              key={key}
              onClick={() => onPick(r, c)}
              style={{
                aspectRatio: "1/1",
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
                  !opened && canPick && !state.boom
                    ? "pulse 1.5s infinite"
                    : "none",
                transition: "background 0.2s ease",
              }}
            >
              {content}
            </div>
          );
        })
      )}
    </div>
  );
}
