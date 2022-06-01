import { absurd, T, t } from "./utils";

type ParseSuccess<A> = {
  type: "success";
  value: A;
  input: string;
};

const succeed = <A>(value: A, input: string): ParseSuccess<A> => ({
  type: "success",
  value,
  input,
});

type ParseFailure = {
  type: "failure";
  expected: string;
  input: string;
};

const fail = <A>(input: string, expected: string): ParserResult<A> => ({
  type: "failure",
  expected,
  input,
});

type ParserResult<A> = ParseSuccess<A> | ParseFailure;

type Parser<A> = (input: string) => ParserResult<A>;

const bind =
  <A, B>(parser: Parser<A>, f: (a: A) => Parser<B>): Parser<B> =>
  (input) => {
    const result = parser(input);
    switch (result.type) {
      case "success": {
        const nextParser = f(result.value);
        return nextParser(result.input);
      }
      case "failure":
        return result;
      default:
        return absurd(result);
    }
  };

const map =
  <A, B>(parser: Parser<A>, f: (a: A) => B): Parser<B> =>
  (input) => {
    const result = parser(input);
    if (result.type === "success") {
      return succeed(f(result.value), result.input);
    } else {
      return result;
    }
  };

const of =
  <A>(a: A): Parser<A> =>
  (input) =>
    succeed(a, input);

const anyChar: Parser<string> = (input) => {
  if (input.length) {
    return succeed(input.slice(0, 1), input.slice(1));
  } else {
    return fail(input, "Expected any char but got eof");
  }
};

const tryParser =
  <A>(parser: Parser<A>): Parser<A> =>
  (input) => {
    const result = parser(input);
    if (result.type === "success") {
      return result;
    } else {
      return fail(input, result.expected);
    }
  };

const satisfy = (description: string, check: (a: string) => boolean): Parser<string> => {
  return tryParser(
    bind(anyChar, (char) => {
      if (check(char)) {
        return (input) => succeed(char, input);
      } else {
        return (input) => fail(input, description);
      }
    })
  );
};

const regex = (description: string, regex: RegExp): Parser<string> =>
  satisfy(description, (c) => regex.test(c));

const char = (c: string) => satisfy(c, (a) => a === c);

const string =
  (s: string): Parser<string> =>
  (input) => {
    let values = "";
    let newInput = input;
    for (const c of s) {
      const parser = char(c);
      const result = parser(newInput);
      if (result.type === "failure") {
        return result;
      }
      values = values + result.value;
      newInput = result.input;
    }
    return succeed(values, newInput);
  };

const or =
  <A, B>(parser1: Parser<A>, parser2: Parser<B>): Parser<A | B> =>
  (input) => {
    const result1 = parser1(input);
    if (result1.type === "success") {
      return result1;
    }

    if (result1.input === input) {
      return parser2(input);
    }

    return result1;
  };

const many = <A>(parser: Parser<A>): Parser<A[]> => or(many1(parser), of([]));

const many1 = <A>(parser: Parser<A>): Parser<[A, ...A[]]> => {
  return bind(parser, (head) => bind(many(parser), (tail) => of([head, ...tail])));
};

const sepBy = <A, S>(parser: Parser<A>, parserSep: Parser<S>): Parser<A[]> =>
  or(sepBy1(parser, parserSep), of([]));

const sepBy1 = <A, S>(parser: Parser<A>, parserSep: Parser<S>): Parser<[A, ...A[]]> => {
  const prependedParser = bind(parserSep, () => parser);
  return bind(parser, (head) => bind(many(prependedParser), (tail) => of([head, ...tail])));
};

type UnwrapParser<A> = A extends Parser<infer T> ? T : never;

type UnwrapParsers<A extends [...any]> = A extends [infer Head, ...infer Tail]
  ? [UnwrapParser<Head>, ...UnwrapParsers<Tail>]
  : [];

type Maps<A extends [...any]> = Parser<UnwrapParsers<A>>;

const seq = <A extends [Parser<any>, ...any]>(parsers: [...A]): Maps<A> =>
  tryParser((input) => {
    const values: [...A[]] = [];
    let newInput = input;
    for (const parser of parsers) {
      const result = parser(newInput);
      if (result.type === "failure") {
        return result;
      }
      values.push(result.value);
      newInput = result.input;
    }
    return succeed(values, newInput);
  });

const between = <A, L, R>(left: Parser<L>, parser: Parser<A>, right: Parser<R>): Parser<A> =>
  map(seq([left, parser, right]), ([, body]) => body);

const space = regex("space", /\s/);

const spaces = many(space);

const trimRight = <A>(parser: Parser<A>): Parser<A> =>
  bind(parser, (a) => bind(spaces, () => of(a)));

const symbol = (s: string) => trimRight(string(s));

const FunctionKeyword = t("FunctionKeyword");
// type FunctionKeyword = typeof functionKeyword;

const functionKeyword = map(symbol("function"), () => FunctionKeyword);

const Identificator = (name: string): Identificator => ({
  type: "Identificator",
  name,
});
type Identificator = T<"Identificator"> & {
  name: string;
};

const letter = regex("letter", /\p{L}/u);

const alphanum = regex("alphanum", /\w/);

const identificatorName: Parser<string> = trimRight(
  map(seq([letter, many(alphanum)]), ([head, tail]) => head + tail.join(""))
);

const identificator: Parser<Identificator> = map(identificatorName, Identificator);

export type FunctionDeclaration = T<"FunctionDeclaration"> & {
  name: string;
  params: Identificator[];
  body: Expression;
};

type FunctionApplication = T<"FunctionApplication"> & {
  name: Identificator;
  params: Expression[];
};

export type Expression = Value | FunctionApplication | Identificator;

type Int = T<"Int"> & {
  value: string;
};

type Value = Int;

type ReturnExp = T<"Return"> & {
  body: Value | FunctionApplication | Identificator;
};

export type AST = FunctionDeclaration | ReturnExp | Value;

const functionParameters: Parser<Identificator[]> = between(
  symbol("("),
  sepBy(identificator, symbol(",")),
  symbol(")")
);

const digit = regex("digit", /\d/);

const value: Parser<Value> = trimRight(
  map(many1(digit), (digits) => ({
    type: "Int",
    value: digits.join(""),
  }))
);

const functionApplicationArg: Parser<Value | FunctionApplication | Identificator> = or(
  or(value, (input) => functionApplication(input)),
  identificator
);

const functionApplication: Parser<FunctionApplication> = map(
  seq([identificator, symbol("("), sepBy(functionApplicationArg, symbol(",")), symbol(")")]),
  ([name, , params]) =>
    ({
      type: "FunctionApplication",
      name,
      params,
    } as FunctionApplication)
);

export const functionReturnParser: Parser<ReturnExp> = map(
  seq([symbol("return"), or(or(value, functionApplication), identificator)]),
  ([, body]) => ({
    type: "Return",
    body,
  })
);

const functionBody: Parser<FunctionApplication | Value | Identificator> = between(
  symbol("{"),
  or(or(functionApplication, value), identificator),
  symbol("}")
);

const functionDefinitionParser: Parser<FunctionDeclaration> = map(
  seq([functionKeyword, identificatorName, functionParameters, functionBody]),
  ([_keyword, name, params, body]) => ({
    type: "FunctionDeclaration",
    name,
    params,
    body,
  })
);

export const module = many1(functionDefinitionParser);
