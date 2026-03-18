import type { ReverseTagSuggestion } from "@/lib/report/config-schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DocxParagraph = {
  index: number;
  text: string;
  xmlPath: string;
};

export type TagSuggestion = {
  header: string;
  matchedText: string;
  paragraphIndex: number;
  confidence: number;
};

export type ReverseSuggestionResult = {
  suggestions: ReverseTagSuggestion[];
  meta: {
    threshold: number;
    totalCandidates: number;
    accepted: number;
  };
};

export type TagFormat = "square" | "curly";
