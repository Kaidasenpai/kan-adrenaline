import type { ClientRect } from "@dnd-kit/core";
import { describe, expect, it } from "vitest";

import { rtlHorizontalListSortingStrategy } from "./strategies";

function columnRect(left: number, width = 304): ClientRect {
  return {
    left,
    right: left + width,
    width,
    top: 100,
    bottom: 500,
    height: 400,
  };
}

describe("RTL board column sorting", () => {
  const rects = [
    columnRect(1000),
    columnRect(680),
    columnRect(360),
    columnRect(40),
  ];

  it("moves the first column leftward through its visual successors", () => {
    const args = {
      rects,
      activeNodeRect: rects[0] ?? null,
      activeIndex: 0,
      overIndex: 2,
    };

    expect(rtlHorizontalListSortingStrategy({ ...args, index: 0 })?.x).toBe(
      -640,
    );
    expect(rtlHorizontalListSortingStrategy({ ...args, index: 1 })?.x).toBe(
      320,
    );
    expect(rtlHorizontalListSortingStrategy({ ...args, index: 2 })?.x).toBe(
      320,
    );
    expect(rtlHorizontalListSortingStrategy({ ...args, index: 3 })?.x).toBe(0);
  });

  it("moves a later column rightward and closes the vacated space", () => {
    const args = {
      rects,
      activeNodeRect: rects[2] ?? null,
      activeIndex: 2,
      overIndex: 0,
    };

    expect(rtlHorizontalListSortingStrategy({ ...args, index: 2 })?.x).toBe(
      640,
    );
    expect(rtlHorizontalListSortingStrategy({ ...args, index: 0 })?.x).toBe(
      -320,
    );
    expect(rtlHorizontalListSortingStrategy({ ...args, index: 1 })?.x).toBe(
      -320,
    );
    expect(rtlHorizontalListSortingStrategy({ ...args, index: 3 })?.x).toBe(0);
  });

  it("aligns the correct edge when columns have different widths", () => {
    const variableRects = [
      columnRect(680, 280),
      columnRect(360, 304),
      columnRect(84, 260),
    ];
    const args = {
      rects: variableRects,
      activeNodeRect: variableRects[0] ?? null,
      activeIndex: 0,
      overIndex: 2,
    };

    expect(rtlHorizontalListSortingStrategy({ ...args, index: 0 })?.x).toBe(
      -596,
    );
    expect(rtlHorizontalListSortingStrategy({ ...args, index: 1 })?.x).toBe(
      296,
    );
    expect(rtlHorizontalListSortingStrategy({ ...args, index: 2 })?.x).toBe(
      296,
    );
  });

  it("does not invent a transform before rectangle measurements are available", () => {
    expect(
      rtlHorizontalListSortingStrategy({
        rects: [],
        activeNodeRect: null,
        activeIndex: 0,
        overIndex: 1,
        index: 0,
      }),
    ).toBeNull();
  });
});
