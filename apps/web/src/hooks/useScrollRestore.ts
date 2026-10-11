import type { NextRouter } from "next/router";
import type { RefObject } from "react";
import { useEffect, useRef } from "react";

import { useLocalisation } from "~/hooks/useLocalisation";

interface BoardScrollPosition {
  left: number;
  lists: Map<string, number>;
}

const scrollPositions = new Map<string, BoardScrollPosition>();

export function useScrollRestore(
  boardId: string | null | undefined,
  scrollRef: RefObject<HTMLElement | null>,
  router: NextRouter,
  isReady: boolean,
) {
  const { isRTL } = useLocalisation();
  const positionKey = boardId ? `${boardId}:${isRTL ? "rtl" : "ltr"}` : null;
  const restored = useRef(false);

  useEffect(() => {
    if (!positionKey || !isReady) return;
    const container = scrollRef.current;
    if (!container) return;

    restored.current = false;

    const saveScrollPosition = () => {
      const lists = new Map<string, number>();
      container
        .querySelectorAll<HTMLElement>("[data-list-scroll-id]")
        .forEach((list) => {
          const listId = list.dataset.listScrollId;
          if (listId) lists.set(listId, list.scrollTop);
        });
      scrollPositions.set(positionKey, {
        left: container.scrollLeft,
        lists,
      });
    };

    router.events.on("routeChangeStart", saveScrollPosition);
    return () => {
      saveScrollPosition();
      router.events.off("routeChangeStart", saveScrollPosition);
    };
  }, [positionKey, router.events, scrollRef, isReady]);

  useEffect(() => {
    if (restored.current || !isReady || !positionKey) return;

    const saved = scrollPositions.get(positionKey);

    const container = scrollRef.current;
    if (!container) return;
    restored.current = true;

    let frame: number | undefined;
    const restore = () => {
      const lists = container.querySelectorAll<HTMLElement>(
        "[data-list-scroll-id]",
      );
      if (lists.length === 0) return;

      observer.disconnect();
      frame = requestAnimationFrame(() => {
        container.scrollLeft =
          saved?.left ??
          (container.dataset.boardScrollDirection === "rtl"
            ? container.scrollWidth - container.clientWidth
            : 0);
        lists.forEach((list) => {
          const top = saved?.lists.get(list.dataset.listScrollId ?? "");
          if (top !== undefined) list.scrollTop = top;
        });
      });
    };

    const observer = new MutationObserver(restore);
    observer.observe(container, { childList: true, subtree: true });
    restore();

    return () => {
      observer.disconnect();
      if (frame !== undefined) cancelAnimationFrame(frame);
    };
  }, [isReady, scrollRef, positionKey]);
}
