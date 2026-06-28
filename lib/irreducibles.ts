/**
 * Refuse to Outsource — the irreducible list. The things AI can't eat.
 * Seed list is Kris's, from bothhandsfull `RefuseToOutsource.tsx`, used only as
 * a reference example; the agent collects the user's own.
 */
export const KK_SEED_LIST = [
  "Laughing until you can't breathe",
  "Crying at a film that sees you",
  "Kissing someone for the first time",
  "Getting lost in the woods and not caring",
  "Dancing until your atoms rearrange",
];

export interface Irreducibles {
  items: string[];
  whyTheseStay: string;
}

export function structureIrreducibles(input: {
  items: string[];
  whyTheseStay?: string;
}): Irreducibles {
  return {
    items: input.items.map((i) => i.trim()).filter(Boolean),
    whyTheseStay: input.whyTheseStay?.trim() ?? "",
  };
}
