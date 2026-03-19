import { redirect } from "next/navigation";

/** AI Suggest tab — server-side redirect to mapping with AI modal flag */
export default function AiSuggestPage() {
  redirect("/report/khdn/mapping?openAiSuggestion=1");
}
