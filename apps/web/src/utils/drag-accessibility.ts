import type { DndContextProps, UniqueIdentifier } from "@dnd-kit/core";
import { t } from "@lingui/core/macro";

export function localizedDragAccessibility(
  getItemName: (id: UniqueIdentifier) => string,
  getDestinationName: (id: UniqueIdentifier) => string,
): NonNullable<DndContextProps["accessibility"]> {
  return {
    screenReaderInstructions: {
      draggable: t`Press Space to pick up an item. Use the arrow keys to move it, then press Space to drop it. Press Escape to cancel.`,
    },
    announcements: {
      onDragStart: ({ active }) => t`Moving ${getItemName(active.id)}.`,
      onDragOver: ({ active, over }) =>
        over
          ? t`${getItemName(active.id)} is over ${getDestinationName(over.id)}.`
          : t`No drop destination selected.`,
      onDragEnd: ({ active, over }) =>
        over
          ? t`${getItemName(active.id)} was placed at ${getDestinationName(over.id)}.`
          : t`Item released without moving.`,
      onDragCancel: () => t`Move cancelled.`,
    },
  };
}
