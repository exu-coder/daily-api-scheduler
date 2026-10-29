export const likeUrl = (uid: string) =>
  `https://like-p0d2.onrender.com/like?uid=${encodeURIComponent(uid)}&server_name=BD&key=exu`;

export const isValidUid = (uid: string) => /^\d{5,15}$/.test(uid);

export async function callLike(uid: string): Promise<Record<string, unknown>> {
  try {
    const res = await fetch(likeUrl(uid), { headers: { accept: "application/json" } });
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return { error: `API returned ${res.status}`, raw: text.slice(0, 500) };
    }
  } catch (e) {
    return { error: String(e) };
  }
}
