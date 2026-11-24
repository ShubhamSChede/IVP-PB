// Shared artwork for generated app icons: a green pickleball on black.
// `pad` keeps the ball inside the maskable safe zone.
export default function AppIconArt({ size, pad = 0.2 }) {
  const ball = Math.round(size * (1 - pad * 2));
  const hole = Math.max(2, Math.round(ball * 0.11));
  const spots = [
    [0.5, 0.2], [0.24, 0.38], [0.76, 0.38], [0.5, 0.5], [0.3, 0.7], [0.7, 0.7], [0.5, 0.84],
  ];
  return (
    <div style={{ width: size, height: size, background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: ball, height: ball, borderRadius: "50%", background: "#4ade80", position: "relative", display: "flex" }}>
        {spots.map(([x, y], i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x * ball - hole / 2,
              top: y * ball - hole / 2,
              width: hole,
              height: hole,
              borderRadius: "50%",
              background: "#063d1c",
            }}
          />
        ))}
      </div>
    </div>
  );
}
