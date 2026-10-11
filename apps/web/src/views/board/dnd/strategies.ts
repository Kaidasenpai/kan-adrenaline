import type { ClientRect } from "@dnd-kit/core";
import type { SortingStrategy } from "@dnd-kit/sortable";
import { horizontalListSortingStrategy } from "@dnd-kit/sortable";

function mirrorHorizontalRect(rect: ClientRect): ClientRect {
  return { ...rect, left: -rect.right, right: -rect.left };
}

// The stock horizontal strategy expects rectangles in left-to-right order.
// Mirror the geometry for its calculation, then restore the screen-space X.
export const rtlHorizontalListSortingStrategy: SortingStrategy = (args) => {
  const transform = horizontalListSortingStrategy({
    ...args,
    rects: args.rects.map(mirrorHorizontalRect),
    activeNodeRect: args.activeNodeRect
      ? mirrorHorizontalRect(args.activeNodeRect)
      : null,
  });
  return transform
    ? { ...transform, x: transform.x === 0 ? 0 : -transform.x }
    : null;
};
