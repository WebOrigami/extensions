import { ExtractorConfig } from "@microsoft/api-extractor/lib/api/ExtractorConfig.js";
import { Collector } from "@microsoft/api-extractor/lib/collector/Collector.js";

// import apiExtractor from "@microsoft/api-extractor";
// const { Collector } = apiExtractor;

import { Tree } from "@weborigami/async-tree";
import { treeCompilerHost } from "@weborigami/ts";
import ts from "typescript";

const options = {
  compilerOptions: {
    declaration: true,
    esModuleInterop: true,
    forceConsistentCasingInFileNames: true,
    module: "NodeNext",
    moduleResolution: "NodeNext",
    outDir: "dist",
    strict: true,
    target: "ESNext",
  },
  include: ["src"],
};

export default async function spike(treelike) {
  const host = await treeCompilerHost(treelike);

  const paths = await Tree.paths(host);
  const program = ts.createProgram(paths, options, host);
  program.emit();

  const configObject = {
    mainEntryPointFilePath: "dist/index.d.ts",
    // projectFolder: "src",
    compiler: {
      tsconfigFilePath: "tsconfig.json",
    },
    projectFolder: ".",
    // docModel: {
    //   enabled: true, apiJsonFilePath: apiJsonPath
    // },
    // bundledPackages: [pkgName]
  };
  const configOptions = {
    configObject,
    //   packageJsonFullPath: path.resolve(projectFolder, "package.json"), configObjectFullPath: ""
  };
  // // Load and parse the api-extractor.json file
  const extractorConfig = ExtractorConfig.prepare(configOptions);

  const collector = new Collector({
    program: program,
    // messageRouter: messageRouter,
    extractorConfig: extractorConfig,
  });
  collector.analyze();
}
