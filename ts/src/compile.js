import { isUnpackable, Tree } from "@weborigami/async-tree";
import ts from "typescript";
import treeCompilerHost from "./host.js";

export default async function compile(treelike, options) {
  const host = await treeCompilerHost(treelike);

  if (!options) {
    // Read config from tree.
    options = await host.get("tsconfig.json");
    if (typeof options === "string") {
      options = JSON.parse(options);
    }
  }

  if (isUnpackable(options)) {
    // Options are packed as a file Buffer or similar structure; unpack and
    // parse as TypeScript compiler options.
    const unpacked = await options.unpack();
    const plain = await Tree.plain(unpacked);
    // Note: despite the "Json" in the name, this TypeScript helper function
    // actually parses compiler options from a plain object with string values.
    // E.g., "ESNext" will be parsed as the `ESNext` enum value.
    options = ts.convertCompilerOptionsFromJson(plain).options;
  } else if (options) {
    options = await Tree.plain(options);
  }

  const paths = await Tree.paths(host);
  const program = ts.createProgram(paths, options, host);
  program.emit();
  return host;
}
