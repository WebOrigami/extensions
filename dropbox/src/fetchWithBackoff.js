import { callWithBackoff } from "@weborigami/async-tree";

const baseDelaySeconds = 1;

/**
 * Call `fetch` with exponential backoff on status 429 responses.
 *
 * If the response was not a 429, return the response -- which could be an error
 * the caller should handle.
 *
 * @param {string} url
 * @param {any} options
 */
export default async function fetchWithBackoff(url, options) {
  return callWithBackoff(
    () => fetch(url, options),
    (response) => {
      if (!response || response.status !== 429) {
        // No delay needed; response can be returned directly
        return null;
      }
      const retryAfterSeconds = response.headers?.get("Retry-After");
      const delayMs =
        (retryAfterSeconds ? parseInt(retryAfterSeconds) : baseDelaySeconds) *
        1000;
      return delayMs;
    }
  );
}
