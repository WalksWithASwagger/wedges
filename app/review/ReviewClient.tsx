"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { CritiqueInputSchema, type CritiqueInput } from "@/lib/critique-contract";
import { createReviewRecord, exportReviewJson, exportReviewMarkdown, MAX_RECORD_BYTES, parseReviewRecord, type Decision, type ReviewRecord } from "@/lib/review-record";
import styles from "./review.module.css";

const emptySources = { profileMarkdown: "", work: "", question: "" };
const choices: Decision["status"][] = ["pending", "accept", "reject", "modify"];
const choiceLabels = { pending: "Pending", accept: "Accept", reject: "Reject", modify: "Modify" };

function download(text: string, extension: "json" | "md") {
  const url = URL.createObjectURL(new Blob([text], { type: extension === "json" ? "application/json;charset=utf-8" : "text/markdown;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `wedges-review.${extension}`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export default function ReviewClient() {
  const [sources, setSources] = useState<CritiqueInput>(emptySources);
  const [record, setRecord] = useState<ReviewRecord | null>(null);
  const [activity, setActivity] = useState<"review" | "import" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dirty, setDirty] = useState(false);
  const [imported, setImported] = useState(false);
  const [focusReview, setFocusReview] = useState(0);
  const generation = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const reviewRef = useRef<HTMLHeadingElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const profileRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => { generation.current++; controller.current?.abort(); }, []);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
  useEffect(() => { if (focusReview) reviewRef.current?.focus(); }, [focusReview]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function changeSource(key: keyof CritiqueInput, value: string) {
    setSources((current) => ({ ...current, [key]: value }));
    setDirty(true);
    setNotice("");
  }

  async function review(event?: FormEvent) {
    event?.preventDefault();
    if (activity) return;
    const input = CritiqueInputSchema.safeParse(record?.sources ?? sources);
    if (!input.success) {
      setError("Add nonblank taste (up to 20,000 characters) and a draft (up to 8,000). The optional question can be up to 500 characters. Nothing has been shortened.");
      return;
    }
    const requestId = ++generation.current;
    controller.current = new AbortController();
    setActivity("review"); setError(""); setNotice("");
    try {
      const { requestCritique } = await import("@/lib/review-client");
      const critique = await requestCritique(input.data, new URL("/api/mcp", window.location.origin), controller.current.signal);
      if (requestId !== generation.current) return;
      setRecord((current) => ({ ...createReviewRecord(input.data, critique), revisedWork: current?.revisedWork ?? input.data.work }));
      setDirty(true);
      setFocusReview((n) => n + 1);
      setNotice(critique.status === "suggestions" ? "Your critique is ready. All decisions start pending." : "There is not enough evidence for a supported suggestion.");
    } catch (err) {
      if (requestId === generation.current) setError(err instanceof Error ? err.message : "The review could not be completed. Your work is still here.");
    } finally {
      if (requestId === generation.current) setActivity(null);
    }
  }

  async function importFile(event: ChangeEvent<HTMLInputElement>, kind: "review" | "profile") {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || activity) return;
    setError(""); setNotice(""); setActivity("import");
    try {
      if (file.size > (kind === "review" ? MAX_RECORD_BYTES : 120_000)) throw new Error(kind === "review" ? "Review files must be 512 KB or smaller. Your current work is unchanged." : "Taste files must be 120 KB or smaller. Your current work is unchanged.");
      const text = await file.text();
      if (kind === "profile") {
        if (!CritiqueInputSchema.shape.profileMarkdown.safeParse(text).success) throw new Error("Taste must be nonblank and at most 20,000 characters. Your current work is unchanged.");
        if (sources.profileMarkdown && !window.confirm("Replace the taste text in this tab with the selected file?")) return;
        changeSource("profileMarkdown", text);
        setNotice("Taste imported. Check that these are the preferences you want to use.");
      } else {
        const next = parseReviewRecord(text);
        if ((record || sources.work || sources.profileMarkdown) && !window.confirm("Replace the work in this tab with this review? Export your current work first if you want to keep it.")) return;
        generation.current++;
        setSources(next.sources); setRecord(next); setImported(true); setDirty(false);
        setFocusReview((n) => n + 1);
        setNotice("Review imported without a model call. Changes stay in this tab until you export again.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "The file could not be read. Your current work is unchanged.");
    } finally {
      setActivity(null);
    }
  }

  function exportFile(extension: "json" | "md") {
    setError("");
    try {
      const current = record ?? createReviewRecord(sources);
      download(extension === "json" ? exportReviewJson(current) : exportReviewMarkdown(current), extension);
      if (extension === "json") setDirty(false);
      setNotice(extension === "json" ? "JSON export requested. Keep the downloaded file to reopen this review." : "Markdown export requested. Use JSON as well if you want to reopen in Wedges.");
    } catch {
      setError("Export needs nonblank taste (up to 20,000 characters), an original draft (up to 8,000), a question up to 500, a revision up to 8,000, and reasons up to 2,000 each. Your work is unchanged.");
    }
  }

  function newReview() {
    if (dirty && !window.confirm("Start a new review? Export this review first if you want to keep your changes.")) return;
    generation.current++;
    setSources(record ? { ...record.sources, work: record.revisedWork } : emptySources);
    setRecord(null); setImported(false); setError(""); setNotice("Your working revision is ready for a new review. The previous source snapshot has not been edited.");
    setDirty(true);
  }

  function decide(index: number, patch: Partial<Decision>) {
    setRecord((current) => current && ({ ...current, decisions: current.decisions.map((decision, i) => i === index ? { ...decision, ...patch } : decision) }));
    setDirty(true); setNotice("");
  }

  return (
    <div className={styles.workspace}>
      <div className={styles.toolbar}>
        <p><strong>This tab only.</strong> No autosave. Export JSON to keep and reopen your work.</p>
        <button type="button" className={styles.button} disabled={!!activity} onClick={() => importRef.current?.click()}>Open review JSON</button>
        <input ref={importRef} className="hidden" type="file" accept=".json,application/json" aria-label="Open review JSON file" onChange={(event) => void importFile(event, "review")} />
      </div>
      {error && <div ref={errorRef} tabIndex={-1} role="alert" className={styles.error}>{error}</div>}
      <p role="status" aria-live="polite" className={styles.status}>{activity === "review" ? "Reading the submitted draft and taste… This may take a moment. Your work stays here." : activity === "import" ? "Reading your file…" : notice}</p>

      {!record ? (
        <form onSubmit={(event) => void review(event)}>
          <fieldset disabled={!!activity} className={styles.inputGrid}>
            <div className={styles.draftPanel}>
              <label className={styles.heading} htmlFor="work">The unfinished thing</label>
              <p id="work-help">One text draft. Keep the details that matter.</p>
              <textarea id="work" className={styles.draft} rows={14} value={sources.work} onChange={(e) => changeSource("work", e.target.value)} aria-describedby="work-help work-count" />
              <p id="work-count" className={styles.count}>{sources.work.length.toLocaleString()} / 8,000 characters{sources.work.length > 8_000 && " — too long; shorten before reviewing"}</p>
            </div>
            <div className={styles.tastePanel}>
              <label className={styles.heading} htmlFor="taste">The taste to protect</label>
              <p id="taste-help">Paste a profile or write a few relevant preferences. No exercises required.</p>
              <textarea id="taste" rows={8} value={sources.profileMarkdown} onChange={(e) => changeSource("profileMarkdown", e.target.value)} aria-describedby="taste-help taste-count" />
              <p id="taste-count" className={styles.count}>{sources.profileMarkdown.length.toLocaleString()} / 20,000 characters</p>
              <button type="button" className={styles.button} onClick={() => profileRef.current?.click()}>Import taste text</button>
              <input ref={profileRef} className="hidden" type="file" accept=".md,.txt,text/plain,text/markdown" aria-label="Import taste text file" onChange={(event) => void importFile(event, "profile")} />
              <label className={styles.questionLabel} htmlFor="question">What should the review look at? <span>(optional)</span></label>
              <textarea id="question" rows={3} value={sources.question ?? ""} onChange={(e) => changeSource("question", e.target.value)} aria-describedby="question-count" />
              <p id="question-count" className={styles.count}>{(sources.question?.length ?? 0).toLocaleString()} / 500 characters</p>
            </div>
          </fieldset>
          <div className={styles.submitRow}>
            <button className={`${styles.button} ${styles.primary}`} disabled={!!activity} type="submit">{activity === "review" ? "Reading…" : "Get cited critique ◣"}</button>
            <p>Submitting sends this draft, taste, and question to Anthropic through Wedges. Wedges does not persist solo reviews. <a href="https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data" target="_blank" rel="noreferrer">Provider retention policy ↗</a></p>
          </div>
        </form>
      ) : (
        <>
          <div className={styles.resultHeader}>
            <h2 ref={reviewRef} tabIndex={-1} className={styles.heading}>Your work. Your call.</h2>
            <button type="button" className={styles.button} disabled={!!activity} onClick={newReview}>Review your revision</button>
          </div>
          {imported && <p className={styles.importNotice}>Imported record: content and attribution are supplied by the file, not verified by Wedges.</p>}
          <div className={styles.reviewGrid}>
            <section className={styles.revisionPanel} aria-label="Work and source snapshots">
              <label className={styles.heading} htmlFor="revision">Your working revision</label>
              <p id="revision-help">You make the edits. Accepting advice changes no text.</p>
              <textarea id="revision" className={styles.draft} rows={14} value={record.revisedWork} disabled={!!activity} onChange={(e) => { setRecord({ ...record, revisedWork: e.target.value }); setDirty(true); setNotice(""); }} aria-describedby="revision-help revision-count" />
              <p id="revision-count" className={styles.count}>{record.revisedWork.length.toLocaleString()} / 8,000 characters{record.revisedWork.length > 8_000 && " — shorten before exporting"}</p>
              <details className={styles.sources}>
                <summary>Original draft &amp; taste — fixed for this review</summary>
                <h3>Original draft</h3><pre>{record.sources.work}</pre>
                <h3>Taste supplied</h3><pre>{record.sources.profileMarkdown}</pre>
                <h3>Review question</h3><pre>{record.sources.question || "No question supplied."}</pre>
              </details>
            </section>
            <section className={styles.suggestions} aria-label="Cited suggestions and your decisions">
              <p className={styles.attribution}>AI-generated interpretation; the author decides.</p>
              {record.critique ? <>
                <p>{record.critique.explanation}</p>
                {record.critique.status === "insufficient_evidence" && <p className={styles.empty}>No supported suggestions. You can still edit and export, or start a new review with a more relevant preference or a narrower question.</p>}
                {record.critique.suggestions.map((suggestion, index) => (
                  <article key={index} className={styles.suggestion} aria-label={`Suggestion ${index + 1}`}>
                    <h3><span className={styles.number}>0{index + 1}</span> {suggestion.suggestion}</h3>
                    <div className={styles.evidence}><h4>In your draft</h4><blockquote>{suggestion.workQuote}</blockquote><h4>In the taste you supplied</h4><blockquote>{suggestion.profileQuote}</blockquote></div>
                    <p className={styles.reason}>{suggestion.reason}</p>
                    <fieldset disabled={!!activity}>
                      <legend>Your decision</legend>
                      <div className={styles.decisions}>{choices.map((choice) => <label key={choice} data-selected={record.decisions[index].status === choice}><input type="radio" name={`decision-${index}`} value={choice} checked={record.decisions[index].status === choice} onChange={() => decide(index, { status: choice })} />{choiceLabels[choice]}</label>)}</div>
                      <label className={styles.reasonLabel} htmlFor={`reason-${index}`}>Your reason <span>(optional; your words only)</span></label>
                      <textarea id={`reason-${index}`} rows={2} value={record.decisions[index].reason} onChange={(e) => decide(index, { reason: e.target.value })} aria-describedby={`reason-count-${index}`} />
                      <p id={`reason-count-${index}`} className={styles.count}>{record.decisions[index].reason.length.toLocaleString()} / 2,000 characters</p>
                    </fieldset>
                  </article>
                ))}
              </> : <div className={styles.empty}><p>No critique recorded. You can keep working and export without a model call.</p><button type="button" className={styles.button} disabled={!!activity} onClick={() => void review()}>Get cited critique</button><p>Requesting critique sends the original draft, taste, and question to Anthropic. <a href="https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data" target="_blank" rel="noreferrer">Provider retention policy ↗</a></p></div>}
            </section>
          </div>
        </>
      )}
      <section className={styles.export} aria-label="Keep your work">
        <div><h2 className={styles.heading}>Take it with you.</h2><p>Exports include your draft, taste, revision, and any decisions. These files may contain unpublished work.</p></div>
        <div className={styles.exportButtons}><button type="button" className={`${styles.button} ${styles.primary}`} disabled={!!activity} onClick={() => exportFile("json")}>Export JSON · reopen later</button><button type="button" className={styles.button} disabled={!!activity} onClick={() => exportFile("md")}>Export Markdown · read anywhere</button></div>
      </section>
    </div>
  );
}
