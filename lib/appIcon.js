import { readFileSync } from "node:fs";
import { join } from "node:path";

// App / home-screen icon: IVP mark on white with a gold underline.
// `pad` keeps the mark inside the maskable safe zone.
const mark = `data:image/png;base64,${readFileSync(join(process.cwd(), "public/logo-mark.png")).toString("base64")}`;

export function AppIcon({ size, pad = 0.22 }) {
  const w = Math.round(size * (1 - pad * 2));
  const h = Math.round((w * 216) / 281);
  return (
    <div style={{ width: size, height: size, background: "#ffffff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- rendered by ImageResponse, not the browser */}
      <img src={mark} width={w} height={h} alt="" />
      <div style={{ width: Math.round(w * 0.35), height: Math.max(2, Math.round(size * 0.025)), background: "#f2ce72", marginTop: Math.round(size * 0.05) }} />
    </div>
  );
}
