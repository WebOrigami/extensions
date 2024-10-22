const maxRetries = 5;
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
  for (let retryCount = 0; retryCount < maxRetries; retryCount++) {
    try {
      const response = await fetch(url, options);
      if (response.status !== 429) {
        return response;
      }
    } catch (error) {
      // Network error, warn and retry
      console.warn(error);
      console.warn(url);
      console.warn(JSON.stringify(options));
    }

    // Wait and retry
    const retryAfterSeconds =
      parseInt(response.headers.get("Retry-After")) || baseDelaySeconds;
    // Use exponential backoff with jitter to avoid thundering herd problem
    const jitter = Math.random();
    const backoffSeconds = jitter * Math.pow(2, retryCount);
    const delaySeconds = retryAfterSeconds + backoffSeconds;
    await new Promise((resolve) => setTimeout(resolve, delaySeconds * 1000));
  }
  throw new Error("Max retries exceeded");
}
