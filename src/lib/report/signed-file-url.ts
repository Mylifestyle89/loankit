/**
 * Client-side helper to build a signed download URL for /api/report/file.
 *
 * Fetches a short-lived HMAC token from the server, then returns the
 * full URL with ?token= attached.
 */
export async function getSignedFileUrl(
  filePath: string,
  download: boolean = true,
): Promise<string> {
  const res = await fetch(
    `/api/report/file/token?path=${encodeURIComponent(filePath)}`,
  );
  if (!res.ok) throw new Error("Failed to obtain file token");
  const { token } = (await res.json()) as { token: string };
  const params = new URLSearchParams({
    path: filePath,
    download: download ? "1" : "0",
    token,
  });
  return `/api/report/file?${params.toString()}`;
}
