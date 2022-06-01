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

export const compileModule = (functions: FunctionDeclaration[]): SExp => {
  const expressions = functions.flatMap(compileFunctionDefinition);
  return sexp("module", ...expressions);
};
