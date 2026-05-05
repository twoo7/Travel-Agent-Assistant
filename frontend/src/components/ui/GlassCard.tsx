"use client";

// GlassCard is a shim that re-exports Card so existing callers continue to compile
// during the glassmorphism cleanup sweep. Migrate callers to Card directly, then delete this file.
export { Card as GlassCard } from "./Card";
export type { } from "./Card";
