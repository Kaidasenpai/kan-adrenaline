import type { ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { useForm } from "react-hook-form";
import {
  HiEllipsisHorizontal,
  HiOutlinePlusSmall,
  HiOutlineSquaresPlus,
  HiOutlineTrash,
} from "react-icons/hi2";

import { authClient } from "@kan/auth/client";

import type { ListDragData } from "../dnd/types";
import Dropdown from "~/components/Dropdown";
import { Tooltip } from "~/components/Tooltip";
import { useLocalisation } from "~/hooks/useLocalisation";
import { usePermissions } from "~/hooks/usePermissions";
import { useModal } from "~/providers/modal";
import { api } from "~/utils/api";
import { isPlaceholderPublicId } from "~/utils/helpers";

interface ListProps {
  children: ReactNode;
  list: List;
  cardCount?: number;
  setSelectedPublicListId: (publicListId: PublicListId) => void;
}

interface List {
  publicId: string;
  name: string;
  createdBy?: string | null;
}

interface FormValues {
  listPublicId: string;
  name: string;
}

type PublicListId = string;

export default function List({
  children,
  list,
  cardCount = 0,
  setSelectedPublicListId,
}: ListProps) {
  useLingui();
  const { formatNumber } = useLocalisation();
  const { openModal } = useModal();
  const { canCreateCard, canEditList, canDeleteList } = usePermissions();
  const { data: session } = authClient.useSession();
  const isCreator = list.createdBy && session?.user.id === list.createdBy;
  const isOptimistic = isPlaceholderPublicId(list.publicId);
  const canEdit = canEditList || isCreator;
  const canDrag = !isOptimistic && (canEditList || isCreator);

  const openNewCardForm = (publicListId: PublicListId) => {
    if (!canCreateCard || isOptimistic) return;
    openModal("NEW_CARD");
    setSelectedPublicListId(publicListId);
  };

  const updateList = api.list.update.useMutation();

  const { register, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      listPublicId: list.publicId,
      name: list.name,
    },
    values: {
      listPublicId: list.publicId,
      name: list.name,
    },
  });

  const onSubmit = (values: FormValues) => {
    if (!canEdit || isOptimistic) return;
    updateList.mutate({
      listPublicId: values.listPublicId,
      name: values.name,
    });
  };

  const handleOpenDeleteListConfirmation = () => {
    setSelectedPublicListId(list.publicId);
    openModal("DELETE_LIST");
  };

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: list.publicId,
    attributes: { roleDescription: t`Draggable list` },
    data: { type: "LIST" } satisfies ListDragData,
    disabled: { draggable: !canDrag, droppable: false },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      data-board-draggable
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`me-4 flex h-fit max-h-full min-h-0 min-w-[19rem] max-w-[19rem] snap-start flex-col rounded-xl border border-light-300 bg-light-100 p-3 text-neutral-900 dark:border-dark-300 dark:bg-dark-100 md:snap-align-none rtl:snap-end ${
        canDrag ? (isDragging ? "cursor-grabbing" : "cursor-grab") : ""
      }`}
    >
      <div className="mb-3 flex min-h-10 shrink-0 items-center justify-between gap-2 border-b border-light-300 pb-3 dark:border-dark-300">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="min-w-0 flex-1 focus-visible:outline-none"
        >
          <input
            id={`list-name-${list.publicId}`}
            type="text"
            aria-label={t`List name`}
            dir="auto"
            {...register("name")}
            onBlur={handleSubmit(onSubmit)}
            readOnly={!canEdit || isOptimistic}
            className="focus:ring-brand-accent dark:focus:ring-brand-lime w-full rounded border-0 bg-transparent px-1 py-1.5 text-sm font-bold text-neutral-900 focus:ring-2 focus-visible:outline-none dark:text-dark-1000"
          />
        </form>
        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-light-300 px-1.5 text-xs font-semibold tabular-nums text-light-800 dark:bg-dark-200 dark:text-dark-900">
          {formatNumber(cardCount)}
        </span>
        <div className="flex shrink-0 items-center gap-0.5">
          <Tooltip
            content={!canCreateCard ? t`You don't have permission` : undefined}
          >
            <button
              type="button"
              className="focus-visible:outline-brand-accent dark:focus-visible:outline-brand-lime inline-flex h-9 w-9 items-center justify-center rounded-md text-light-900 hover:bg-light-300 focus-visible:outline focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-60 dark:text-dark-900 dark:hover:bg-dark-200"
              onClick={() => openNewCardForm(list.publicId)}
              disabled={!canCreateCard || isOptimistic}
              aria-label={t`Add card`}
            >
              <HiOutlinePlusSmall className="h-5 w-5" aria-hidden="true" />
            </button>
          </Tooltip>
          {(() => {
            const dropdownItems = [
              ...(canCreateCard && !isOptimistic
                ? [
                    {
                      label: t`Add a card`,
                      action: () => openNewCardForm(list.publicId),
                      icon: (
                        <HiOutlineSquaresPlus className="h-[18px] w-[18px] text-dark-900" />
                      ),
                    },
                  ]
                : []),
              ...(!isOptimistic && (canDeleteList || isCreator)
                ? [
                    {
                      label: t`Delete list`,
                      action: handleOpenDeleteListConfirmation,
                      icon: (
                        <HiOutlineTrash className="h-[18px] w-[18px] text-dark-900" />
                      ),
                    },
                  ]
                : []),
            ];

            if (dropdownItems.length === 0) {
              return null;
            }

            return (
              <div className="relative inline-block">
                <Dropdown items={dropdownItems} ariaLabel={t`List options`}>
                  <HiEllipsisHorizontal className="h-5 w-5 text-dark-900" />
                </Dropdown>
              </div>
            );
          })()}
        </div>
      </div>
      {children}
    </div>
  );
}
