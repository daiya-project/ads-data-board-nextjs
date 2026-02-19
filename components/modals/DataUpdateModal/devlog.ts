/**
 * Dev-only logging (Next.js: process.env.NODE_ENV).
 */

export function devLog(...args: unknown[]): void {
  if (process.env.NODE_ENV === "development") {
    console.log(...args);
  }
}
