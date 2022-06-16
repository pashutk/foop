import * as parser from "./parser";
import { compileModule, renderSexp } from "./wasm";
import { argv } from "process";

export const code = `
enum Option {
  Some(I32),
  None
}

function some1() {
  Some(1)
}
`;

export const code1 = `
enum Bool {
  True,
  False
}

enum ListInt {
  Cons(I32, ListInt),
  Nil
}

function test1() {
  match(Cons(12, Nil)) {
    Cons(a, b) => a
    Nil => 0
  }
}

function boolToInt(bool) {
  match(bool) {
    True => 1,
    False => 0
  }
}

function incbool(a) {
  add(a, boolToInt(True))
}

function inc(a) {
  add(a, 1)
}

function main() {
  add(inc(2), 3)
}
`;

const ast = parser.module(code);
// const ast = parser.test("abdd");

if (ast.type === "failure") {
  console.error(ast);
} else {
  if (argv[2] === "ast") {
    console.dir(ast.value, { depth: null });
  } else {
    const module = compileModule(ast.value);
    console.log(renderSexp(module));
  }
}
