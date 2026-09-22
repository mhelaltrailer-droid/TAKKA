/** Browser confirm before destructive actions (delete / end offer). */
export function confirmDestructive(message: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.confirm(message);
}
