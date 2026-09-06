import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";
import { CritiqueInputSchema, CritiqueResponseSchema, hasValidEvidence, type CritiqueInput } from "@/lib/critique-contract";

const failure = "The review could not be completed. Your work is still here. Retry when you are ready.";
const rateLimited = "Wedges is rate-limited. Wait a minute before trying again. Your work is still here.";
const missingKey = "Critique is unavailable: the server has no model key. You can still edit and export your work.";
const timedOut = "The critique timed out. Your work is still here. Retry when you are ready.";

export async function requestCritique(input: CritiqueInput, endpoint: URL, signal: AbortSignal) {
  const sources = CritiqueInputSchema.parse(input);
  const client = new Client({ name: "wedges-browser-review", version: "1" });
  try {
    await client.connect(new StreamableHTTPClientTransport(endpoint), { signal, timeout: 10_000 });
    const result = CallToolResultSchema.parse(await client.callTool({ name: "critique", arguments: sources }, undefined, { signal, timeout: 50_000 }));
    if (result.isError) {
      const text = JSON.stringify(result.content);
      if (text.includes("[rate_limited]")) throw new Error(rateLimited);
      if (text.includes("[missing_key]")) throw new Error(missingKey);
      if (text.includes("[timeout]")) throw new Error(timedOut);
      throw new Error(failure);
    }
    const text = result.content.find((part) => part.type === "text");
    if (!text || text.type !== "text") throw new Error(failure);
    const critique = CritiqueResponseSchema.parse(JSON.parse(text.text));
    if (!hasValidEvidence(critique, sources)) throw new Error(failure);
    return critique;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    throw new Error([failure, rateLimited, missingKey, timedOut].includes(message) ? message : failure);
  } finally {
    // A transport cleanup error must not replace a safe result or expose a raw payload.
    await client.close().catch(() => undefined);
  }
}
