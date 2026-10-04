import { describe, expect, it } from "vitest";

import {
  manifestKeyFromHref,
  manifestUrlFromDocument,
  normalizePath,
  stableOrder,
} from "../src/scripts/navigation";

describe("browser navigation adapter", () => {
  it("reads Quartz's base path from the body", () => {
    const document = {
      body: { dataset: { basepath: "/oop-materiaali" } },
      documentElement: { dataset: {} },
    } as unknown as Document;

    expect(manifestUrlFromDocument(document, "https://example.test")).toBe(
      "https://example.test/oop-materiaali/static/custom-file-explorer-sorting.json",
    );
  });

  it("maps nested folder links to their folder key even without a trailing slash", () => {
    const rule = {
      order: ["file:week1/lesson", "folder:week1/exercises", "file:week1/answers"],
      hidden: [],
    };

    expect(
      manifestKeyFromHref(
        "../week1/exercises",
        "https://example.test/course/week1/",
        "course",
        rule,
      ),
    ).toBe("folder:week1/exercises");
  });

  it("uses the manifest order for files and nested folders and keeps unknown items stable", () => {
    const rule = {
      order: ["file:book/first", "file:book/second", "folder:book/exercises"],
      hidden: [],
    };
    const original = [
      { value: "exercises", key: "folder:book/exercises" },
      { value: "unknown-a" },
      { value: "second", key: "file:book/second" },
      { value: "unknown-b" },
      { value: "first", key: "file:book/first" },
    ];

    expect(stableOrder(original, rule).map(({ value }) => value)).toEqual([
      "first",
      "second",
      "exercises",
      "unknown-a",
      "unknown-b",
    ]);
  });

  it("normalizes index routes to the owning folder", () => {
    expect(normalizePath("week1/exercises/index.html")).toBe("week1/exercises");
    expect(normalizePath("index")).toBe("/");
  });
});
