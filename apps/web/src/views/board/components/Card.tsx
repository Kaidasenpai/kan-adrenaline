import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { isBefore, isSameYear, startOfDay } from "date-fns";
import { HiOutlinePaperClip } from "react-icons/hi";
import {
  HiBars3BottomLeft,
  HiChatBubbleLeft,
  HiOutlineClock,
} from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import Avatar from "~/components/Avatar";
import Badge from "~/components/Badge";
import CircularProgress from "~/components/CircularProgress";
import LabelIcon from "~/components/LabelIcon";
import { useLocalisation } from "~/hooks/useLocalisation";
import { getAvatarUrl } from "~/utils/helpers";

const Card = ({
  title,
  ticketNumber,
  labels,
  members,
  checklists,
  description,
  comments,
  attachments,
  dueDate,
}: {
  title: string;
  ticketNumber?: string | null;
  labels: { name: string; colourCode: string | null }[];
  members: {
    publicId: string;
    email: string;
    user: { name: string | null; email: string; image: string | null } | null;
  }[];
  checklists: {
    publicId: string;
    name: string;
    items: {
      publicId: string;
      title: string;
      completed: boolean;
      index: number;
    }[];
  }[];
  description: string | null;
  comments: { publicId: string }[];
  attachments?: { publicId: string }[];
  dueDate?: Date | null;
}) => {
  useLingui();
  const { formatDate, formatNumber } = useLocalisation();
  const showYear = dueDate ? !isSameYear(dueDate, new Date()) : false;
  const isOverdue = dueDate ? isBefore(dueDate, startOfDay(new Date())) : false;
  const completedItems = checklists.reduce((acc, checklist) => {
    return acc + checklist.items.filter((item) => item.completed).length;
  }, 0);

  const totalItems = checklists.reduce((acc, checklist) => {
    return acc + checklist.items.length;
  }, 0);

  const progress =
    totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const hasDescription =
    description && description.replace(/<[^>]*>/g, "").trim().length > 0;
  const hasAttachments = attachments && attachments.length > 0;
  const hasDueDate = !!dueDate;

  return (
    <div className="flex min-h-[76px] flex-col overflow-hidden rounded-lg border border-light-300 bg-white px-4 py-3.5 text-sm text-neutral-900 hover:border-light-500 dark:border-dark-300 dark:bg-dark-200 dark:text-dark-1000 dark:hover:border-dark-500">
      {ticketNumber && (
        <span className="mb-1.5 text-[10px] font-medium tabular-nums tracking-[0.04em] text-light-800 dark:text-dark-800">
          <bdi dir="ltr">{ticketNumber}</bdi>
        </span>
      )}
      <span className="break-words font-semibold leading-6">
        <bdi>{title}</bdi>
      </span>
      {labels.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {labels.map((label) => (
            <Badge
              key={`${label.name}-${label.colourCode ?? ""}`}
              value={label.name}
              iconLeft={<LabelIcon colourCode={label.colourCode} />}
            />
          ))}
        </div>
      )}
      {members.length ||
      checklists.length > 0 ||
      hasDescription ||
      comments.length > 0 ||
      hasDueDate ||
      hasAttachments ? (
        <div className="mt-3 flex flex-col justify-end border-t border-light-200 pt-2.5 dark:border-dark-300">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2.5">
              {hasDescription && (
                <div className="flex items-center gap-1 text-light-700 dark:text-dark-800">
                  <HiBars3BottomLeft
                    className="h-3.5 w-3.5"
                    aria-hidden="true"
                  />
                  <span className="sr-only">{t`Description`}</span>
                </div>
              )}
              {dueDate && (
                <div
                  className={twMerge(
                    "flex items-center gap-1 rounded px-1.5 py-0.5",
                    isOverdue
                      ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                      : "bg-light-200 text-light-800 dark:bg-dark-300 dark:text-dark-900",
                  )}
                >
                  <HiOutlineClock className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="sr-only">{t`Due date`}</span>
                  <span className="text-[11px]">
                    {formatDate(dueDate, {
                      day: "numeric",
                      month: "short",
                      ...(showYear ? { year: "numeric" as const } : {}),
                    })}
                  </span>
                </div>
              )}
              {comments.length > 0 && (
                <div className="flex items-center gap-1 text-light-700 dark:text-dark-800">
                  <HiChatBubbleLeft
                    className="h-3.5 w-3.5"
                    aria-hidden="true"
                  />
                  <span className="text-[11px] tabular-nums">
                    {formatNumber(comments.length)}
                  </span>
                  <span className="sr-only">{t`Comments`}</span>
                </div>
              )}
              {hasAttachments && (
                <div className="flex items-center gap-1 text-light-700 dark:text-dark-800">
                  <HiOutlinePaperClip
                    className="h-3.5 w-3.5"
                    aria-hidden="true"
                  />
                  <span className="text-[11px] tabular-nums">
                    {formatNumber(attachments.length)}
                  </span>
                  <span className="sr-only">{t`Attachments`}</span>
                </div>
              )}
            </div>
            <div className="ms-auto flex items-center justify-end gap-2">
              {checklists.length > 0 && (
                <div className="flex items-center gap-1.5 rounded-md bg-light-200 px-1.5 py-1 dark:bg-dark-300">
                  <CircularProgress
                    progress={progress || 2}
                    size="sm"
                    className="flex-shrink-0"
                  />
                  <span
                    dir="ltr"
                    className="text-[11px] tabular-nums text-light-900 dark:text-dark-950"
                  >
                    {formatNumber(completedItems)}/{formatNumber(totalItems)}
                  </span>
                </div>
              )}
              {members.length > 0 && (
                <div className="isolate flex justify-end -space-x-1 overflow-hidden rtl:space-x-reverse">
                  {members.map(({ publicId, user, email }) => {
                    const avatarUrl = user?.image
                      ? getAvatarUrl(user.image)
                      : undefined;

                    return (
                      <Avatar
                        key={publicId}
                        name={user?.name ?? ""}
                        email={user?.email ?? email}
                        imageUrl={avatarUrl}
                        size="sm"
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Card;
