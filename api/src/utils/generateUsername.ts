export function generateUsername(userId: string, name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, "")
    .slice(0, 12);
  const shortId = userId
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 6)
    .toLowerCase();
  return `${base || "user"}_${shortId}`;
}
