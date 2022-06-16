export const absurd = (_: never) => {
  throw new Error("Unexpected result");
};

export type T<A, Body = {}> = {
  _type: A;
} & Body;

export function t<A extends string>(a: A): T<A> {
  return { _type: a };
}
