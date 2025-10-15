export function isAuthed(): boolean {
  return Boolean(localStorage.getItem("token"));
}

export function saveToken(token: string) {
  localStorage.setItem("token", token);
}

export function logout() {
  localStorage.removeItem("token");
}

export function getToken(): string | null {
  return localStorage.getItem("token");
}

export function getUser(): { id?: number; role?: string; name?: string; email?: string } | null {
  const t = getToken();
  if (!t) return null;
  try {
    const [, raw] = t.split(".");
    if (!raw) return null;
    // Base64url decode → Uint8Array → UTF‑8 string (to preserve Arabic correctly)
    let b64 = raw.replace(/-/g, "+").replace(/_/g, "/");
    const padLen = (4 - (b64.length % 4)) % 4;
    if (padLen) b64 += "=".repeat(padLen);
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const text = new TextDecoder("utf-8").decode(bytes);
    const json = JSON.parse(text);
    return json || null;
  } catch {
    return null;
  }
}

export function getRole(): string | undefined {
  return getUser()?.role;
}
