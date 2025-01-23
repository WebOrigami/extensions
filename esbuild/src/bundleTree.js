import { scope, toString, Tree } from "@weborigami/async-tree";
import { build } from "esbuild";
import path from "node:path";

const syntheticEntryPoint = "./__entryPoint__.js";

/**
 *
 * @param {import("@weborigami/async-tree").Treelike} treelike
 * @param {string|undefined} entryPath
 * @returns
 */
export default async function bundleTree(treelike, entryPoints) {
  const localTree = await Tree.from(treelike);

  if (entryPoints === undefined) {
    entryPoints = [syntheticEntryPoint];
  } else if (typeof entryPoints === "string") {
    entryPoints = [entryPoints];
  }

  // Ensure all entry points are relative to the root of the tree
  entryPoints = entryPoints.map((entryPoint) =>
    entryPoint.startsWith("./") ? entryPoint : `./${entryPoint}`
  );

  const built = await build({
    bundle: true,
    entryPoints,
    format: "esm",
    outdir: "out",
    plugins: [asyncTreeFilesPlugin(localTree), projectNodeModulesPlugin(this)],
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
          // Special case for synthetic entry point
          if (args.path === syntheticEntryPoint) {
            return {
              contents: await importAllJs(localTree),
              loader: "js",
            };
          }

          let path = args.path;
          // Remove leading "./" if present
          if (path.startsWith("./")) {
            path = path.slice(2);
          }
          const tree = args.pluginData?.tree ?? localTree;
          const contents = await Tree.traverse(tree, path);
          return {
            contents,
            loader: "js",
          };
        }
      );
    },
  };
}

// Return a synthetic module importing all .js files in the tree's top level
async function importAllJs(tree) {
  const keys = Array.from(await tree.keys());
  const jsKeys = keys.filter((key) => key.endsWith(".js"));
  const imports = jsKeys.map((key) => `import "./${key}";`).join("\n");
  return imports;
}

// Resolves package imports using the project's local node-modules
function projectNodeModulesPlugin(context) {
  const contextScope = context ? scope(context) : null;

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
          nodeModules ??= await contextScope.get("node_modules");
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
            loader: "js",
            pluginData: {
              tree: packageRoot,
            },
          };
        }
      );
    },
  };
}
