import * as parser from "./parser";
import { compileModule, renderSexp } from "./wasm";
import { argv } from "process";

const stdlib = `
wasm add(a, b) {
  (i32.add (local.get $a) (local.get $b))
}

wasm eq(a, b) {
  (i32.eq (local.get $a) (local.get $b))
}

wasm lt(a, b) {
  (i32.lt_s (local.get $a) (local.get $b))
}

function inc(a) {
  add(a, 1)
}

wasm dec(a) {
  (i32.sub (local.get $a) (i32.const -1))
}

wasm div(a, b) {
  (i32.div_s (local.get $a) (local.get $b))
}

enum List {
  Cons(I32, I32)
  Nil
}

wasm malloc(bytes) {
  (local.get $bytes)
  (call $mem_alloc)
}

wasm setByte(address, value, retvalue) {
  (i32.store (local.get $address) (local.get $value))
  (local.get $retvalue)
}

function asciiListToStrInner(address, list, index) {
  match(list) {
    Cons(a, tail) => asciiListToStrInner(setByte(add(address, index), a, address), tail, inc(index))
    Nil => address
  }
}

function asciiListToStr(list) {
  asciiListToStrInner(malloc(listLength(list)), list, 0)
}

function sysListLengthInner__(list, result) {
  match(list) {
    Cons(a, tail) => sysListLengthInner__(tail, inc(result))
    Nil => result
  }
}

function listLength(list) {
  sysListLengthInner__(list, 0)
}

enum IOVec {
  IOVec(I32, I32)
}

enum NWritten {
  NWritten
}

wasm logIOVec(iovecAddress) {
  (call $fd_write
    (i32.const 1)
    (local.get $iovecAddress)
    (i32.const 1)
    (i32.const 200)
  )
}

function printString(list) {
  logIOVec(add(IOVec(asciiListToStr(list), listLength(list)), 4))
}

function printI32__(num, result) {
  match(lt(num, 10)) {
    1 => Cons(add(48, num), result)
    otherwise => printI32__(div(num, 10), Cons(add(48, num), result))
  }
}

function printI32(num) {
  printI32__(num, Cons(10, Nil))
}

`;
// ; (i32.load (local.get $address))

export const code = `
${stdlib}

function _start() {
  let str = 'Sus'
  let newStr = Cons(50, str)
  printString(newStr)
}
`;

export const code8 = `
${stdlib}


function rw(index, stop, discard) {
  match(eq(index, stop)) {
    1 => 0
    otherwise => rw(inc(index), stop, printString(Cons(index, Nil)))
  }
}

function main() {
  '1'
}
`;

export const code7 = `
enum List {
  Cons(I32, I32)
  Nil
}

function x() {
  Cons(10, Nil)
}

function main() {
  'hello world!'
}
`;

export const code6 = `
${stdlib}

enum List {
  Cons(I32, I32)
  Nil
}

wasm malloc(bytes) {
  (local.get $bytes)
  (call $mem_alloc)
}

wasm setByte(address, value, retvalue) {
  (i32.store (local.get $address) (local.get $value))
  (local.get $retvalue)
}

function asciiListToStrInner(address, list, index) {
  match(list) {
    Cons(a, tail) => asciiListToStrInner(setByte(add(address, index), a, address), tail, inc(index))
    Nil => address
  }
}

function ceil4(num) {
  
}

function asciiListToStr(list) {
  asciiListToStrInner(malloc(ceil4(length(list))), list, 0)
}

function lengthInner(list, result) {
  match(list) {
    Cons(a, tail) => lengthInner(tail, inc(result))
    Nil => result
  }
}

function length(list) {
  lengthInner(list, 0)
}

function data() {
  Cons(83, Cons(83, Cons(117, Cons(115, Cons(10, Nil))))
}

enum IOVec {
  IOVec(I32, I32)
}

enum NWritten {
  NWritten
}

wasm log(iovecAddress) {
  (call $fd_write
    (i32.const 1)
    (local.get $iovecAddress)
    (i32.const 1)
    (i32.const 200)
  )
}

function logList(list) {
  log(add(IOVec(asciiListToStr(list), length(list)), 4))
}

function main() {
  logList(data())
}
`;

export const code5 = `
enum ListInt {
  Cons(I32, I32)
  Nil
}

wasm add(a, b) {
  (i32.add (local.get $a) (local.get $b))
}

wasm printI32(a)

function sumList(list, result) {
  match(list) {
    Cons(head, tail) => sumList(tail, add(result, head))
    Nil => result
  }
}

function main() {
  sumList(Cons(33, Cons(12, Nil)), 0)
}
`;

export const code4 = `
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
