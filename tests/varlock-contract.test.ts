import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const ROOT = new URL("..", import.meta.url);

test("schema imports shared keys by pick and the wedges values file by path", () => {
  const schema = readFileSync(new URL(".env.schema", ROOT), "utf8");
  const shared = schema.match(
    /# @import\((~\/.agents\/env\/values\/\.env\.shared\.local), pick=\[([A-Z0-9_, ]+)\], allowMissing=true\)/,
  );
  assert.ok(shared, "shared values import must stay pick-restricted");
  assert.equal(shared?.[1], "~/.agents/env/values/.env.shared.local");
  assert.equal(shared?.[2], "ANTHROPIC_API_KEY");
  assert.match(
    schema,
    /# @import\(~\/.agents\/env\/values\/\.env\.wedges\.local, allowMissing=true\)/,
  );
  assert.doesNotMatch(
    schema,
    /# @import\(~\/.agents\/env\/values\/\.env\.wedges\.local, pick=\[/,
  );
});

test("local next dev loads through varlock run; build and start stay unwired", () => {
  const packageJson = JSON.parse(readFileSync(new URL("package.json", ROOT), "utf8")) as {
    scripts: Record<string, string>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  assert.match(packageJson.scripts.dev, /varlock run --inject vars --/);
  assert.match(packageJson.scripts.dev, /next dev/);
  assert.doesNotMatch(packageJson.scripts.build, /varlock/);
  assert.doesNotMatch(packageJson.scripts.start, /varlock/);
  assert.ok(!packageJson.dependencies?.["@varlock/nextjs-integration"]);
  assert.ok(!packageJson.devDependencies?.["@varlock/nextjs-integration"]);
});
