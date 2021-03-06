import {
  Expression,
  FfiDeclaration,
  FunctionDeclaration,
  isEnumDeclaration,
  isFfiDeclaration,
  isFunctionDeclaration,
  TopLevelDefinition,
  WasmType,
} from "./parser";
import { absurd } from "./utils";

type Atom = string;

type SExp = Atom | SExp[];

const sexp = (...children: SExp[]): SExp => children;

export const renderSexp = (s: SExp): string =>
  typeof s === "string" ? s : `(${s.map(renderSexp).join(" ")})`;

const compileExpression =
  (ctx: Ctx) =>
  (exp: Expression): { localNames: string[]; exp: SExp[] } => {
    switch (exp._type) {
      case "Int":
        return { localNames: [], exp: [sexp("i32.const", exp.value)] };

      case "Str":
        return {
          localNames: [],
          exp: [
            exp.value
              .split("")
              .reduceRight(
                (prev, curr) =>
                  sexp("call", "$Cons", sexp("i32.const", curr.charCodeAt(0).toString()), prev),
                sexp("call", "$Cons", sexp("i32.const", "10"), sexp("call", "$Nil"))
              ),
          ],
        };

      case "Identificator":
        if (exp.name in ctx.enums) {
          return { localNames: [], exp: [sexp("call", "$" + exp.name)] };
        }
        return { localNames: [], exp: [sexp("local.get", "$" + exp.name)] };

      // Currently match expr works only with constructors as an argument
      case "MatchExp": {
        const varName = `var_${Math.floor(Math.random() * 100000).toString(10)}`;

        const cases = exp.cases.map((c) => [c.pattern, c.expression] as const);
        cases.reverse();
        const locals: string[] = [];
        const compiledMatch = cases.reduce((elseClause, [pattern, expression]) => {
          const { localNames, exp: compiledExp } = compileExpression(ctx)(expression);
          locals.push(...localNames);
          if (pattern._type === "MatcherConstructorPattern") {
            if (pattern.contructorName === "otherwise") {
              return sexp(
                "if",
                sexp("result", "i32"),
                sexp("i32.const", "1"),
                sexp("then", ...compiledExp),
                sexp("else", sexp("unreachable"))
              );
            }

            if (pattern.params) {
              locals.push(...pattern.params);
            }
            return sexp(
              "if",
              sexp("result", "i32"),
              sexp(
                "i32.eq",
                sexp("i32.load", sexp("local.get", "$" + varName)),
                sexp("i32.const", ctx.enums[pattern.contructorName]?.numericId.toString(10) ?? "-1")
              ),
              sexp(
                "then",
                ...pattern.params.flatMap((name, index) => {
                  const address = sexp(
                    "i32.add",
                    sexp("local.get", "$" + varName),
                    sexp("i32.const", ((index + 1) * 4).toString(10))
                  );
                  return [sexp("local.set", "$" + name, sexp("i32.load", address))];
                }),
                ...compiledExp
              ),
              sexp("else", elseClause)
            );
          } else {
            return sexp(
              "if",
              sexp("result", "i32"),
              sexp(
                "i32.eq",
                sexp("local.get", "$" + varName),
                sexp("i32.const", pattern.value.value)
              ),
              sexp("then", ...compiledExp),
              sexp("else", elseClause)
            );
          }
        }, sexp("unreachable"));

        return {
          localNames: [varName, ...locals],
          exp: [
            sexp("local.set", "$" + varName, ...compileExpression(ctx)(exp.value).exp),
            compiledMatch,
          ],
        };
      }

      case "FunctionApplication": {
        const instructions: SExp[] = [];
        const locals: string[] = [];
        exp.params.forEach((param) => {
          const { localNames, exp } = compileExpression(ctx)(param);
          instructions.push(...exp);
          locals.push(...localNames);
        });
        instructions.push(sexp("call", "$" + exp.name.name));
        return {
          localNames: locals,
          exp: instructions,
        };
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

  const compiledBindings = fn.body.bindings.map((b) => {
    const { localNames, exp } = compileExpression(ctx)(b.expression);
    return { name: b.name, exp, localNames };
  });
  compiledBindings.forEach(({ localNames }) => {
    localNames.forEach((name) => {
      def.push(sexp("local", "$" + name, "i32"));
    });
  });
  // declare let binding local vars
  fn.body.bindings.forEach((b) => {
    def.push(sexp("local", "$" + b.name, "i32"));
  });

  const compiledBody = compileExpression(ctx)(fn.body.expression);
  compiledBody.localNames.forEach((name) => {
    def.push(sexp("local", "$" + name, "i32"));
  });

  compiledBindings.forEach((cb) => {
    def.push(...cb.exp);
    def.push(sexp("local.set", "$" + cb.name));
  });
  // Compile body expression
  def.push(...compiledBody.exp);

  const funcExpression = sexp("func", ...def);

  return [funcExpression].concat(
    fn.exported ? [sexp("export", `"${fn.name}"`, sexp("func", "$" + fn.name))] : []
  );
};

const compileFfiDefinition = (ffi: FfiDeclaration): SExp[] => {
  return [
    sexp(
      "func",
      "$" + ffi.name,
      ...ffi.params.map((param) => sexp("param", "$" + param.name, "i32")),
      sexp("result", "i32"),
      ffi.body.content
    ),
  ];
};

// Alloc-only mem mgmt
// https://github.com/LingDong-/wasm-fun/blob/master/wat/malloc.wat for inspiration
const memoryManagement = (): SExp[] => {
  const INITIAL_OFFSET = 0;
  return [
    //   (memory $mem 1)                                ;; start with 1 page (64K)
    sexp("memory", "$mem", "1"),
    // (export "memory" (memory 0))
    sexp("export", '"memory"', sexp("memory", "0")),
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
      sexp("local", "$_result", "i32"),
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
      sexp("local.set", "$_result", sexp("global.get", "$mem_next_free")),
      // adjust mem_next_free
      sexp(
        "global.set",
        "$mem_next_free",
        sexp("i32.add", sexp("local.get", "$bytes"), sexp("global.get", "$mem_next_free"))
      ),
      // return
      sexp("local.get", "$_result")
    ),
  ];
};

const imports: SExp[] = [
  // (import "wasi_unstable" "fd_write"
  //   (func $fd_write (param i32 i32 i32 i32)
  //                   (result i32)))
  sexp(
    "import",
    '"wasi_unstable"',
    '"fd_write"',
    sexp("func", "$fd_write", sexp("param", "i32", "i32", "i32", "i32"), sexp("result", "i32"))
  ),
];

const compileEnumConstructor = (name: string, numericId: number, params: WasmType[]): SExp[] => {
  return [
    sexp(
      "func",
      "$" + name,
      ...params.map((param, index) => sexp("param", "$param" + index, param.type)),
      sexp("result", "i32"),
      sexp("local", "$struct_start_address", "i32"),

      // struct_start_address = malloc(1 * 4 + params.length * 4) where first i32 is for constructor id
      sexp("i32.const", ((params.length + 1) * 4).toString(10)),
      sexp("call", "$mem_alloc"),
      sexp("local.set", "$struct_start_address"),

      // mem[0] is constructor id
      sexp(
        "i32.store",
        sexp("local.get", "$struct_start_address"),
        sexp("i32.const", numericId.toString())
      ),
      ...params.map((_, index) => {
        const address = sexp(
          "i32.add",
          sexp("local.get", "$struct_start_address"),
          sexp("i32.const", ((index + 1) * 4).toString(10))
        );
        return sexp("i32.store", address, sexp("local.get", "$param" + index));
      }),

      sexp("local.get", "$struct_start_address")
    ),
  ];
};

type Ctx = {
  // <VariantName, IntId>
  enums: Record<
    string,
    {
      numericId: number;
      params: WasmType[];
    }
  >;
};

export const compileModule = (tlds: TopLevelDefinition[]): SExp => {
  const functions = tlds.filter(isFunctionDeclaration);
  const enumDeclarations = tlds.filter(isEnumDeclaration);
  const ffiDeclataions = tlds.filter(isFfiDeclaration);

  const enumsRecord = Object.fromEntries(
    enumDeclarations
      .flatMap((e) => e.variants)
      .map(({ name, params }, index) => [name, { numericId: index, params }])
  );

  // console.dir(enumsRecord, { depth: null });

  const enums = Object.entries(enumsRecord).flatMap(([name, { numericId, params }]) =>
    compileEnumConstructor(name, numericId, params)
  );

  const ffiFunctions = ffiDeclataions.flatMap(compileFfiDefinition);

  const expressions = functions.flatMap(compileFunctionDefinition({ enums: enumsRecord }));
  return sexp(
    "module",
    ...imports,
    ...memoryManagement(),
    ...enums,
    ...ffiFunctions,
    ...expressions
  );
};
