import * as parser from "./parser";
import { compileModule, renderSexp } from "./wasm";
import { argv } from "process";

export const code = `
wasm eqz(a) {
  (i32.eqz (local.get $a))
}

function main() {
  eqz(0)
}
`;

export const code3 = `
enum Bool {
  True
  False
}

enum Option {
  Some(I32)
  None
}

enum List {
  Cons(I32, I32)
  Nil
}

function data() {
  Cons(Some(True), Nil)
}

function main() {
  match(data()) {
    Cons(consVal, tail) => match(consVal) {
      Some()
    }
    Nil => 0
  }
}

function intToBool(a) {
  match(a) {
    0 => False
    otherwise => True
  }
}

function boolToInt(a) {
  match(a) {
    True => 1
    False => 0
  }
}

function main() {
  boolToInt(True)
}
`;

export const code2 = `
enum Bool {
  False
  True
}

enum List {
  Cons(I32, I32)
  Nil
}

function sumListInner(list, result) {
  match(list) {
    Cons(head, tail) => sumListInner(tail, add(head, result))
    Nil => result
  }
}

function sumList(list) {
  sumListInner(list, 0)
}

function inc(a) {
  add(a, 1)
}

function equal(a, b) {
  match(eq(a, b)) {
    1 => True
    0 => False
  }
}

function range(start, end) {
  match(equal(inc(end), start)) {
    True => Nil
    False => Cons(start, range(inc(start), end))
  }
}

function rangeFromZero(end) {
  range(0, end)
}

function sumOfNNaturals(n) {
  sumList(rangeFromZero(n))
}

function main() {
  sumOfNNaturals(13)
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
