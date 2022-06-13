import { Expression, FunctionDeclaration } from "./parser";
import { absurd } from "./utils";

type Atom = string;

type SExp = Atom | SExp[];

const sexp = (...children: SExp[]): SExp => children;

export const renderSexp = (s: SExp): string =>
  typeof s === "string" ? s : `(${s.map(renderSexp).join(" ")})`;

const compileExpression = (exp: Expression): SExp[] => {
  switch (exp.type) {
    case "Int":
      return [sexp("i32.const", exp.value)];

    case "Identificator":
      return [sexp("local.get", "$" + exp.name)];

    case "MatchExp": {
      return [];
    }

    case "FunctionApplication": {
      const instructions: SExp[] = [];
      exp.params.forEach((param) => instructions.push(...compileExpression(param)));
      switch (exp.name.name) {
        // poorman stdlib
        case "add":
          instructions.push(sexp("i32.add"));
          break;

        case "sub":
          instructions.push(sexp("i32.sub"));
          break;

        // its not an stdlib function, try to call it
        default:
          instructions.push(sexp("call", "$" + exp.name.name));
          break;
      }
      return instructions;
    }

    default:
      return absurd(exp);
  }
};

const compileFunctionDefinition = (fn: FunctionDeclaration) => {
  const def: SExp[] = [];

  // Function name is $functionName
  def.push("$" + fn.name);
  // Use named params as $param1, $param2. i32 only for now
  fn.params.forEach(({ name }) => def.push(sexp("param", "$" + name, "i32")));
  // Result is always i32 for now
  def.push(sexp("result", "i32"));
  // Compile body expression
  def.push(...compileExpression(fn.body));

  const funcExpression = sexp("func", ...def);

  // Every function is exported by its original name
  const exportExpression = sexp("export", `"${fn.name}"`, sexp("func", "$" + fn.name));

  return [funcExpression, exportExpression];
};

// Alloc-only mem mgmt
// https://github.com/LingDong-/wasm-fun/blob/master/wat/malloc.wat for inspiration
const memoryManagement = (): SExp[] => {
  const INITIAL_OFFSET = 0;
  return [
    //   (memory $mem 1)                                ;; start with 1 page (64K)
    sexp("memory", "$mem", "1"),
    //   (global $max_addr (mut i32) (i32.const 65536)) ;; initial heap size (64K)
    sexp("global", "$mem_max_addr", sexp("mut", "i32"), sexp("i32.const", "65536")),
    sexp(
      "global",
      "$mem_next_free",
      sexp("mut", "i32"),
      sexp("i32.const", INITIAL_OFFSET.toString(10))
    ),

    // malloc
    sexp(
      "func",
      "$mem_alloc",
      sexp("param", "$bytes", "i32"),
      sexp("result", "i32"),
      sexp("local", "$result", "i32"),
      // do the memory needs to grow?
      sexp(
        "if",
        // (mem_max_addr - mem_next_free) < bytes
        sexp(
          "i32.lt_u",
          sexp(
            "i32.sub",
            sexp("global.get", "$mem_max_addr"),
            sexp("global.get", "$mem_next_free")
          ),
          sexp("local.get", "$bytes")
        ),
        // then grow a memory and adjust mem_max_addr
        sexp(
          "then",

          //     ;; system call to grow memory (`drop` discards the (useless) return value of memory.grow)
          sexp(
            "memory.grow",
            // ;; compute # of pages from # of bytes, rounding up
            sexp(
              "i32.div_u",
              sexp("i32.add", sexp("local.get", "$bytes"), sexp("i32.const", "65527")),
              sexp("i32.const", "65528")
            )
          ),
          sexp("drop"),
          // adjust mem_max_addr
          sexp(
            "global.set",
            "$mem_max_addr",
            sexp("i32.add", sexp("global.get", "$mem_max_addr"), sexp("local.get", "$bytes"))
          )
        )
      ),
      // save result
      sexp("local.set", "$result", sexp("global.get", "$mem_next_free")),
      // adjust mem_next_free
      sexp(
        "global.set",
        "$mem_next_free",
        sexp("i32.add", sexp("local.get", "$bytes"), sexp("global.get", "$mem_next_free"))
      ),
      // return
      sexp("local.get", "$result")
    ),
  ];
};

export const compileModule = (functions: FunctionDeclaration[]): SExp => {
  const expressions = functions.flatMap(compileFunctionDefinition);
  return sexp("module", ...memoryManagement(), ...expressions);
};
