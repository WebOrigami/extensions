import { scope, Tree } from "@weborigami/async-tree";
import { build } from "esbuild";

export default async function bundleTree(treelike, entryPath) {
  const tree = await Tree.from(treelike);
  const thisScope = this ? scope(this) : null;
  let nodeModules;

  const built = await build({
    bundle: true,
    entryPoints: [entryPath],
    format: "esm",
    write: false,
    plugins: [
      {
        name: "async-tree-files",

        setup(build) {
          build.onResolve({ filter: /.js$/ }, (args) => ({
            path: args.path,
            namespace: "async-tree",
          }));

          build.onLoad(
            { filter: /.js$/, namespace: "async-tree" },
            async (args) => {
              let path = args.path;
              // Remove leading "./" if present
              if (path.startsWith("./")) {
                path = path.slice(2);
              }
              const contents = await Tree.traverse(tree, path);
              return {
                contents,
                loader: "js",
              };
            }
          );
        },
      },
      {
        name: "local-node-modules",

        setup(build) {
          build.onResolve({ filter: /^/ }, (args) => ({
            path: args.path,
            namespace: "local-node",
          }));

          build.onLoad(
            { filter: /^/, namespace: "local-node" },
            async (args) => {
              nodeModules ??= await thisScope.get("node_modules");
              const packageRoot = await Tree.traversePath(
                nodeModules,
                args.path
              );
              let mainPath = await Tree.traverse(
                packageRoot,
                "package.json",
                "main"
              );
              if (mainPath.startsWith("./")) {
                mainPath = mainPath.slice(2);
              }
              const contents = await Tree.traversePath(packageRoot, mainPath);
              return {
                contents,
                loader: "js",
              };
            }
          );
        },
      },
    ],
  });

  return built.outputFiles[0].text;
}
