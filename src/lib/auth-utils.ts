/** Default redirect after login */
export const DEFAULT_CALLBACK = "/report/khdn/mapping";

/** Sanitize callbackUrl to prevent open redirect attacks */
export function safeCallbackUrl(raw: string | null): string {
  const url = raw || DEFAULT_CALLBACK;
  return url.startsWith("/") && !url.startsWith("//") ? url : DEFAULT_CALLBACK;
}
