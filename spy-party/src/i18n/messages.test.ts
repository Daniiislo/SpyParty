import { describe, it, expect } from "vitest";
import en from "../../messages/en.json";
import vi from "../../messages/vi.json";

type Messages = { [key: string]: string | Messages };

function flatten(obj: Messages, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) =>
    value !== null && typeof value === "object"
      ? flatten(value, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

function valueAt(obj: Messages, dotted: string): string {
  let cur: string | Messages = obj;
  for (const key of dotted.split(".")) {
    cur = (cur as Messages)[key];
  }
  return cur as string;
}

const enKeys = flatten(en as Messages).sort();
const viKeys = flatten(vi as Messages).sort();

describe("message catalogs", () => {
  it("have identical key sets across en and vi", () => {
    expect(enKeys).toEqual(viKeys);
  });

  it("keep <hl> rich-text tags in sync across locales", () => {
    const hlKeys = (keys: string[], obj: Messages) =>
      keys.filter((k) => valueAt(obj, k).includes("<hl>")).sort();
    expect(hlKeys(enKeys, en as Messages)).toEqual(hlKeys(viKeys, vi as Messages));
  });
});
