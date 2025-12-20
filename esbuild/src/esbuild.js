import { toString, Tree } from "@weborigami/async-tree";
import { projectRoot } from "@weborigami/language";
import { build } from "esbuild";
import path from "node:path";
import process from "node:process";

const defaultEntryPoint = "./index.js";

/**
 * @param {import("@weborigami/async-tree").Treelike} treelike
 * @param {any} options
 */
export default async function esbuild(treelike, options = {}) {
  const localTree = await Tree.from(treelike);

  const currentDir = options.absWorkingDir ?? process.cwd();
  const root = await projectRoot(currentDir);

  let { entryPoints } = options;
  if (entryPoints === undefined) {
    entryPoints = [defaultEntryPoint];
  }

  // Ensure all entry points are relative to the root of the tree
  entryPoints = entryPoints.map((entryPoint) =>
    entryPoint.startsWith("./") ? entryPoint : `./${entryPoint}`
  );

  const built = await build({
    ...options,
    bundle: options.bundle ?? true,
    entryPoints,
    format: options.format ?? "esm",
    outdir: "out",
    plugins: [
      ...(options.plugins ?? []),
      asyncTreeFilesPlugin(localTree),
      await projectNodeModulesPlugin(root),
    ],
    write: false,
  });

  const outputFiles = built.outputFiles;
  if (outputFiles.length === 1) {
    return outputFiles[0].text;
  }

  // Create an object to represent the output tree
  const entries = outputFiles.map((file) => [
    path.basename(file.path),
    file.text,
  ]);
  return Object.fromEntries(entries);
}

// Loads files from the given tree
function asyncTreeFilesPlugin(localTree) {
  // Local imports are defined to be the inverse of package imports. Per the
  // rules at https://esbuild.github.io/api/#packages, local imports must start
  // with `/`, `./`, or `../`. Everything else is considered a package import.
  const localImportRegex = /^\.?\.?\//;

  return {
    name: "async-tree-files",

    setup(build) {
      build.onResolve({ filter: localImportRegex }, ({ path, pluginData }) => ({
        path,
        pluginData,
        namespace: "async-tree-url",
      }));

      build.onLoad(
        { filter: localImportRegex, namespace: "async-tree-url" },
        async (args) => {
          let filePath = args.path;
          // Remove leading "./" if present
          if (filePath.startsWith("./")) {
            filePath = filePath.slice(2);
          }
          const tree = args.pluginData?.tree ?? localTree;
          let contents = await Tree.traverse(tree, filePath);

          // Special case for synthetic entry point
          if (contents === undefined && args.path === defaultEntryPoint) {
            contents = await allImports(localTree);
          }

          return {
            contents,
            loader: loader(filePath),
          };
        }
      );
    },
  };
}

// Return a synthetic module importing all top-level .js and .ts files
async function allImports(tree) {
  const keys = Array.from(await tree.keys());
  const sourceKeys = keys.filter(
    (key) => key.endsWith(".js") || key.endsWith(".ts")
  );
  const imports = sourceKeys.map((key) => `import "./${key}";`).join("\n");
  return imports;
}

// esbuild should normally provide default loaders based on extension, but does
// not appear to do this for virtual files. We attempt to replicate esbuild's
// mapping here.
function loader(filePath) {
  const loaders = {
    ".cjs": "js",
    ".css": "css",
    ".cts": "ts",
    ".js": "js",
    ".json": "json",
    ".jsx": "jsx",
    ".mjs": "js",
    ".mts": "ts",
    ".ts": "ts",
    ".tsx": "tsx",
    ".txt": "text",
  };
  const extname = path.extname(filePath);
  return loaders[extname];
}

// Resolves package imports using the project's local node-modules
async function projectNodeModulesPlugin(root) {
  const projectRootScope = await Tree.scope(root);

  // We don't handle imports that start with a built-in namespace like `node:`
  // or `file:`.
  const builtinNamespaceRegex = /^[a-z]+:/;

  let nodeModules;
  return {
    name: "project-node-modules",

    setup(build) {
      build.onResolve(
        { filter: /^/, namespace: "async-tree-url" },
        ({ path }) =>
          builtinNamespaceRegex.test(path)
            ? null
            : {
                path,
                namespace: "project-node-modules-url",
              }
      );

      build.onLoad(
        { filter: /^/, namespace: "project-node-modules-url" },
        async (args) => {
          nodeModules ??= await projectRootScope.get("node_modules");
          const packageRoot = await Tree.traversePath(nodeModules, args.path);
          const buffer = await packageRoot.get("package.json");
          const json = toString(buffer);
          const data = JSON.parse(json);
          let mainPath = data.main ?? "index.js";
          if (mainPath.startsWith("./")) {
            mainPath = mainPath.slice(2);
          }
          const contents = await Tree.traversePath(packageRoot, mainPath);
          return {
            contents,
            pluginData: {
              tree: packageRoot,
            },
          };
        }
      );
    },
  };
}
