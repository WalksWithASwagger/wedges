/**
 * Deterministic taste-profile logic for the Selector Pressure exercise.
 * Ported verbatim (UI-free) from bothhandsfull `src/data/selector-pressure.ts`.
 */
export type SelectorTagId =
  | "specific"
  | "human"
  | "cinematic"
  | "risky"
  | "practical"
  | "fast"
  | "weird"
  | "polished";

export interface SelectorTag {
  id: SelectorTagId;
  label: string;
  description: string;
}

export interface SelectorChoice {
  id: string;
  title: string;
  output: string;
  texture: string;
  tags: SelectorTagId[];
}

export interface SelectorRound {
  id: string;
  kicker: string;
  prompt: string;
  brief: string;
  choices: SelectorChoice[];
}

export interface SelectorSelection {
  roundId: string;
  choiceId: string;
  why: string;
}

export interface SelectorProfileTag {
  id: SelectorTagId;
  label: string;
  count: number;
}

export interface SelectorProfileTrailItem {
  roundId: string;
  roundPrompt: string;
  choiceTitle: string;
  tags: SelectorTagId[];
  why: string;
}

export interface SelectorProfile {
  completedRounds: number;
  consistencyScore: number;
  chosenTags: SelectorProfileTag[];
  rejectedTags: SelectorProfileTag[];
  contradictions: string[];
  dominantLine: string;
  trail: SelectorProfileTrailItem[];
}

export const SELECTOR_TAGS: SelectorTag[] = [
  { id: "specific", label: "Specific", description: "Concrete names, places, constraints, and scenes." },
  { id: "human", label: "Human", description: "Embodied feeling, testimony, friction, and stakes." },
  { id: "cinematic", label: "Cinematic", description: "An image you can frame, cut, light, or hear." },
  { id: "risky", label: "Risky", description: "An option with teeth; harder to sand into content." },
  { id: "practical", label: "Practical", description: "Clear enough to use tomorrow without a meeting." },
  { id: "fast", label: "Fast", description: "Lightweight, shippable, and easy to test." },
  { id: "weird", label: "Weird", description: "A little bent; memorable because it is not default." },
  { id: "polished", label: "Polished", description: "Finished, legible, and ready for a public surface." },
];

export const SELECTOR_ROUNDS: SelectorRound[] = [
  {
    id: "poster-line",
    kicker: "Round 01 · poster line",
    prompt: "Pick the line you would put above the fold.",
    brief: "The generator gave you four respectable headlines. One gets shipped.",
    choices: [
      { id: "hands-full", title: "Both hands full", output: "Hold critique in one hand. Hold curiosity in the other. Keep walking.", texture: "Thesis, portable, direct.", tags: ["specific", "polished"] },
      { id: "future-ready", title: "Future-ready creativity", output: "A practical guide to thriving in the age of AI-powered creative work.", texture: "Clean SaaS brochure energy.", tags: ["practical", "fast"] },
      { id: "synthetic-everything", title: "Synthetic everything", output: "The machine can flood the room. Your job is to decide what deserves oxygen.", texture: "Sharper, darker, more memorable.", tags: ["risky", "cinematic"] },
      { id: "tools-not-rules", title: "Tools, not rules", output: "AI is not the artist. It is the mirror, the assistant, and sometimes the dare.", texture: "Balanced and workshop-friendly.", tags: ["human", "practical"] },
    ],
  },
  {
    id: "story-open",
    kicker: "Round 02 · story page",
    prompt: "Pick the opening sentence for Luke's story page.",
    brief: "The page needs one door. Which sentence makes you keep reading?",
    choices: [
      { id: "ratio-flip", title: "The ratio flipped", output: "Luke did not fall in love with AI because it made work cheaper; he noticed the grind shrinking around the thing he actually came here to do.", texture: "Specific and emotionally weighted.", tags: ["human", "specific"] },
      { id: "ai-productivity", title: "AI productivity", output: "AI tools helped Luke streamline repetitive production tasks and reallocate time toward higher-value creative work.", texture: "Accurate, dead on arrival.", tags: ["practical", "polished"] },
      { id: "monster-kid", title: "The monster kid", output: "The 12-year-old who wanted to bring monsters to life came back when the spreadsheet work got quiet.", texture: "Cinematic and personal.", tags: ["cinematic", "human"] },
      { id: "industry-case", title: "Industry case", output: "Luke's workflow demonstrates how filmmakers can integrate generative tools without abandoning craft judgment.", texture: "Safe conference summary.", tags: ["polished", "fast"] },
    ],
  },
  {
    id: "exercise-name",
    kicker: "Round 03 · exercise name",
    prompt: "Pick the name for a new taste-training exercise.",
    brief: "Names are tiny pieces of pedagogy. Pick the one with the strongest pull.",
    choices: [
      { id: "selector-pressure-test", title: "Selector Pressure Test", output: "Fast rounds. No prompt tinkering. Just the discomfort of choosing what you would defend.", texture: "Exact and a little severe.", tags: ["specific", "risky"] },
      { id: "taste-lab", title: "Taste Lab", output: "A guided activity for improving creative decision-making with AI-generated options.", texture: "Friendly, bland, easy to forget.", tags: ["practical", "fast"] },
      { id: "the-last-cut", title: "The Last Cut", output: "Four options enter. One survives. Your edit is the argument.", texture: "Film-native and dramatic.", tags: ["cinematic", "weird"] },
      { id: "choice-training", title: "Choice Training", output: "Practice selecting outputs based on clear criteria and consistent creative standards.", texture: "Clear but bloodless.", tags: ["polished", "practical"] },
    ],
  },
  {
    id: "broll-prompt",
    kicker: "Round 04 · b-roll prompt",
    prompt: "Pick the b-roll direction for a story detail page.",
    brief: "You do not have the final clip yet. Which direction should guide the search?",
    choices: [
      { id: "hands-on-console", title: "Hands on console", output: "Close on hands adjusting a messy timeline, then a hard cut to the same hands stopping, watching, deciding.", texture: "Actionable and visual.", tags: ["cinematic", "specific"] },
      { id: "creative-process", title: "Creative process", output: "Use footage that shows the creative process and the role of AI in improving outcomes.", texture: "Could fit any deck.", tags: ["practical", "fast"] },
      { id: "empty-chair", title: "Empty chair", output: "An empty edit chair, glowing monitor, and a cursor waiting like a dare.", texture: "Moody, risky, maybe too quiet.", tags: ["risky", "cinematic"] },
      { id: "subject-smile", title: "Subject smiles", output: "A warm interview beat where the subject smiles while describing the moment work became possible again.", texture: "Human and usable.", tags: ["human", "polished"] },
    ],
  },
  {
    id: "film-club-invite",
    kicker: "Round 05 · invitation",
    prompt: "Pick the Film Club signup microcopy.",
    brief: "The portal asks for an email. One line has to make that feel worth it.",
    choices: [
      { id: "find-five", title: "Find five", output: "Find five people who will watch the work, not the prompt.", texture: "Compact and community-shaped.", tags: ["human", "specific"] },
      { id: "join-newsletter", title: "Join newsletter", output: "Sign up to receive updates, resources, and upcoming events from Both Hands Full.", texture: "Useful, interchangeable.", tags: ["practical", "polished"] },
      { id: "room-not-feed", title: "Room, not feed", output: "This is a room, not a feed. Bring one unfinished thing.", texture: "Riskier, more alive.", tags: ["risky", "weird"] },
      { id: "monthly-lab", title: "Monthly lab", output: "A monthly lab for filmmakers practicing critique, curiosity, and AI literacy together.", texture: "Clear operational promise.", tags: ["practical", "human"] },
    ],
  },
  {
    id: "mark-system",
    kicker: "Round 06 · visual mark",
    prompt: "Pick the replacement direction for the red blob-hand motif.",
    brief: "The old meatball hand is out. What should the next mark feel like?",
    choices: [
      { id: "scanned-strike", title: "Scanned strike", output: "A real red marker strike, scanned crooked, used only where a decision gets made.", texture: "Tactile and disciplined.", tags: ["specific", "human"] },
      { id: "minimal-icon", title: "Minimal icon", output: "A clean vector hand icon system with consistent sizing and predictable placement.", texture: "Legible but too tidy.", tags: ["polished", "practical"] },
      { id: "film-burn", title: "Film burn slash", output: "A red slash that feels like a damaged frame, appearing only on hard cuts.", texture: "Cinematic and sharper.", tags: ["cinematic", "risky"] },
      { id: "rubber-stamp", title: "Rubber stamp", output: "A stamped YES / NO / HOLD mark that looks slightly over-inked each time.", texture: "Weird, procedural, very usable.", tags: ["weird", "practical"] },
    ],
  },
  {
    id: "library-note",
    kicker: "Round 07 · library note",
    prompt: "Pick the note under a curriculum item.",
    brief: "A library card should not sound like homework. Pick the note that earns the click.",
    choices: [
      { id: "gender-shades-receipt", title: "Receipt", output: "This is the receipt for why 'the model did not see me' is not a metaphor.", texture: "Specific and politically clear.", tags: ["specific", "risky"] },
      { id: "important-study", title: "Important study", output: "A foundational study about algorithmic bias and the importance of representative datasets.", texture: "Correct, academic, flat.", tags: ["polished", "practical"] },
      { id: "face-in-frame", title: "Face in frame", output: "Before you talk about AI creativity, ask whose face the machine fails to frame.", texture: "Cinematic and pointed.", tags: ["cinematic", "human"] },
      { id: "bias-resource", title: "Bias resource", output: "Read this before building or buying any AI system that touches human identity.", texture: "Useful and direct.", tags: ["fast", "practical"] },
    ],
  },
  {
    id: "pull-quote",
    kicker: "Round 08 · pull quote",
    prompt: "Pick the pull quote for the script page.",
    brief: "The quote should make the talk legible without flattening the thesis.",
    choices: [
      { id: "binary-lazy", title: "Lazy writing", output: "You are filmmakers. You know the binary is lazy writing.", texture: "Audience-specific and sharp.", tags: ["specific", "risky"] },
      { id: "embrace-ai", title: "Responsible adoption", output: "We need a responsible approach to AI that balances opportunity and risk.", texture: "Fine. Nobody tattoos it.", tags: ["polished", "fast"] },
      { id: "both-statements", title: "Both true", output: "AI is trained on stolen work without consent. And I am more creative than ever.", texture: "Human contradiction, intact.", tags: ["human", "risky"] },
      { id: "third-option", title: "Third option", output: "The interesting choice is always the third option: the one that is harder to hold.", texture: "Clean thesis line.", tags: ["polished", "specific"] },
    ],
  },
  {
    id: "community-rule",
    kicker: "Round 09 · community norm",
    prompt: "Pick the room rule for an AI film meetup.",
    brief: "A rule is a tiny operating system. Which one changes behavior?",
    choices: [
      { id: "show-the-cut", title: "Show the cut", output: "No demos without the cut. Bring the decision you made after the machine answered.", texture: "Behavior-changing and concrete.", tags: ["specific", "practical"] },
      { id: "be-respectful", title: "Be respectful", output: "Maintain a respectful environment and support different levels of AI experience.", texture: "Necessary, generic.", tags: ["polished", "fast"] },
      { id: "no-prompt-flexing", title: "No prompt flexing", output: "Do not flex prompts. Show judgment.", texture: "Tiny, weird, useful.", tags: ["weird", "risky"] },
      { id: "credit-the-hands", title: "Credit the hands", output: "Credit the human hands in the process: source, selector, editor, witness.", texture: "Values-forward.", tags: ["human", "polished"] },
    ],
  },
  {
    id: "closing-cta",
    kicker: "Round 10 · closing CTA",
    prompt: "Pick the final button on the exercise.",
    brief: "The last action should make the visitor do one real thing.",
    choices: [
      { id: "export-note", title: "Export note", output: "Export the note. Defend one choice in the room.", texture: "Concrete and workshop-ready.", tags: ["practical", "specific"] },
      { id: "continue-learning", title: "Continue learning", output: "Continue exploring resources and exercises to deepen your AI practice.", texture: "Harmless hallway copy.", tags: ["fast", "polished"] },
      { id: "kill-one-default", title: "Kill one default", output: "Tomorrow, kill one default the model handed you.", texture: "Sharp, behavior-oriented.", tags: ["risky", "weird"] },
      { id: "call-someone", title: "Call someone", output: "Send one choice to someone whose eye you trust and ask what they would cut.", texture: "Human feedback loop.", tags: ["human", "practical"] },
    ],
  },
];

const TAG_BY_ID = Object.fromEntries(SELECTOR_TAGS.map((tag) => [tag.id, tag])) as Record<
  SelectorTagId,
  SelectorTag
>;

export function findSelectorChoice(roundId: string, choiceId: string) {
  const round = SELECTOR_ROUNDS.find((candidate) => candidate.id === roundId);
  if (!round) return null;
  const choice = round.choices.find((candidate) => candidate.id === choiceId);
  if (!choice) return null;
  return { round, choice };
}

export function buildSelectorProfile(
  selections: SelectorSelection[],
  declaredTags: SelectorTagId[],
): SelectorProfile {
  const selectedCounts = emptyTagCounts();
  const rejectedCounts = emptyTagCounts();
  const trail: SelectorProfileTrailItem[] = [];

  for (const round of SELECTOR_ROUNDS) {
    const selected = selections.find((selection) => selection.roundId === round.id);
    if (!selected) continue;

    const choice = round.choices.find((candidate) => candidate.id === selected.choiceId);
    if (!choice) continue;

    for (const tag of choice.tags) selectedCounts[tag] += 1;
    for (const rejected of round.choices.filter((candidate) => candidate.id !== choice.id)) {
      for (const tag of rejected.tags) rejectedCounts[tag] += 1;
    }

    trail.push({
      roundId: round.id,
      roundPrompt: round.prompt,
      choiceTitle: choice.title,
      tags: choice.tags,
      why: selected.why.trim(),
    });
  }

  const completedRounds = trail.length;
  const chosenTags = topTags(selectedCounts, 4);
  const rejectedTags = topTags(rejectedCounts, 4);
  const dominant = chosenTags[0];
  const consistencyScore =
    completedRounds && dominant ? Math.round((dominant.count / completedRounds) * 100) : 0;

  return {
    completedRounds,
    consistencyScore,
    chosenTags,
    rejectedTags,
    contradictions: buildContradictions(selectedCounts, declaredTags, completedRounds),
    dominantLine: dominant
      ? `Your hand keeps moving toward ${dominant.label.toLowerCase()} choices.`
      : "Make a few selections before trusting the profile.",
    trail,
  };
}

function emptyTagCounts() {
  return Object.fromEntries(SELECTOR_TAGS.map((tag) => [tag.id, 0])) as Record<
    SelectorTagId,
    number
  >;
}

function topTags(counts: Record<SelectorTagId, number>, limit: number): SelectorProfileTag[] {
  return SELECTOR_TAGS.map((tag) => ({ id: tag.id, label: tag.label, count: counts[tag.id] }))
    .filter((tag) => tag.count > 0)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

function buildContradictions(
  selectedCounts: Record<SelectorTagId, number>,
  declaredTags: SelectorTagId[],
  completedRounds: number,
) {
  if (!completedRounds) return ["No behavior yet. Taste under pressure starts after the first cut."];
  if (!declaredTags.length) {
    return ["You did not state taste up front, so this profile is pure behavior."];
  }

  const contradictions: string[] = [];
  const weakThreshold = Math.max(1, Math.floor(completedRounds / 4));

  for (const tagId of declaredTags) {
    if (selectedCounts[tagId] <= weakThreshold) {
      contradictions.push(
        `You named ${TAG_BY_ID[tagId].label.toLowerCase()}, but your shipped picks rarely carried it.`,
      );
    }
  }

  const declared = new Set(declaredTags);
  for (const tag of topTags(selectedCounts, 3)) {
    if (!declared.has(tag.id) && tag.count >= Math.max(2, Math.ceil(completedRounds / 3))) {
      contradictions.push(
        `You did not name ${tag.label.toLowerCase()}, but your hand kept choosing it.`,
      );
    }
  }

  return contradictions.length
    ? contradictions
    : ["Your stated taste and shipped choices are moving in the same direction."];
}
