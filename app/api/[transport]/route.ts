import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { CATALOG } from "@/lib/catalog";
import { runMirrorBooth, MAX_PARAGRAPH_CHARS } from "@/lib/exercises/mirror-booth";
import { runTasteAudit, MAX_IMAGES } from "@/lib/exercises/taste-audit";
import {
  SELECTOR_TAGS,
  buildSelectorProfile,
  presentableRounds,
  unknownChoiceRefs,
  type SelectorTagId,
} from "@/lib/selector-pressure";
import { KK_SEED_LIST, structureIrreducibles } from "@/lib/irreducibles";
import { buildProfileArtifact, type ProfileInput } from "@/lib/profile";
import { toolError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const TAG_IDS = SELECTOR_TAGS.map((t) => t.id) as [SelectorTagId, ...SelectorTagId[]];

/** Warm-instance best-effort cache for the `wedges://profile` resource. The
 *  authoritative copy is always the text returned by export_profile — nothing
 *  is persisted across instances (transient by design). */
let lastProfileMarkdown: string | null = null;

const json = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
});

const rateLimited = (retryAfterSeconds: number) => ({
  isError: true,
  content: [
    {
      type: "text" as const,
      text: `[rate_limited] Too many requests. Retry in ${retryAfterSeconds}s, or pass your own anthropic_api_key for a higher limit.`,
    },
  ],
});

/** Headers from the incoming HTTP request, when the transport exposes them. */
type Extra = { requestInfo?: { headers?: Record<string, string | string[] | undefined> } };

const FLOW = [
  "Wedges extracts a person's creative taste from the Both Hands Full exercises and hands it to you as a portable profile, so you serve their work without flattening it. Run the steps WITH the user — ask, collect their real answers, don't invent them. Skip any step they don't have input for.",
  "",
  "1. mirror_booth — ask for a paragraph in their own voice; returns which specifics to preserve and which the machine would flatten.",
  "",
  "2. taste_audit — for images of their work, READ THE LOCAL FILES and pass them as base64 ({ data, mediaType }), not URLs (URLs usually fail — robots.txt / hotlink blocks). Up to 12. Skip if no images.",
  "",
  "3. selector_pressure_test — first call get_pressure_rounds, present each round's prompt + its choices to the user, collect which choiceId they'd ship per round (and optionally up to 3 declaredTags they think they select for), then pass the picks. Returns a deterministic taste profile.",
  "",
  "4. name_irreducibles — ask what they refuse to outsource: the things AI can't eat.",
  "",
  "5. The three documents — interview them, then pass as export_profile `documents`:",
  "   • style guide: three sentences from their past work that sound most like them; three patterns they'd cut from someone else's work; a one-line tagline for their voice.",
  "   • worldview: five things they believe about how good work gets made; three things they refuse to do even if asked; why these — what they'd lose without them.",
  "   • glossary: words/phrases they use and what they mean; words/phrases they avoid and why.",
  "",
  "6. export_profile — pass everything you gathered; receive the portable taste profile (markdown + JSON). Save the markdown as a file the user keeps and can load into any agent.",
  "",
  "LLM tools (mirror_booth, taste_audit) use the server's Anthropic key by default; pass anthropic_api_key to use the user's own. Nothing is stored server-side.",
].join("\n");

const handler = createMcpHandler(
  (server) => {
    // ---- Prompt: onboarding entry point ----
    server.registerPrompt(
      "start_wedges",
      {
        title: "Start Wedges",
        description: "The Both Hands Full taste-extraction flow. Run this first.",
      },
      () => ({
        messages: [{ role: "user", content: { type: "text", text: FLOW } }],
      }),
    );

    // ---- Resources ----
    server.registerResource(
      "catalog",
      "wedges://catalog",
      {
        title: "Wedges exercise catalog",
        description: "The Both Hands Full exercises exposed by Wedges.",
        mimeType: "application/json",
      },
      async (uri) => ({
        contents: [
          { uri: uri.href, mimeType: "application/json", text: JSON.stringify(CATALOG, null, 2) },
        ],
      }),
    );

    server.registerResource(
      "profile",
      "wedges://profile",
      {
        title: "Last exported taste profile",
        description:
          "The most recent profile exported on this server instance (transient; not persisted).",
        mimeType: "text/markdown",
      },
      async (uri) => ({
        contents: [
          {
            uri: uri.href,
            mimeType: "text/markdown",
            text: lastProfileMarkdown ?? "No profile exported yet. Run export_profile first.",
          },
        ],
      }),
    );

    server.registerResource(
      "pressure-rounds",
      "wedges://pressure-rounds",
      {
        title: "Selector Pressure rounds",
        description:
          "The 10 rounds (prompt + choices) to present to the user before selector_pressure_test.",
        mimeType: "application/json",
      },
      async (uri) => ({
        contents: [
          { uri: uri.href, mimeType: "application/json", text: JSON.stringify(presentableRounds(), null, 2) },
        ],
      }),
    );

    // ---- Tools ----
    server.registerTool(
      "list_exercises",
      {
        title: "List exercises",
        description: "The Both Hands Full exercises Wedges exposes, and which tool runs each.",
        inputSchema: {},
      },
      async () => json(CATALOG),
    );

    server.registerTool(
      "get_pressure_rounds",
      {
        title: "Get Pressure Rounds",
        description:
          "The 10 Selector Pressure rounds — each with its prompt and four choices (choiceId + title + the output text). Present these to the user, collect one choiceId per round, then call selector_pressure_test. Also returns the declaredTags vocabulary.",
        inputSchema: {},
      },
      async () => json(presentableRounds()),
    );

    server.registerTool(
      "mirror_booth",
      {
        title: "Mirror Booth",
        description:
          "Voice-drift analysis. Give a paragraph in the user's voice; returns a flattened mirror plus which specifics to preserve and which got sanded down. Requires an Anthropic key (server env or anthropic_api_key arg).",
        inputSchema: {
          paragraph: z.string().min(40).max(MAX_PARAGRAPH_CHARS),
          context: z.string().max(500).optional(),
          anthropic_api_key: z.string().optional(),
        },
      },
      async ({ paragraph, context, anthropic_api_key }, extra) => {
        const limit = checkRateLimit("mirror_booth", (extra as Extra)?.requestInfo?.headers, anthropic_api_key);
        if (!limit.allowed) return rateLimited(limit.retryAfterSeconds);
        try {
          return json(await runMirrorBooth({ paragraph, context, apiKey: anthropic_api_key }));
        } catch (err) {
          return toolError(err);
        }
      },
    );

    server.registerTool(
      "taste_audit",
      {
        title: "Taste Audit",
        description:
          "Visual taste analysis of 1–12 images of the user's work; returns recurring themes, palette, composition, voice, and anti-patterns. PREFER base64: read the local image file and pass { data: <base64>, mediaType: 'image/jpeg' }. URLs are a fallback and often fail (Anthropic fetches them server-side; many hosts block it via robots.txt / hotlink protection). Requires an Anthropic key (server env or anthropic_api_key arg).",
        inputSchema: {
          images: z
            .array(
              z.object({
                data: z.string().optional(),
                mediaType: z.string().optional(),
                url: z.string().optional(),
                alt: z.string().optional(),
              }),
            )
            .min(1)
            .max(MAX_IMAGES),
          notes: z.string().optional(),
          anthropic_api_key: z.string().optional(),
        },
      },
      async ({ images, notes, anthropic_api_key }, extra) => {
        const limit = checkRateLimit("taste_audit", (extra as Extra)?.requestInfo?.headers, anthropic_api_key);
        if (!limit.allowed) return rateLimited(limit.retryAfterSeconds);
        try {
          return json(await runTasteAudit({ images, notes, apiKey: anthropic_api_key }));
        } catch (err) {
          return toolError(err);
        }
      },
    );

    server.registerTool(
      "selector_pressure_test",
      {
        title: "Selector Pressure Test",
        description:
          "Deterministic taste profile (no LLM). First call get_pressure_rounds for the valid roundId/choiceId values. Pass the user's choices (roundId + choiceId + optional why) and optionally up to 3 declaredTags. Returns chosen/rejected tag profile, consistency score, and contradictions.",
        inputSchema: {
          choices: z
            .array(
              z.object({
                roundId: z.string(),
                choiceId: z.string(),
                why: z.string().optional(),
              }),
            )
            .min(1),
          declaredTags: z.array(z.enum(TAG_IDS)).max(3).optional(),
        },
      },
      async ({ choices, declaredTags }) => {
        const unknown = unknownChoiceRefs(choices);
        if (unknown.length) {
          return {
            isError: true,
            content: [
              {
                type: "text" as const,
                text: `[invalid_input] Unknown round/choice ids: ${unknown.join(", ")}. Call get_pressure_rounds for the valid ids — don't guess.`,
              },
            ],
          };
        }
        const selections = choices.map((c) => ({
          roundId: c.roundId,
          choiceId: c.choiceId,
          why: c.why ?? "",
        }));
        return json(buildSelectorProfile(selections, declaredTags ?? []));
      },
    );

    server.registerTool(
      "name_irreducibles",
      {
        title: "Name Irreducibles",
        description:
          "Structure the user's irreducible list — the things AI can't eat, that they refuse to outsource. Kris's reference list is included for inspiration; collect the user's own.",
        inputSchema: {
          items: z.array(z.string()).min(1),
          whyTheseStay: z.string().optional(),
        },
      },
      async ({ items, whyTheseStay }) =>
        json({ ...structureIrreducibles({ items, whyTheseStay }), reference: KK_SEED_LIST }),
    );

    server.registerTool(
      "export_profile",
      {
        title: "Export Taste Profile",
        description:
          "Assemble the portable taste profile from everything gathered. Pass the raw result objects from the other tools plus the three-documents content you collected. Returns markdown + JSON for the user to save.",
        inputSchema: {
          owner: z.string().optional(),
          mirror: z.unknown().optional(),
          taste: z.unknown().optional(),
          pressure: z.unknown().optional(),
          irreducibles: z
            .object({ items: z.array(z.string()), whyTheseStay: z.string().optional() })
            .optional(),
          documents: z
            .object({
              styleGuide: z.string().optional(),
              worldview: z.string().optional(),
              glossary: z.string().optional(),
            })
            .optional(),
          notes: z.string().optional(),
        },
      },
      async (args) => {
        try {
          const input = args as unknown as ProfileInput;
          const artifact = buildProfileArtifact({
            owner: input.owner,
            mirror: input.mirror,
            taste: input.taste,
            pressure: input.pressure,
            irreducibles: input.irreducibles
              ? structureIrreducibles(input.irreducibles)
              : undefined,
            documents: input.documents,
            notes: input.notes,
          });
          lastProfileMarkdown = artifact.markdown;
          return {
            content: [
              { type: "text" as const, text: artifact.markdown },
              { type: "text" as const, text: JSON.stringify(artifact.json) },
            ],
          };
        } catch (err) {
          return toolError(err);
        }
      },
    );
  },
  {},
  { basePath: "/api", maxDuration: 60, verboseLogs: process.env.NODE_ENV !== "production" },
);

export { handler as GET, handler as POST, handler as DELETE };
