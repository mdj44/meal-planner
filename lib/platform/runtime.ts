export type RuntimeKind = "web" | "native" | "unknown";

/**
 * Detects the current runtime environment
 * @returns "web" for browser environments, "native" for React Native, "unknown" otherwise
 */
export function detectRuntime(): RuntimeKind {
  if (typeof navigator !== "undefined") {
    if (navigator?.product === "ReactNative") return "native";
    return "web";
  }
  return "unknown";
}
