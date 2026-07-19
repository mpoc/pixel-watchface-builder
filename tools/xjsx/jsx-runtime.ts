// Tiny JSX runtime that builds fast-xml-builder's preserveOrder tree:
//   { Tag: children[], ":@": { "@_attr": "value" } }
// Attributes that are undefined/null/false are dropped, so conditional
// attributes can be written inline as `angle={glued ? deg : undefined}`.
// Capitalized tags are identifiers to JSX, so `tagsFor` mints them as constants.
// Names are listed, not served from an index signature, because
// noUncheckedIndexedAccess would make those `Tag | undefined` — not callable.

export type XNode = Record<string, any>;
export type Tag = (props: any) => XNode;

export const tagsFor = <const N extends readonly string[]>(
  ...names: N
): { [K in N[number]]: Tag } =>
  Object.fromEntries(names.map((n) => [n, n])) as unknown as {
    [K in N[number]]: Tag;
  };

const Fragment = Symbol.for("xjsx.fragment");

const toChildren = (c: any): XNode[] =>
  (Array.isArray(c) ? c.flat(Infinity) : [c])
    .filter((k) => k !== null && k !== undefined && k !== false && k !== "")
    .map((k) => (typeof k === "object" ? k : { "#text": String(k) }));

// `key` is reserved by the JSX transform and hoisted out of props into the 3rd
// argument — but it is a real WFF attribute (<Metadata key=... />), so put it back.
const jsx = (tag: any, props: any, key?: string): any => {
  const { children, ...rest } = props ?? {};
  const kids = toChildren(children);
  if (tag === Fragment) return kids;
  const attrs = key === undefined ? rest : { key, ...rest };
  const node: XNode = { [tag]: kids };
  const keys = Object.keys(attrs).filter(
    (k) => attrs[k] !== undefined && attrs[k] !== null && attrs[k] !== false,
  );
  if (keys.length)
    node[":@"] = Object.fromEntries(
      keys.map((k) => [`@_${k}`, String(attrs[k])]),
    );
  return node;
};

export { jsx, jsx as jsxs, jsx as jsxDEV, Fragment };

export namespace JSX {
  export type Element = any;
  export type ElementType = any;
  export interface IntrinsicElements {
    [tag: string]: any;
  }
  export interface ElementChildrenAttribute {
    children: {};
  }
}
