"use client";

import { useState } from "react";

const ENDPOINT = "https://wedges.dev/api/mcp";

const TABS = [
  {
    id: "claude-code",
    label: "Claude Code",
    note: "One line in your terminal:",
    code: `claude mcp add --transport http wedges ${ENDPOINT}`,
  },
  {
    id: "cursor",
    label: "Cursor / Windsurf",
    note: "Drop this in .mcp.json (or the MCP settings panel):",
    code: `{
  "mcpServers": {
    "wedges": { "type": "http", "url": "${ENDPOINT}" }
  }
}`,
  },
  {
    id: "chatgpt",
    label: "ChatGPT",
    note: "Settings → Connectors → Developer mode → Add. Paste the URL:",
    code: ENDPOINT,
  },
  {
    id: "raw",
    label: "Anything else",
    note: "Any MCP client over Streamable HTTP. The endpoint:",
    code: ENDPOINT,
  },
] as const;

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        } catch {
          /* clipboard blocked — no-op */
        }
      }}
      aria-label="Copy to clipboard"
      className={`kicker shrink-0 border-2 px-3 py-1.5 ${
        copied
          ? "border-blood bg-blood text-paper"
          : "border-paper/30 text-paper/70 hover:border-blood hover:text-paper"
      }`}
    >
      {copied ? "copied ✓" : "copy"}
    </button>
  );
}

export function Connect() {
  const [active, setActive] = useState<(typeof TABS)[number]["id"]>("claude-code");
  const tab = TABS.find((t) => t.id === active)!;

  return (
    <div className="border-2 border-paper/20 bg-black/30">
      {/* tab row */}
      <div className="flex flex-wrap border-b-2 border-paper/20">
        {TABS.map((t) => {
          const on = t.id === active;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActive(t.id)}
              aria-pressed={on}
              className={`kicker border-r-2 border-paper/20 px-4 py-3 ${
                on
                  ? "bg-blood text-paper"
                  : "text-paper/55 hover:bg-paper/5 hover:text-paper"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* body */}
      <div className="p-5 md:p-6">
        <p className="text-paper/60 text-sm mb-4">{tab.note}</p>
        <div className="flex items-stretch gap-3">
          <pre className="min-w-0 grow overflow-x-auto border-l-2 border-blood bg-ink/60 px-4 py-3 text-sm leading-relaxed text-paper">
            <code>
              {tab.id === "claude-code" || tab.id === "chatgpt" || tab.id === "raw" ? (
                <>
                  <span className="text-blood select-none">$ </span>
                  {tab.code}
                </>
              ) : (
                tab.code
              )}
            </code>
          </pre>
          <CopyButton text={tab.code} />
        </div>
        <p className="mt-5 text-paper/55 text-sm">
          Then tell your agent:{" "}
          <span className="text-paper">&ldquo;run the Wedges taste extraction.&rdquo;</span>{" "}
          It self-drives from there.
        </p>
      </div>
    </div>
  );
}
