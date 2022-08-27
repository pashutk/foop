import * as parser from "./parser";
import { compileDeps, renderSexp } from "./wasm";
import { argv } from "process";
import { readFileSync, writeFileSync } from "fs";
import * as Path from "path";
import { beautify } from "s-exify";
import Wabt from "wabt";

const args = argv.slice(2).filter((a) => !a.startsWith("--"));
const flags = argv.slice(2).filter((a) => a.startsWith("--"));

const getDepsMap = (entryPointFilename: string): parser.Deps => {
  const fileFullPath = Path.resolve(entryPointFilename);
  const depsMap: parser.Deps = { entrypointFullPath: fileFullPath, deps: new Map() };
  const queue = [fileFullPath];
  while (queue.length !== 0) {
    const absolutePath = queue.shift()!;
    if (depsMap.deps.has(absolutePath)) {
      continue;
    }
    const parsedPath = Path.parse(absolutePath);
    const text = readFileSync(absolutePath, { encoding: "utf8" });
    const ast = parser.module(text);
    if (ast.type === "failure") {
      throw new Error(
        `Parsing of path\n\n${absolutePath}\n\nfailed: expected\n\n${ast.expected}\n\nbut got\n\n${ast.input}`
      );
    }
    const imports = ast.value.imports.map(({ from }) =>
      Path.resolve(parsedPath.dir, from.path + ".foop")
    );
    depsMap.deps.set(absolutePath, { tlds: ast.value.tlds, imports });
    queue.push(...imports);
  }
  return depsMap;
};

const parseModuleTree = (filename: string): parser.TopLevelDefinition[] => {
  const { deps } = getDepsMap(filename);
  return Array.from(deps.values()).flatMap(({ tlds }) => tlds);
};

const main = async () => {
  if (args.length === 0) {
    throw new Error("Provide entrypoint");
  }

  const filename = args[0];
  if (!filename) {
    throw new Error("Provide entrypoint");
  }
  const modules = parseModuleTree(filename);
  if (flags.includes("--ast")) {
    console.dir(modules, { depth: null });
    return;
  }
  const dependencies = getDepsMap(filename);
  const includeWasiImports = flags.includes("--wasi");
  const includeWasm4Imports = flags.includes("--wasm4");
  const module = compileDeps(dependencies, {
    imports: {
      wasi: includeWasiImports,
      wasm4: includeWasm4Imports,
    },
  });
  const watContent = beautify(renderSexp(module));

  const isReturningWat = flags.includes("--wat");
  let content: { type: "wat"; value: string } | { type: "wasm"; value: Buffer } = {
    type: "wat",
    value: watContent,
  };
  if (!isReturningWat) {
    const wabt = await Wabt();
    const wasm = wabt.parseWat("", content.value);
    content = {
      type: "wasm",
      value: Buffer.from(wasm.toBinary({ write_debug_names: true }).buffer),
    };
  }

  const isWritingToSdout = flags.includes("--stdout");
  if (isWritingToSdout) {
    console.log(content.value.toString());
  } else {
    const path = Path.parse(filename);
    const retFilename = `./${path.name}.${isReturningWat ? "wat" : "wasm"}`;
    writeFileSync(retFilename, content.value, {});
  }
};

main().then(console.log).catch(console.error);
