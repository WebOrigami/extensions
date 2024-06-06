/**
 * Fetch a resource with the Dropbox v2 API
 *
 * @param {any} auth
 * @param {string} path
 * @param {any} body
 */
export default async function dropboxFetch(accessToken, path, body = {}) {
  const url = `https://api.dropboxapi.com/2${path}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Dropbox API error: ${response.status}: ${response.statusText} - ${text}`
    );
  }

  return response.json();
}
