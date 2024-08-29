import { isUnpackable, Tree } from "@weborigami/async-tree";
import ts from "typescript";
import host from "./host.js";

export default async function tsc(treelike, options) {
  const treeHost = await host(treelike);

  if (!options) {
    // Read config from tree.
    const config = await treeHost.get("tsconfig.json");
    options =
      config === undefined
        ? {}
        : typeof config === "string"
        ? JSON.parse(config)
        : await Tree.plain(config);
  } else if (isUnpackable(options)) {
    // Options are packed as a file Buffer or similar structure; unpack and
    // parse as TypeScript compiler options.
    const unpacked = await options.unpack();
    options = await Tree.plain(unpacked);
  } else if (options) {
    options = await Tree.plain(options);
  }

  if (!options.outDir) {
    // Specify a default output directory so compiler outputs don't end up mixed
    // into the source folders.
    options.outDir = "dist";
  }
  const outDir = options.outDir;

  // Note: despite the "Json" in the name, this TypeScript helper function
  // actually parses compiler options from a plain object with string values.
  // E.g., "ESNext" will be parsed as the `ESNext` enum value.
  options = ts.convertCompilerOptionsFromJson(options).options;

  const paths = await Tree.paths(treeHost);
  const program = ts.createProgram(paths, options, treeHost);
  program.emit();

  const dist = await Tree.traversePath(treeHost, outDir);
  dist.parent = this;
  return dist;
}
