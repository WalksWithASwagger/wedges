import assert from "node:assert/strict";
import test from "node:test";
import { cases } from "./fixtures/visual/cases";
import { assertRequestSize, capCalls, LIMITS, prepareVisualInput, requireLiveKey, runVisualExperiment, validateVisualResponse } from "../lib/visual-critique-experiment";
const input = cases[0].input;
const response = { status: "suggestions", suggestions: [{ assetIds: ["photo-1"], tasteQuote: "Preserve spare compositions", observation: "A red circle sits above a dark rectangle.", suggestion: "Preserve the empty space." }] };

test("every original fixture passes preflight with measured base64 envelope", () => {
  for (const fixture of cases) assert.equal(prepareVisualInput(fixture.input).bytes, Buffer.byteLength(JSON.stringify(fixture.input)));
});
test("rejects malformed, oversized, truncated, corrupt and non-PNG image input", () => {
  const bytes = Buffer.from(input.assets[0].data, "base64");
  const corrupt = Buffer.from(bytes); corrupt[40] ^= 1;
  for (const data of ["%%%", Buffer.from("not an image").toString("base64"), bytes.subarray(0,-1).toString("base64"), corrupt.toString("base64"), Buffer.alloc(LIMITS.imageBytes+1).toString("base64")]) {
    assert.throws(() => prepareVisualInput({ ...input, assets: [{ ...input.assets[0], data }] }));
  }
  assert.throws(() => prepareVisualInput({ ...input, assets: Array(5).fill(input.assets[0]) }));
  assert.throws(() => prepareVisualInput({ ...input, assets: [input.assets[0], input.assets[0]] }));
  assert.throws(() => prepareVisualInput({ ...input, assets: [{ ...input.assets[0], url: "https://example.com/image" }] }));
});
test("payload budget measures UTF-8 bytes and rejects exact serialized overflow", () => {
  assert.equal(assertRequestSize("a".repeat(LIMITS.requestBytes)), LIMITS.requestBytes);
  assert.throws(() => assertRequestSize("a".repeat(LIMITS.requestBytes+1)));
  assert.throws(() => assertRequestSize("é".repeat(LIMITS.requestBytes/2+1)));
});
test("strict response rejects nonexistent IDs, invented taste quotes and malformed status", () => {
  assert.deepEqual(validateVisualResponse(response,input), response);
  for (const patch of [{assetIds:["ghost-99"]}, {tasteQuote:"Invented preference"}, {tasteQuote:""}]) assert.throws(() => validateVisualResponse({ ...response, suggestions:[{...response.suggestions[0], ...patch}] }, input));
  for (const value of [{status:"suggestions",suggestions:[]}, {...response,status:"insufficient_evidence"}, {...response,extra:true}, {...response,suggestions:Array(4).fill(response.suggestions[0])}]) assert.throws(() => validateVisualResponse(value,input));
});
test("empty evidence avoids request; invalid input is rejected before request", async () => {
  let calls = 0;
  const runner = async () => { calls++; return response; };
  assert.equal((await runVisualExperiment({...input,taste:""},runner)).status,"insufficient_evidence");
  assert.equal((await runVisualExperiment({...input,assets:[]},runner)).status,"insufficient_evidence");
  await assert.rejects(runVisualExperiment({...input,assets:[{...input.assets[0],data:"bad"}]},runner));
  assert.equal(calls,0);
});
test("missing credentials and cancellation are deterministic with no network", async () => {
  assert.throws(() => requireLiveKey(undefined));
  assert.throws(() => requireLiveKey("  "));
  const controller = new AbortController(); controller.abort();
  await assert.rejects(runVisualExperiment(input,async()=>{throw new Error("must not run");},controller.signal), {name:"AbortError"});
  const during = new AbortController();
  await assert.rejects(runVisualExperiment(input,async()=>{during.abort();return response;},during.signal), {name:"AbortError"});
});
test("cap counts failed calls and never dispatches a ninth request", async () => {
  let calls = 0;
  const runner = capCalls(async () => { calls++; throw new Error("stub upstream failure"); });
  for (let i=0;i<9;i++) await assert.rejects(runner(input,new AbortController().signal));
  assert.equal(calls,8);
});

test("SDK transport validates the actual request and disables retries", async () => {
  const { createVisualRunner } = await import("../lib/visual-critique-experiment");
  let calls = 0;
  const runner = createVisualRunner("synthetic-test-key", async (_url, init) => {
    calls++;
    assert.equal(typeof init?.body,"string");
    const serialized = init!.body as string;
    assert.ok(assertRequestSize(serialized) > prepareVisualInput(input).bytes);
    const body = JSON.parse(serialized);
    assert.equal(body.max_tokens,1200);
    assert.equal(body.model,"claude-haiku-4-5-20251001");
    assert.ok(serialized.includes(input.assets[0].data));
    return new Response('{"type":"error","error":{"type":"overloaded_error","message":"fixture"}}', {status:529,headers:{"content-type":"application/json"}});
  });
  await assert.rejects(runVisualExperiment(input,runner));
  assert.equal(calls,1);
});

test("four individually valid images fail aggregate preflight before dispatch", async () => {
  const { deflateSync } = await import("node:zlib");
  const { randomBytes } = await import("node:crypto");
  const chunk = (type: string, data: Buffer) => {
    const content = Buffer.concat([Buffer.from(type), data]);
    let crc = 0xffffffff;
    for (const byte of content) { crc ^= byte; for (let bit=0;bit<8;bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
    const size = Buffer.alloc(4); size.writeUInt32BE(data.length);
    const checksum = Buffer.alloc(4); checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([size, content, checksum]);
  };
  const original = Buffer.from(input.assets[0].data,"base64");
  const rows = randomBytes((512*3+1)*384);
  for (let row=0;row<384;row++) rows[row*(512*3+1)]=0;
  const png = Buffer.concat([original.subarray(0,33),chunk("IDAT",deflateSync(rows)),chunk("IEND",Buffer.alloc(0))]);
  const one = {...input.assets[0],data:png.toString("base64")};
  assert.ok(prepareVisualInput({...input,assets:[one]}).bytes < LIMITS.requestBytes);
  let called = false;
  await assert.rejects(runVisualExperiment({...input,assets:[0,1,2,3].map((i)=>({...one,id:`asset-${i}`}))},async()=>{called=true;return response;}), /Encoded request exceeds/);
  assert.equal(called,false);
});

test("deadline reaches the actual SDK transport and malformed output never passes", async () => {
  const { createVisualRunner } = await import("../lib/visual-critique-experiment");
  const controller = new AbortController();
  const runner = createVisualRunner("synthetic-test-key", async (_url, init) => {
    return new Promise<Response>((_resolve, reject) => {
      init!.signal!.addEventListener("abort", () => reject(init!.signal!.reason), {once:true});
      controller.abort(new DOMException("fixture timeout", "TimeoutError"));
    });
  });
  await assert.rejects(runVisualExperiment(input,runner,controller.signal));
  assert.ok(controller.signal.aborted);
  await assert.rejects(runVisualExperiment(input,async()=>({status:"suggestions",suggestions:[{bad:true}]})));
});
