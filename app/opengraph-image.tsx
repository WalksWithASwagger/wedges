import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Wedges — your taste is training data no model contains";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#0e0d10";
const PAPER = "#f5f3ec";
const BLOOD = "#e10600";

// Read at build time (static prerender): the repo files are present, so the
// OG PNG is generated once and served as a static asset.
const stardos = readFileSync(join(process.cwd(), "app", "StardosStencil-Bold.ttf"));
const elite = readFileSync(join(process.cwd(), "app", "SpecialElite-Regular.ttf"));

export default async function OG() {

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          background: INK,
          color: PAPER,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          position: "relative",
        }}
      >
        {/* wedge mark, top-right */}
        <svg
          width="104"
          height="104"
          viewBox="0 0 104 104"
          style={{ position: "absolute", top: 64, right: 72 }}
        >
          <path d="M0 0 L0 104 L104 104 Z" fill={BLOOD} />
        </svg>

        <div
          style={{
            display: "flex",
            fontFamily: "Elite",
            fontSize: 24,
            letterSpacing: 8,
            textTransform: "uppercase",
            color: "rgba(245,243,236,0.6)",
          }}
        >
          A remote MCP server
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontFamily: "Stardos",
            fontSize: 96,
            lineHeight: 1.0,
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          <div style={{ display: "flex" }}>Your taste is</div>
          <div style={{ display: "flex" }}>training data</div>
          <div style={{ display: "flex", color: BLOOD }}>no model contains.</div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontFamily: "Elite",
          }}
        >
          <div style={{ display: "flex", fontSize: 30, color: PAPER }}>
            wedges.dev
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 22,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: "rgba(245,243,236,0.55)",
            }}
          >
            the agent edition of Both Hands Full
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Stardos", data: stardos, weight: 700, style: "normal" },
        { name: "Elite", data: elite, weight: 400, style: "normal" },
      ],
    },
  );
}
