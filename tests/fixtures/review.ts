import { INTERPRETATION, type CritiqueResponse } from "../../lib/critique-contract";

export const sources = {
  profileMarkdown: "Keep exact places.\nName the actual work, not abstractions.\n",
  work: "  We built a listening bench in East Van.\nIt creates innovative solutions.\n",
  question: "Where does this become generic?",
};
export const critique: CritiqueResponse = {
  interpretation: INTERPRETATION,
  status: "suggestions", explanation: "The draft names the work, then loses that specificity.",
  suggestions: [
    { workQuote: "innovative solutions", profileQuote: "Name the actual work, not abstractions.", suggestion: "Cut the abstract ending or name its verified effect.", reason: "The profile asks for the actual work rather than an abstraction." },
    { workQuote: "East Van", profileQuote: "Keep exact places.", suggestion: "Keep the place name when revising.", reason: "The place is specific evidence the profile asks you to preserve." },
  ],
};
