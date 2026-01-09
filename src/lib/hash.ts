/**
 * Generate a short hash from the current date/time for worktree naming.
 * Format: 8 character alphanumeric hash
 */
export function generateHash(): string {
  const now = Date.now();
  const randomPart = Math.random().toString(36).substring(2, 6);
  const timePart = now.toString(36).slice(-4);
  return `${timePart}${randomPart}`;
}
