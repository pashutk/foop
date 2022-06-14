import {
  Expression,
  FunctionDeclaration,
  isEnumDeclaration,
  isFunctionDeclaration,
  TopLevelDefinition,
} from "./parser";
import { absurd } from "./utils";

type Atom = string;

type SExp = Atom | SExp[];

const sexp = (...children: SExp[]): SExp => children;

export const renderSexp = (s: SExp): string =>
  typeof s === "string" ? s : `(${s.map(renderSexp).join(" ")})`;

const compileExpression =
  (ctx: Ctx) =>
  (exp: Expression): SExp[] => {
    switch (exp.type) {
      case "Int":
        return [sexp("i32.const", exp.value)];

      case "Identificator":
        if (exp.name in ctx.enums) {
          return [sexp("i32.const", ctx.enums[exp.name]?.toString(10) ?? "-1")];
        }
        return [sexp("local.get", "$" + exp.name)];

      case "MatchExp": {
        const varName = `$var_${Math.floor(Math.random() * 100000).toString(10)}`;

        const cases = exp.cases.map((c) => [c.pattern.contructorName, c.expression] as const);
        cases.reverse();
        const compiledMatch = cases.reduce(
          (elseClause, [constr, expression]) =>
            sexp(
              "if",
              sexp("result", "i32"),
              sexp(
                "i32.eq",
                sexp("local.get", varName),
                sexp("i32.const", ctx.enums[constr]?.toString(10) ?? "-1")
              ),
              sexp("then", ...compileExpression(ctx)(expression)),
              sexp("else", elseClause)
            ),
          sexp("unreachable")
        );

        return [
          sexp("local", varName, "i32"),
          sexp("local.set", varName, ...compileExpression(ctx)(exp.value)),
          compiledMatch,
        ];
      }

      case "FunctionApplication": {
        const instructions: SExp[] = [];
        exp.params.forEach((param) => instructions.push(...compileExpression(ctx)(param)));
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

const compileFunctionDefinition = (ctx: Ctx) => (fn: FunctionDeclaration) => {
  const def: SExp[] = [];

  // Function name is $functionName
  def.push("$" + fn.name);
  // Use named params as $param1, $param2. i32 only for now
  fn.params.forEach(({ name }) => def.push(sexp("param", "$" + name, "i32")));
  // Result is always i32 for now
  def.push(sexp("result", "i32"));
  // Compile body expression
  def.push(...compileExpression(ctx)(fn.body));

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

type Ctx = {
  // <VariantName, IntId>
  enums: Record<string, number>;
};

export const compileModule = (tlds: TopLevelDefinition[]): SExp => {
  const functions = tlds.filter(isFunctionDeclaration);
  const enums = tlds.filter(isEnumDeclaration);

  const enumsRecord = Object.fromEntries(
    enums.flatMap((e) => e.variants.map(({ name }) => name)).map((name, index) => [name, index])
  );

  const expressions = functions.flatMap(compileFunctionDefinition({ enums: enumsRecord }));
  return sexp("module", ...memoryManagement(), ...expressions);
};
