/**
 * Run the given async function on each item in the iterable, limiting the
 * number of concurrent executions.
 *
 * @param {Iterable} items
 * @param {(item: any) => Promise<any>} fn
 * @param {number} limit
 */
export default async function mapLimit(items, fn, limit) {
  const executing = new Set();
  const results = new Array(items.length);
  let firstError = null;

  for (let i = 0; i < items.length; i++) {
    const p = Promise.resolve()
      .then(() => fn(items[i]))
      .then(
        (result) => {
          results[i] = result;
        },
        (error) => {
          if (!firstError) {
            firstError = error;
          }
        },
      );
    executing.add(p);
    p.finally(() => executing.delete(p));
    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }

  await Promise.allSettled(executing);

  if (firstError) {
    throw firstError;
  }

  return results;
}
