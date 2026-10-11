import Link from "next/link";
import { t } from "@lingui/core/macro";
import {
  HiArrowRight,
  HiLockClosed,
  HiOutlineGlobeAlt,
  HiOutlineRectangleStack,
  HiOutlineStar,
  HiStar,
} from "react-icons/hi2";

import Button from "~/components/Button";
import LabelIcon from "~/components/LabelIcon";
import { Tooltip } from "~/components/Tooltip";
import { usePermissions } from "~/hooks/usePermissions";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";

export function BoardsList({
  isTemplate,
  archived = false,
}: {
  isTemplate?: boolean;
  archived?: boolean;
}) {
  const { workspace } = useWorkspace();
  const { openModal } = useModal();
  const { showPopup } = usePopup();
  const { canCreateBoard } = usePermissions();
  const utils = api.useUtils();

  const updateBoard = api.board.update.useMutation({
    onSuccess: () => {
      void utils.board.all.invalidate();
    },
    onError: () => {
      showPopup({
        header: t`Unable to update favorite`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
  });

  const { data, isLoading, isError, refetch } = api.board.all.useQuery(
    {
      workspacePublicId: workspace.publicId,
      type: isTemplate ? "template" : "regular",
      archived,
    },
    { enabled: !!workspace.publicId },
  );

  const handleToggleFavorite = (
    e: React.MouseEvent,
    boardPublicId: string,
    currentFavorite: boolean,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    updateBoard.mutate({
      boardPublicId,
      favorite: !currentFavorite,
    });
  };

  const moreColumns = (count: number) =>
    count === 1 ? t`1 more column` : t`${count} more columns`;

  if (isLoading || !workspace.publicId) {
    return (
      <div
        aria-busy="true"
        aria-label={t`Loading boards`}
        className="grid grid-cols-1 gap-6 lg:grid-cols-2"
      >
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className={`min-h-[280px] animate-pulse rounded-xl border border-light-400 bg-white p-6 motion-reduce:animate-none dark:border-dark-500 dark:bg-dark-100 ${index === 2 ? "lg:col-span-2" : ""}`}
          >
            <div className="h-6 w-1/3 rounded bg-light-300 dark:bg-dark-400" />
            <div className="mt-4 h-5 w-20 rounded bg-light-200 dark:bg-dark-300" />
            <div className="mt-5 grid h-36 grid-cols-3 gap-2 xl:grid-cols-5">
              {[0, 1, 2, 3, 4].map((column) => (
                <div
                  key={column}
                  className={`rounded bg-light-200 dark:bg-dark-300 ${column > 2 ? "hidden xl:block" : ""}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div
        role="alert"
        className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-light-400 bg-white p-8 text-center dark:border-dark-500 dark:bg-dark-100"
      >
        <h2 className="text-xl font-semibold text-light-1000 dark:text-dark-1000">
          {t`Unable to load boards`}
        </h2>
        <p className="mb-6 mt-2 text-sm text-light-950 dark:text-dark-950">
          {t`Please try again later, or contact customer support.`}
        </p>
        <Button variant="secondary" onClick={() => void refetch()}>
          {t`Try again`}
        </Button>
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="flex min-h-[340px] flex-col items-center justify-center rounded-xl border border-light-400 bg-white px-6 py-12 text-center dark:border-dark-500 dark:bg-dark-100">
        <HiOutlineRectangleStack
          aria-hidden="true"
          className="mb-5 h-9 w-9 text-light-950 dark:text-dark-950"
        />
        <h2 className="text-xl font-semibold text-light-1000 dark:text-dark-1000">
          {archived
            ? t`No archived boards`
            : isTemplate
              ? t`No templates`
              : t`No boards`}
        </h2>
        <p className="mb-7 mt-2 max-w-sm text-sm leading-relaxed text-light-950 dark:text-dark-950">
          {archived
            ? t`Boards you archive will appear here.`
            : isTemplate
              ? t`Get started by creating a new template`
              : t`Get started by creating a new board`}
        </p>
        {!archived && (
          <Tooltip
            content={!canCreateBoard ? t`You don't have permission` : undefined}
          >
            <Button
              onClick={() => {
                if (canCreateBoard) openModal("NEW_BOARD");
              }}
              disabled={!canCreateBoard}
            >
              {isTemplate ? t`New template` : t`New board`}
            </Button>
          </Tooltip>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {data.map((board, index) => {
        const visibleLists = board.lists.slice(0, 5);
        const additionalDesktopLists = Math.max(board.lists.length - 5, 0);
        const additionalMobileLists = Math.max(board.lists.length - 3, 0);

        return (
          <article
            key={board.publicId}
            className={`group relative min-w-0 rounded-xl border border-light-400 bg-white hover:border-light-700 dark:border-dark-500 dark:bg-dark-100 dark:hover:border-dark-700 ${
              data.length === 3 && index === 2 ? "lg:col-span-2" : ""
            }`}
          >
            <Link
              href={`/${isTemplate ? "templates" : "boards"}/${board.publicId}`}
              aria-label={t`Open ${board.name}`}
              className="focus-visible:outline-brand-accent dark:focus-visible:outline-brand-lime block h-full rounded-xl p-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 sm:p-6"
            >
              <div className="flex items-start justify-between gap-5">
                <h2 className="min-w-0 break-words pr-9 text-2xl font-bold leading-tight tracking-[-0.02em] text-light-1000 dark:text-dark-1000">
                  {board.name}
                </h2>
                <HiArrowRight
                  aria-hidden="true"
                  className="mt-1 h-5 w-5 shrink-0 text-light-950 dark:text-dark-950"
                />
              </div>
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-light-200 px-2.5 py-1 text-xs font-medium text-light-950 dark:bg-dark-300 dark:text-dark-950">
                {board.visibility === "public" ? (
                  <HiOutlineGlobeAlt
                    aria-hidden="true"
                    className="h-3.5 w-3.5"
                  />
                ) : (
                  <HiLockClosed aria-hidden="true" className="h-3.5 w-3.5" />
                )}
                {board.visibility === "public" ? t`Public` : t`Private`}
              </span>
              {visibleLists.length ? (
                <ol
                  aria-label={t`Board workflow`}
                  className="mt-5 flex min-h-[184px] gap-2 xl:min-h-[192px]"
                >
                  {visibleLists.map((list, listIndex) => (
                    <li
                      key={list.publicId}
                      className={`min-w-0 flex-1 flex-col rounded-md bg-light-200 px-3 py-4 dark:bg-dark-300 ${listIndex > 2 ? "hidden xl:flex" : "flex"}`}
                    >
                      <span className="break-words text-xs font-semibold leading-relaxed text-light-1000 dark:text-dark-1000">
                        {list.name}
                      </span>
                      <span
                        aria-hidden="true"
                        className={`mt-3 block h-[3px] w-7 rounded-full ${listIndex === 0 ? "bg-brand-lime" : "bg-light-600 dark:bg-dark-600"}`}
                      />
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="mt-5 flex min-h-[184px] items-center justify-center rounded-md bg-light-200 px-5 text-sm text-light-950 dark:bg-dark-300 dark:text-dark-950 xl:min-h-[192px]">
                  {t`No columns yet`}
                </div>
              )}
              {(additionalMobileLists > 0 || board.labels.length > 0) && (
                <div
                  className={`mt-4 flex flex-wrap items-center gap-2 ${additionalDesktopLists === 0 && board.labels.length === 0 ? "xl:hidden" : ""}`}
                >
                  {additionalMobileLists > 0 && (
                    <span className="text-xs text-light-950 dark:text-dark-950 xl:hidden">
                      {moreColumns(additionalMobileLists)}
                    </span>
                  )}
                  {additionalDesktopLists > 0 && (
                    <span className="hidden text-xs text-light-950 dark:text-dark-950 xl:inline">
                      {moreColumns(additionalDesktopLists)}
                    </span>
                  )}
                  {board.labels.slice(0, 3).map((label) => (
                    <span
                      key={label.publicId}
                      className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-light-400 px-2.5 py-1 text-xs text-light-950 dark:border-dark-500 dark:text-dark-950"
                    >
                      <LabelIcon colourCode={label.colourCode} />
                      <span className="truncate">{label.name}</span>
                    </span>
                  ))}
                  {board.labels.length > 3 && (
                    <span className="text-xs text-light-950 dark:text-dark-950">
                      {t`+${board.labels.length - 3} more`}
                    </span>
                  )}
                </div>
              )}
            </Link>
            <button
              type="button"
              aria-label={
                board.favorite ? t`Remove from favorites` : t`Add to favorites`
              }
              aria-pressed={board.favorite}
              disabled={updateBoard.isPending}
              onClick={(event) =>
                handleToggleFavorite(event, board.publicId, board.favorite)
              }
              className={`focus-visible:outline-brand-accent dark:focus-visible:outline-brand-lime absolute right-11 top-3.5 flex h-11 w-11 items-center justify-center rounded-md hover:bg-light-200 focus-visible:outline focus-visible:outline-2 disabled:opacity-50 dark:hover:bg-dark-300 sm:right-12 sm:top-5 ${
                board.favorite
                  ? "text-brand-accent dark:text-brand-lime"
                  : "text-light-950 dark:text-dark-950 lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100"
              }`}
            >
              {board.favorite ? (
                <HiStar aria-hidden="true" className="h-5 w-5" />
              ) : (
                <HiOutlineStar aria-hidden="true" className="h-5 w-5" />
              )}
            </button>
          </article>
        );
      })}
    </div>
  );
}
