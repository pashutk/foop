import * as parser from "./parser";
import { compileModule, renderSexp } from "./wasm";

const code = `function inc(a) {
  add(a, 1)
}

function main() {
  add(inc(2), 3)
}
`;

const ast = parser.module(code);

if (ast.type === "failure") {
  console.error(ast);
} else {
  // console.dir(ast.value, { depth: null });
  const module = compileModule(ast.value);
  console.log(renderSexp(module));
}
