import { isUnpackable, Tree } from "@weborigami/async-tree";
import ts from "typescript";
import host from "./host.js";

export default async function compile(treelike, options) {
  const treeHost = await host(treelike);

  if (!options) {
    // Read config from tree.
    options = await treeHost.get("tsconfig.json");
    if (typeof options === "string") {
      options = JSON.parse(options);
    }
  } else if (isUnpackable(options)) {
    // Options are packed as a file Buffer or similar structure; unpack and
    // parse as TypeScript compiler options.
    const unpacked = await options.unpack();
    const plain = await Tree.plain(unpacked);
  } else if (options) {
    options = await Tree.plain(options);
  }

  // Note: despite the "Json" in the name, this TypeScript helper function
  // actually parses compiler options from a plain object with string values.
  // E.g., "ESNext" will be parsed as the `ESNext` enum value.
  options = ts.convertCompilerOptionsFromJson(options).options;

  const paths = await Tree.paths(treeHost);
  const program = ts.createProgram(paths, options, treeHost);
  program.emit();
  return treeHost;
}
