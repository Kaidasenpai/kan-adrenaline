import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { useLayoutEffect, useMemo, useRef, useState } from "react";

import type { ListBodyDragData } from "../dnd/types";
import type { BoardCard } from "../types";
import { isPlaceholderPublicId } from "~/utils/helpers";
import { getListBodyId } from "../dnd/ids";
import SortableCard from "./SortableCard";

interface CardListProps {
  listPublicId: string;
  cards: BoardCard[];
  cardPrefix: string;
  canEditCard: boolean;
  freezeHeight: boolean;
  getCardHref: (cardPublicId: string) => string;
  onContextMenu: (event: React.MouseEvent, cardPublicId: string) => void;
}

export default function CardList({
  listPublicId,
  cards,
  cardPrefix,
  canEditCard,
  freezeHeight,
  getCardHref,
  onContextMenu,
}: CardListProps) {
  useLingui();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [minHeightPx, setMinHeightPx] = useState(0);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const column = container?.parentElement;
    if (!freezeHeight || !container || !column) {
      setMinHeightPx(0);
      return;
    }

    const updateFrozenHeight = () => {
      const bodyRect = container.getBoundingClientRect();
      const columnRect = column.getBoundingClientRect();
      const columnStyle = getComputedStyle(column);
      const bottomInset =
        parseFloat(columnStyle.paddingBottom) +
        parseFloat(columnStyle.borderBottomWidth);
      const availableHeight = Math.max(
        0,
        columnRect.bottom - bodyRect.top - bottomInset,
      );
      setMinHeightPx(Math.round(Math.min(bodyRect.height, availableHeight)));
    };

    updateFrozenHeight();
    const observer = new ResizeObserver(updateFrozenHeight);
    observer.observe(column);
    return () => observer.disconnect();
  }, [freezeHeight, cards]);

  const { setNodeRef, isOver } = useDroppable({
    id: getListBodyId(listPublicId),
    data: { type: "LIST_BODY", listPublicId } satisfies ListBodyDragData,
    disabled: isPlaceholderPublicId(listPublicId),
  });

  const cardIds = useMemo(() => cards.map((card) => card.publicId), [cards]);

  return (
    <div
      ref={(node) => {
        containerRef.current = node;
        setNodeRef(node);
      }}
      data-list-scroll-id={listPublicId}
      style={{
        minHeight: minHeightPx,
        transition: "min-height 200ms ease-out",
      }}
      onTransitionEnd={(e) => {
        if (e.propertyName === "min-height" && !freezeHeight) {
          setMinHeightPx(0);
        }
      }}
      className={`scrollbar-track-rounded-[4px] scrollbar-thumb-rounded-[4px] scrollbar-w-[8px] z-10 min-h-0 shrink overflow-y-auto overflow-x-hidden pb-[calc(0.75rem+env(safe-area-inset-bottom))] pe-1 scrollbar dark:scrollbar-track-dark-100 dark:scrollbar-thumb-dark-600 ${isOver && canEditCard ? "ring-brand-accent dark:ring-brand-lime rounded-lg ring-2 ring-inset" : ""}`}
    >
      <div ref={contentRef} className="px-0.5">
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <SortableCard
              key={card.publicId}
              card={card}
              listPublicId={listPublicId}
              cardPrefix={cardPrefix}
              cardHref={getCardHref(card.publicId)}
              canEditCard={canEditCard}
              onContextMenu={onContextMenu}
            />
          ))}
          {cards.length === 0 && (
            <div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed border-light-400 px-5 py-8 text-center text-xs leading-5 text-light-800 dark:border-dark-400 dark:text-dark-800">
              {canEditCard ? t`Drop cards here` : t`No cards yet`}
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
}
