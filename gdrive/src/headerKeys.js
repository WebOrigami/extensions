import { Tree } from "@weborigami/async-tree";

export default async function headerKeys(treelike) {
  const table = await Tree.plain(treelike);
  const rows = table.slice();
  const header = rows.shift();
  const result = [];
  for (const row of rows) {
    const obj = {};
    for (let column = 0; column < header.length; column++) {
      const key = String(header[column]);
      const value = row[column];
      obj[key] = value;
    }
    result.push(obj);
  }
  return result;
}
