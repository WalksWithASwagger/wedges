import { cases } from "../tests/fixtures/visual/cases";
import { createVisualRunner, LIMITS, MODEL, prepareVisualInput, runVisualExperiment } from "../lib/visual-critique-experiment";

async function main() {
  const args = process.argv.slice(2);
  const live = args.includes("--live");
  if (args.some((arg) => !["--live", "--offline", "--confirm-budget-usd=0.25", `--docs-verified=${new Date().toISOString().slice(0,10)}`].includes(arg)) || (live && args.includes("--offline"))) throw new Error("Invalid evaluation flags");
  console.log(JSON.stringify({ mode: live ? "live" : "offline", model: MODEL, maximumCalls: LIMITS.calls, outputTokensPerCall: LIMITS.outputTokens, retries: 0, timeoutMs: LIMITS.timeoutMs, estimatedSpendCeilingUSD: 0.25, semanticGate: "UNVERIFIED" }));
  const prepared = cases.map((fixture) => ({ ...fixture, bytes: prepareVisualInput(fixture.input).bytes }));
  if (!live) {
    for (const fixture of prepared) console.log(JSON.stringify({ fixture: fixture.name, encodedInputBytes: fixture.bytes, assets: fixture.input.assets.length, review: fixture.review }));
    console.log("PASS offline payload preflight. Live calls: 0. Semantic gate: NOT RUN; #22 remains blocked.");
    return;
  }
  if (!args.includes("--confirm-budget-usd=0.25") || !args.includes(`--docs-verified=${new Date().toISOString().slice(0,10)}`)) throw new Error("Live evaluation requires approved spend and today's official documentation recheck flags");
  const runner = createVisualRunner(process.env.ANTHROPIC_API_KEY, fetch, (usage) => console.log(JSON.stringify({ usage })));
  for (const fixture of prepared) {
    const started = performance.now();
    try {
      const result = await runVisualExperiment(fixture.input, runner);
      console.log(JSON.stringify({ fixture: fixture.name, latencyMs: Math.round(performance.now() - started), result, review: fixture.review }));
    } catch {
      console.log(JSON.stringify({ fixture: fixture.name, latencyMs: Math.round(performance.now() - started), failure: "Request failed or response rejected; inspect privately before sharing. Usage may be billed even without returned usage." }));
      process.exitCode = 1;
    }
  }
  console.log("Human review required. No semantic pass inferred from valid IDs/quotes; #22 remains blocked.");
}
main().catch(() => {
  console.error("Evaluation stopped. Check flags, credentials and documented input limits; no raw upstream error is logged.");
  process.exitCode = 1;
});
