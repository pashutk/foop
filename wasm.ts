import {
  Deps,
  Expression,
  FfiDeclaration,
  FunctionDeclaration,
  isEnumDeclaration,
  isFfiDeclaration,
  isFunctionDeclaration,
  TopLevelDefinition,
  WasmType,
} from "./parser";
import { absurd, T } from "./utils";

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

      case "Float":
        return {
          localNames: [],
          exp: [sexp("f32.const", exp.value)],
        };

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
        return {
          localNames: [],
          exp: [sexp("local.get", "$" + (ctx.replaceIdentifiers[exp.name] ?? exp.name))],
        };

      // Currently match expr works only with constructors as an argument
      case "MatchExp": {
        const varName = `var_${Math.floor(Math.random() * 100000).toString(10)}`;

        const cases = exp.cases.map((c) => [c.pattern, c.expression] as const);
        cases.reverse();
        const locals: string[] = [];
        const compiledMatch = cases.reduce((elseClause, [pattern, expression]) => {
          const { localNames, exp: compiledExp } =
            pattern._type === "MatcherConstructorPattern"
              ? compileExpression({
                  ...ctx,
                  replaceIdentifiers: {
                    ...ctx.replaceIdentifiers,
                    ...Object.fromEntries(
                      pattern.params.map((name) => [name, `${varName}_${name}`])
                    ),
                  },
                })(expression)
              : compileExpression(ctx)(expression);

          locals.push(...localNames);
          switch (pattern._type) {
            case "MatcherOtherwisePattern": {
              return sexp(
                "if",
                sexp("result", "i32"),
                sexp("i32.const", "1"),
                sexp("then", ...compiledExp),
                sexp("else", sexp("unreachable"))
              );
            }

            case "MatcherConstructorPattern": {
              if (pattern.params) {
                locals.push(...pattern.params.map((name) => `${varName}_${name}`));
              }
              return sexp(
                "if",
                sexp("result", "i32"),
                sexp(
                  "i32.eq",
                  sexp("i32.load", sexp("local.get", "$" + varName)),
                  sexp(
                    "i32.const",
                    ctx.enums[pattern.contructorName]?.numericId.toString(10) ?? "-1"
                  )
                ),
                sexp(
                  "then",
                  ...pattern.params.flatMap((name, index) => {
                    const address = sexp(
                      "i32.add",
                      sexp("local.get", "$" + varName),
                      sexp("i32.const", ((index + 1) * 4).toString(10))
                    );
                    return [
                      sexp("local.set", "$" + `${varName}_${name}`, sexp("i32.load", address)),
                    ];
                  }),
                  ...compiledExp
                ),
                sexp("else", elseClause)
              );
            }

            case "MatcherValuePattern": {
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
            default:
              return absurd(pattern);
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
  // Use named params as $param1, $param2
  fn.params.forEach(({ name, type }) => def.push(sexp("param", "$" + name, type.type)));
  if (fn.returnType._type === "WasmType") {
    def.push(sexp("result", fn.returnType.type));
  }

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
    def.push(sexp("local", "$" + b.name, b.type.type));
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
      ...ffi.params.map((param) => sexp("param", "$" + param.name, param.type.type)),
      ...(ffi.returnType._type === "WasmType" ? [sexp("result", ffi.returnType.type)] : []),
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

const wasiImports: SExp[] = [
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

const wasm4Imports: SExp[] = [
  // (; Copies pixels to the framebuffer. ;)
  // (import "env" "blit" (func $blit (param i32 i32 i32 i32 i32 i32)))
  sexp(
    "import",
    '"env"',
    '"blit"',
    sexp("func", "$blit", sexp("param", "i32", "i32", "i32", "i32", "i32", "i32"))
  ),

  // (; Copies a subregion within a larger sprite atlas to the framebuffer. ;)
  // (import "env" "blitSub" (func $blitSub (param i32 i32 i32 i32 i32 i32 i32 i32 i32)))
  sexp(
    "import",
    '"env"',
    '"blitSub"',
    sexp(
      "func",
      "$blitSub",
      sexp("param", "i32", "i32", "i32", "i32", "i32", "i32", "i32", "i32", "i32")
    )
  ),

  // (; Draws a line between two points. ;)
  // (import "env" "line" (func $line (param i32 i32 i32 i32)))
  sexp(
    "import",
    '"env"',
    '"line"',
    sexp("func", "$line", sexp("param", "i32", "i32", "i32", "i32"))
  ),

  // (; Draws a horizontal line. ;)
  // (import "env" "hline" (func $hline (param i32 i32 i32)))
  sexp("import", '"env"', '"hline"', sexp("func", "$hline", sexp("param", "i32", "i32", "i32"))),

  // (; Draws a vertical line. ;)
  // (import "env" "vline" (func $vline (param i32 i32 i32)))
  sexp("import", '"env"', '"vline"', sexp("func", "$vline", sexp("param", "i32", "i32", "i32"))),

  // (; Draws an oval (or circle). ;)
  // (import "env" "oval" (func $oval (param i32 i32 i32 i32)))
  sexp(
    "import",
    '"env"',
    '"oval"',
    sexp("func", "$oval", sexp("param", "i32", "i32", "i32", "i32"))
  ),

  // (; Draws a rectangle. ;)
  // (import "env" "rect" (func $rect (param i32 i32 i32 i32)))
  sexp(
    "import",
    '"env"',
    '"rect"',
    sexp("func", "$rect", sexp("param", "i32", "i32", "i32", "i32"))
  ),

  // (; Draws text using the built-in system font. ;)
  // (import "env" "text" (func $text (param i32 i32 i32)))
  sexp("import", '"env"', '"text"', sexp("func", "$text", sexp("param", "i32", "i32", "i32"))),

  // ;; ┌───────────────────────────────────────────────────────────────────────────┐
  // ;; │                                                                           │
  // ;; │ Sound Functions                                                           │
  // ;; │                                                                           │
  // ;; └───────────────────────────────────────────────────────────────────────────┘
  // (; Plays a sound tone. ;)
  // (import "env" "tone" (func $tone (param i32 i32 i32 i32)))
  sexp(
    "import",
    '"env"',
    '"tone"',
    sexp("func", "$tone", sexp("param", "i32", "i32", "i32", "i32"))
  ),

  // ;; ┌───────────────────────────────────────────────────────────────────────────┐
  // ;; │                                                                           │
  // ;; │ Storage Functions                                                         │
  // ;; │                                                                           │
  // ;; └───────────────────────────────────────────────────────────────────────────┘
  // (; Reads up to `size` bytes from persistent storage into the pointer `dest`. ;)
  // (import "env" "diskr" (func $diskr (param i32 i32)))
  sexp("import", '"env"', '"diskr"', sexp("func", "$diskr", sexp("param", "i32", "i32"))),

  // (; Writes up to `size` bytes from the pointer `src` into persistent storage. ;)
  // (import "env" "diskw" (func $diskw (param i32 i32)))
  sexp("import", '"env"', '"diskw"', sexp("func", "$diskw", sexp("param", "i32", "i32"))),

  // (; Prints a message to the debug console. ;)
  // (import "env" "trace" (func $trace (param i32)))
  sexp("import", '"env"', '"trace"', sexp("func", "$trace", sexp("param", "i32"))),

  // (; Prints a message to the debug console. ;)
  // (import "env" "tracef" (func $tracef (param i32 i32)))
  sexp("import", '"env"', '"tracef"', sexp("func", "$tracef", sexp("param", "i32", "i32"))),
];

const getImports = ({ wasi, wasm4 }: ImportsSettings): SExp[] =>
  (wasi ? wasiImports : []).concat(wasm4 ? wasm4Imports : []);

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
  replaceIdentifiers: Record<string, string>;
};

const compileModule = (
  tlds: TopLevelDefinition[],
  { imports: importsSettings }: { imports: ImportsSettings }
): SExp => {
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

  const expressions = functions.flatMap(
    compileFunctionDefinition({ enums: enumsRecord, replaceIdentifiers: {} })
  );
  return sexp(
    "module",
    ...getImports(importsSettings),
    ...memoryManagement(),
    ...enums,
    ...ffiFunctions,
    ...expressions
  );
};

const topologicalSortFrom = <A, NodeId extends string>(
  xs: A[],
  id: (a: A) => NodeId,
  edges: (a: A) => NodeId[],
  _start?: A
): A[] | undefined => {
  if (xs.length === 0) {
    return [];
  }

  const resultIds: NodeId[] = [];
  const visitedIds = new Set<NodeId>();

  const first = xs.find((x) => edges(x).length === 0);
  if (!first) {
    return undefined;
  }

  resultIds.push(id(first));
  visitedIds.add(id(first));

  let retries = xs.length;

  while (resultIds.length !== xs.length && retries > 0) {
    for (const node of xs) {
      const nid = id(node);
      if (visitedIds.has(nid)) {
        continue;
      }

      const nodeEdges = edges(node);
      if (nodeEdges.every((edgeId) => visitedIds.has(edgeId))) {
        const nid = id(node);
        resultIds.push(nid);
        visitedIds.add(nid);
        break;
      } else {
        continue;
      }
    }
    retries--;
  }

  const map = new Map(xs.map((x) => [id(x), x]));
  return resultIds.map((nid) => map.get(nid)!);
};

type ImportsSettings = {
  wasi: boolean;
  wasm4: boolean;
};

export const compileDeps = ({ deps }: Deps, { imports }: { imports: ImportsSettings }): SExp => {
  const depsWithIds = Array.from(deps.entries()).map(([key, value]) => ({ ...value, key }));
  const sorted = topologicalSortFrom(
    depsWithIds,
    ({ key }) => key,
    ({ imports }) => imports
  );
  if (!sorted) {
    throw new Error("Error resolving deps");
  }

  const tlds = sorted.flatMap(({ tlds }) => tlds);
  return compileModule(tlds, { imports });
};

type Declaration =
  | T<
      "Function",
      {
        returnType: WasmType;
      }
    >
  | T<
      "LetBinding",
      {
        type: WasmType;
      }
    >;

type Scope = Record<string, Declaration>;

const inferExpType = (exp: Expression, scope: Scope): WasmType => {
  switch (exp._type) {
    case "Int":
    case "Str":
      return WasmType("i32");

    case "Float":
      return WasmType("f32");

    case "FunctionApplication": {
      const x = scope[exp.name.name];
      if (x === undefined) {
        throw new Error(
          `Failed to infer a type of function application ${exp.name.name}(): No declaration in current scope`
        );
      }

      if (x._type !== "Function") {
        throw new Error(
          `Failed to infer a type of function application ${exp.name.name}(): Scope contains a declaration but it's not a function`
        );
      }

      return x.returnType;
    }

    case "Identificator": {
      const x = scope[exp.name];
      if (x === undefined) {
        throw new Error(
          `Failed to infer a type of identifier ${exp.name}: No declaration in current scope`
        );
      }

      if (x._type !== "LetBinding") {
        throw new Error(
          `Failed to infer a type of identifier ${exp.name}: Scope contains a declaration but it's not a let binding`
        );
      }

      return x.type;
    }

    // TODO: Use all cases to determine return type instead of a first one only
    case "MatchExp": {
      const { cases } = exp;
      const firstExpression = cases[0]?.expression;
      if (!firstExpression) {
        throw new Error(`Failed to infer a type of match expression: 0 cases`);
      }

      return inferExpType(firstExpression, scope);
    }

    default:
      return absurd(exp);
  }
};
