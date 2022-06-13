export const absurd = (_: never) => {
  throw new Error("Unexpected result");
};

export type T<A, Body = {}> = {
  type: A;
} & Body;

export function t<A extends string>(a: A): T<A> {
  return { type: a };
}
