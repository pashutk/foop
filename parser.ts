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

const eof: Parser<void> = (input) => {
  if (input.length) {
    return fail(input, "End of file");
  } else {
    return succeed(undefined, input);
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

type Option<A> =
  | {
      type: "Some";
      value: A;
    }
  | {
      type: "None";
    };

const some = <A>(a: A): Option<A> => ({
  type: "Some",
  value: a,
});

const none: Option<never> = {
  type: "None",
};

const optional =
  <A>(parser: Parser<A>): Parser<Option<A>> =>
  (input) => {
    // const parser = tryParser(p);
    const result = parser(input);
    if (result.type === "success") {
      return succeed(some(result.value), result.input);
    } else {
      return succeed(none, input);
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
        return fail(result.input, s);
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

type UnwrapOneOfParser<A> = A extends Parser<infer T> ? T : never;

type UnwrapOneOfParsers<A extends [...any]> = A extends [infer Head, ...infer Tail]
  ? UnwrapOneOfParser<Head> | UnwrapOneOfParsers<Tail>
  : never;

type MapOneOfParser<A extends [...any]> = Parser<UnwrapOneOfParsers<A>>;

const oneOf = <A extends [Parser<any>, ...any]>(parsers: [...A]): MapOneOfParser<A> => {
  const head = parsers[0];
  return parsers.slice(1).reduce((prev, next) => or(prev, next), head);
};

const between = <A, L, R>(left: Parser<L>, parser: Parser<A>, right: Parser<R>): Parser<A> =>
  map(seq([left, parser, right]), ([, body]) => body);

const space = regex("space", /\s/);

const spaces = many(space);

const trimRight = <A>(parser: Parser<A>): Parser<A> =>
  bind(parser, (a) => bind(spaces, () => of(a)));

const trimLeft = <A>(parser: Parser<A>): Parser<A> => bind(spaces, () => parser);

const symbol = (s: string) => trimRight(string(s));

const lparen = symbol("(");

const rparen = symbol(")");

const betweenParens = <A>(parser: Parser<A>): Parser<A> => between(lparen, parser, rparen);

const lbrace = symbol("{");

const rbrace = symbol("}");

const betweenBraces = <A>(parser: Parser<A>): Parser<A> => between(lbrace, parser, rbrace);

const FunctionKeyword = t("FunctionKeyword");
// type FunctionKeyword = typeof functionKeyword;

const functionKeyword = map(symbol("function"), () => FunctionKeyword);

const Identificator = (name: string): Identificator => ({
  _type: "Identificator",
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

export const isFunctionDeclaration = (a: { _type: string }): a is FunctionDeclaration =>
  a._type === "FunctionDeclaration";

type WasmType = T<
  "WasmType",
  {
    type: "I32";
  }
>;

const WasmTypeParser: Parser<WasmType> = map(symbol("I32"), () => ({
  _type: "WasmType",
  type: "I32",
}));

type EnumVariant = T<
  "EnumVariant",
  {
    name: string;
    params: WasmType[];
  }
>;

export type EnumDeclaration = T<
  "EnumDeclaration",
  {
    name: string;
    variants: EnumVariant[];
  }
>;

export const isEnumDeclaration = (a: { _type: string }): a is EnumDeclaration =>
  a._type === "EnumDeclaration";

type FunctionApplication = T<"FunctionApplication"> & {
  name: Identificator;
  params: Expression[];
};

export type Expression = MatchExp | Value | FunctionApplication | Identificator;

type Int = T<"Int"> & {
  value: string;
};

type Value = Int;

export type AST = FunctionDeclaration | Value;

const functionParameters: Parser<Identificator[]> = betweenParens(
  sepBy(identificator, symbol(","))
);

const digit = regex("digit", /\d/);

const value: Parser<Value> = trimRight(
  map(many1(digit), (digits) => ({
    _type: "Int",
    value: digits.join(""),
  }))
);

const functionApplicationArg: Parser<Expression> = or(
  or(value, (input) => functionApplication(input)),
  identificator
);

const functionApplication: Parser<FunctionApplication> = map(
  seq([identificator, lparen, sepBy(functionApplicationArg, symbol(",")), rparen]),
  ([name, , params]) => ({
    _type: "FunctionApplication",
    name,
    params,
  })
);

type MatcherPattern = T<
  "MatcherPattern",
  {
    contructorName: string;
    params: string[];
  }
>;

type MatcherExp = T<
  "MatcherExp",
  {
    pattern: MatcherPattern;
    expression: Expression;
  }
>;

type MatchExp = T<
  "MatchExp",
  {
    value: Expression;
    cases: MatcherExp[];
  }
>;

const expressionParser: Parser<Expression> = oneOf([
  (input: string) => matchExpParser(input),
  functionApplication,
  value,
  identificator,
]);

const matcherPatternParser: Parser<MatcherPattern> = map(
  seq([identificatorName, optional(betweenParens(sepBy1(identificatorName, symbol(","))))]),
  ([name, boundParams]) => ({
    _type: "MatcherPattern",
    contructorName: name,
    params: boundParams.type === "Some" ? boundParams.value : [],
  })
);

const matcherParser: Parser<MatcherExp> = map(
  seq([matcherPatternParser, symbol("=>"), expressionParser]),
  ([pattern, , expression]) => ({
    _type: "MatcherExp",
    pattern,
    expression,
  })
);

const matchExpParser: Parser<MatchExp> = map(
  seq([symbol("match"), betweenParens(expressionParser), betweenBraces(many1(matcherParser))]),
  ([_matchKeyword, value, cases]) => ({
    _type: "MatchExp",
    value,
    cases,
  })
);

const functionBody: Parser<Expression> = betweenBraces(
  expressionParser
  // or(or(functionApplication, value), identificator),
);

const functionDefinitionParser: Parser<FunctionDeclaration> = map(
  seq([functionKeyword, identificatorName, functionParameters, functionBody]),
  ([_keyword, name, params, body]) => ({
    _type: "FunctionDeclaration",
    name,
    params,
    body,
  })
);

type EnumKeyword = T<"EnumKeyword">;
const EnumKeyword = t("EnumKeyword");

const enumKeyword: Parser<EnumKeyword> = map(symbol("enum"), () => EnumKeyword);

const enumVariantParser: Parser<EnumVariant> = map(
  seq([identificatorName, optional(betweenParens(many1(WasmTypeParser)))]),
  ([name, params]) => ({
    _type: "EnumVariant",
    name,
    params: params.type === "Some" ? params.value : [],
  })
);

const enumDefinitionParser: Parser<EnumDeclaration> = map(
  seq([
    enumKeyword,
    identificatorName,
    between(symbol("{"), sepBy(enumVariantParser, symbol(",")), symbol("}")),
  ]),
  ([, name, variants]) => ({
    _type: "EnumDeclaration",
    name,
    variants,
  })
);

export type TopLevelDefinition = FunctionDeclaration | EnumDeclaration;

const topLevelDefinition = or(functionDefinitionParser, enumDefinitionParser);

export const module = bind(trimLeft(many1(topLevelDefinition)), (result) =>
  bind(eof, () => of(result))
);

export const test = seq([symbol("a"), symbol("b"), optional(symbol("c")), symbol("d"), eof]);
