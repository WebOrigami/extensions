import assert from "node:assert";
import { describe, test } from "node:test";
import mapLimit from "../src/mapLimit.js";

describe("mapLimit", () => {
  test("should map over items with basic function", async () => {
    const items = [1, 2, 3, 4, 5];
    const results = await mapLimit(items, async (x) => x * 2, 2);
    assert.deepStrictEqual(results, [2, 4, 6, 8, 10]);
  });

  test("should preserve order even when promises complete out of order", async () => {
    const items = [1, 2, 3, 4, 5];
    const results = await mapLimit(
      items,
      async (x) => {
        // Longer delays for smaller numbers so they complete last
        await new Promise((resolve) => setTimeout(resolve, (6 - x) * 10));
        return x * 2;
      },
      2,
    );
    assert.deepStrictEqual(results, [2, 4, 6, 8, 10]);
  });

  test("should respect concurrency limit", async () => {
    const items = [1, 2, 3, 4, 5];
    let concurrent = 0;
    let maxConcurrent = 0;

    await mapLimit(
      items,
      async (x) => {
        concurrent++;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        await new Promise((resolve) => setTimeout(resolve, 50));
        concurrent--;
        return x;
      },
      2,
    );

    assert.strictEqual(maxConcurrent, 2);
  });

  test("should handle empty array", async () => {
    const results = await mapLimit([], async (x) => x * 2, 2);
    assert.deepStrictEqual(results, []);
  });

  test("should handle single item", async () => {
    const results = await mapLimit([42], async (x) => x * 2, 2);
    assert.deepStrictEqual(results, [84]);
  });

  test("should propagate errors", async () => {
    const items = [1, 2, 3];
    await assert.rejects(
      async () => {
        await mapLimit(
          items,
          async (x) => {
            if (x === 2) {
              throw new Error("Test error");
            }
            await new Promise((resolve) => setTimeout(resolve, 10));
            return x;
          },
          1,
        );
      },
      { message: "Test error" },
    );
  });

  test("should work with limit larger than array length", async () => {
    const items = [1, 2, 3];
    const results = await mapLimit(items, async (x) => x * 2, 10);
    assert.deepStrictEqual(results, [2, 4, 6]);
  });

  test("should work with limit of 1 (sequential processing)", async () => {
    const items = [1, 2, 3, 4];
    const order = [];

    const results = await mapLimit(
      items,
      async (x) => {
        order.push(x);
        await new Promise((resolve) => setTimeout(resolve, 10));
        return x * 2;
      },
      1,
    );

    assert.deepStrictEqual(results, [2, 4, 6, 8]);
    assert.deepStrictEqual(order, [1, 2, 3, 4]);
  });
});
