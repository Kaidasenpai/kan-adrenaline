import Link from "next/link";
import { useRouter } from "next/router";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { HiXMark } from "react-icons/hi2";
import { IoChevronForwardSharp } from "react-icons/io5";

import { authClient } from "@kan/auth/client";

import Avatar from "~/components/Avatar";
import Editor from "~/components/Editor";
import FeedbackModal from "~/components/FeedbackModal";
import { LabelForm } from "~/components/LabelForm";
import LabelIcon from "~/components/LabelIcon";
import Modal from "~/components/modal";
import { NewWorkspaceForm } from "~/components/NewWorkspaceForm";
import { PageHead } from "~/components/PageHead";
import { EditYouTubeModal } from "~/components/YouTubeEmbed/EditYouTubeModal";
import { usePermissions } from "~/hooks/usePermissions";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";
import { getBoardReturnUrl } from "~/utils/board-return-url";
import { invalidateCard } from "~/utils/cardInvalidation";
import { formatMemberDisplayName, getAvatarUrl } from "~/utils/helpers";
import { DeleteLabelConfirmation } from "../../components/DeleteLabelConfirmation";
import ActivityList from "./components/ActivityList";
import { AttachmentThumbnails } from "./components/AttachmentThumbnails";
import { AttachmentUpload } from "./components/AttachmentUpload";
import Checklists from "./components/Checklists";
import { DeleteCardConfirmation } from "./components/DeleteCardConfirmation";
import { DeleteChecklistConfirmation } from "./components/DeleteChecklistConfirmation";
import { DeleteCommentConfirmation } from "./components/DeleteCommentConfirmation";
import Dropdown from "./components/Dropdown";
import { DueDateSelector } from "./components/DueDateSelector";
import LabelSelector from "./components/LabelSelector";
import ListSelector from "./components/ListSelector";
import MemberSelector from "./components/MemberSelector";
import { NewChecklistForm } from "./components/NewChecklistForm";
import NewCommentForm from "./components/NewCommentForm";

interface FormValues {
  cardId: string;
  title: string;
  description: string;
}

export function CardRightPanel({ isTemplate }: { isTemplate?: boolean }) {
  useLingui();
  const router = useRouter();
  const { canEditCard } = usePermissions();
  const { data: session } = authClient.useSession();
  const cardId = Array.isArray(router.query.cardId)
    ? router.query.cardId[0]
    : router.query.cardId;

  const { data: card } = api.card.byId.useQuery(
    { cardPublicId: cardId ?? "" },
    { enabled: !!cardId && cardId.length >= 12 },
  );

  const isCreator = card?.createdBy && session?.user.id === card.createdBy;
  const canEdit = canEditCard || isCreator;

  const board = card?.list.board;
  const labels = board?.labels;
  const workspaceMembers = board?.workspace.members;
  const selectedLabels = card?.labels;
  const selectedMembers = card?.members;

  const formattedLabels =
    labels?.map((label) => {
      const isSelected = selectedLabels?.some(
        (selectedLabel) => selectedLabel.publicId === label.publicId,
      );

      return {
        key: label.publicId,
        value: label.name,
        selected: isSelected ?? false,
        leftIcon: <LabelIcon colourCode={label.colourCode} />,
      };
    }) ?? [];

  const formattedLists =
    board?.lists.map((list) => ({
      key: list.publicId,
      value: list.name,
      selected: list.publicId === card?.list.publicId,
    })) ?? [];

  const formattedMembers =
    workspaceMembers?.map((member) => {
      const isSelected = selectedMembers?.some(
        (assignedMember) => assignedMember.publicId === member.publicId,
      );

      return {
        key: member.publicId,
        value: formatMemberDisplayName(
          member.user?.name ?? null,
          member.user?.email ?? member.email,
        ),
        imageUrl: member.user?.image
          ? getAvatarUrl(member.user.image)
          : undefined,
        selected: isSelected ?? false,
        leftIcon: (
          <Avatar
            size="xs"
            name={member.user?.name ?? ""}
            imageUrl={
              member.user?.image ? getAvatarUrl(member.user.image) : undefined
            }
            email={member.user?.email ?? member.email}
          />
        ),
      };
    }) ?? [];

  return (
    <aside className="h-full w-full overflow-y-auto border-s border-light-300 bg-light-100 px-6 py-8 text-light-900 dark:border-dark-300 dark:bg-dark-100 md:w-[280px] xl:w-[300px]">
      <h2 className="mb-7 text-sm font-bold text-light-1000 dark:text-dark-1000">{t`Details`}</h2>
      <div className="mb-6 flex w-full flex-col items-start gap-2">
        <p className="text-xs font-semibold text-light-800 dark:text-dark-800">{t`List`}</p>
        <ListSelector
          cardPublicId={cardId ?? ""}
          lists={formattedLists}
          isLoading={!card}
          disabled={!canEdit}
        />
      </div>
      <div className="mb-6 flex w-full flex-col items-start gap-2">
        <p className="text-xs font-semibold text-light-800 dark:text-dark-800">{t`Labels`}</p>
        <LabelSelector
          cardPublicId={cardId ?? ""}
          labels={formattedLabels}
          isLoading={!card}
          disabled={!canEdit}
        />
      </div>
      {!isTemplate && (
        <div className="mb-6 flex w-full flex-col items-start gap-2">
          <p className="text-xs font-semibold text-light-800 dark:text-dark-800">{t`Members`}</p>
          <MemberSelector
            cardPublicId={cardId ?? ""}
            members={formattedMembers}
            isLoading={!card}
            disabled={!canEdit}
          />
        </div>
      )}
      <div className="mb-6 flex w-full flex-col items-start gap-2">
        <p className="text-xs font-semibold text-light-800 dark:text-dark-800">{t`Due date`}</p>
        <DueDateSelector
          cardPublicId={cardId ?? ""}
          dueDate={card?.dueDate}
          isLoading={!card}
          disabled={!canEdit}
        />
      </div>
    </aside>
  );
}

export default function CardPage({ isTemplate }: { isTemplate?: boolean }) {
  useLingui();
  const router = useRouter();
  const utils = api.useUtils();
  const {
    modalContentType,
    entityId,
    getModalState,
    clearModalState,
    isOpen,
    modalStates,
  } = useModal();
  const { showPopup } = usePopup();
  const { workspace } = useWorkspace();
  const { canEditCard } = usePermissions();
  const { data: session } = authClient.useSession();
  const [activeChecklistForm, setActiveChecklistForm] = useState<string | null>(
    null,
  );

  const cardId = Array.isArray(router.query.cardId)
    ? router.query.cardId[0]
    : router.query.cardId;

  const {
    data: card,
    isLoading,
    error,
  } = api.card.byId.useQuery(
    { cardPublicId: cardId ?? "" },
    { enabled: !!cardId && cardId.length >= 12 },
  );

  // Redirect to 404 if card doesn't exist
  useEffect(() => {
    if (router.isReady && cardId && !isLoading) {
      if (error?.data?.code === "NOT_FOUND" || (!card && !isLoading)) {
        router.replace("/404");
      }
    }
  }, [router, cardId, isLoading, error, card]);

  const isCreator = card?.createdBy && session?.user.id === card.createdBy;
  const canEdit = canEditCard || isCreator;

  const refetchCard = async () => {
    if (cardId) await utils.card.byId.refetch({ cardPublicId: cardId });
  };

  const board = card?.list.board;
  const workspaceMembers = board?.workspace.members;
  const boardId = board?.publicId;
  const boardReturnUrl = getBoardReturnUrl(
    router.query.returnUrl,
    `/${isTemplate ? "templates" : "boards"}/${boardId}`,
  );

  const editorWorkspaceMembers =
    workspaceMembers
      ?.filter((member) => member.email)
      .map((member) => ({
        publicId: member.publicId,
        email: member.email,
        user: member.user
          ? {
              id: member.user.id,
              name: member.user.name ?? null,
              image: member.user.image ?? null,
            }
          : null,
      })) ?? [];

  const updateCard = api.card.update.useMutation({
    onError: () => {
      showPopup({
        header: t`Unable to update card`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: async () => {
      if (cardId) await invalidateCard(utils, cardId);
    },
  });

  const addOrRemoveLabel = api.card.addOrRemoveLabel.useMutation({
    onError: () => {
      showPopup({
        header: t`Unable to add label`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: async () => {
      if (cardId) {
        await utils.card.byId.invalidate({ cardPublicId: cardId });
      }
    },
  });

  const { register, handleSubmit, setValue, watch } = useForm<FormValues>({
    values: {
      cardId: cardId ?? "",
      title: card?.title ?? "",
      description: card?.description ?? "",
    },
  });

  const onSubmit = (values: FormValues) => {
    updateCard.mutate({
      cardPublicId: values.cardId,
      title: values.title,
      description: values.description,
    });
  };

  // this adds the new created label to selected labels
  useEffect(() => {
    const newLabelId = modalStates.NEW_LABEL_CREATED;
    if (newLabelId && cardId) {
      const isAlreadyAdded = card?.labels.some(
        (label) => label.publicId === newLabelId,
      );

      if (!isAlreadyAdded) {
        addOrRemoveLabel.mutate({
          cardPublicId: cardId,
          labelPublicId: newLabelId,
        });
      }
      clearModalState("NEW_LABEL_CREATED");
    }
  }, [modalStates.NEW_LABEL_CREATED, card, cardId]);

  // Open the new item form after creating a new checklist
  useEffect(() => {
    if (!card) return;
    const state = getModalState("ADD_CHECKLIST");
    const createdId: string | undefined = state?.createdChecklistId;
    if (createdId) {
      setActiveChecklistForm(createdId);
      clearModalState("ADD_CHECKLIST");
    }
  }, [card, getModalState, clearModalState]);

  // Auto-resize title textarea
  useEffect(() => {
    const titleTextarea = document.getElementById(
      "title",
    ) as HTMLTextAreaElement;
    if (titleTextarea) {
      titleTextarea.style.height = "auto";
      titleTextarea.style.height = `${titleTextarea.scrollHeight}px`;
    }
  }, [card]);

  if (!cardId) return <></>;

  return (
    <>
      <PageHead
        title={`${card?.title ?? t`Card`} | ${board?.name ?? t`Board`} | Adrenaline Tasks`}
      />
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white dark:bg-dark-50">
        {/* Full-width top strip with board link and dropdown */}
        <div className="flex w-full shrink-0 items-center justify-between gap-3 border-b border-light-300 bg-white px-5 py-4 dark:border-dark-300 dark:bg-dark-50 md:px-8">
          {!card && isLoading && (
            <div className="flex gap-2">
              <div className="h-[1.5rem] w-[150px] animate-pulse rounded-[5px] bg-light-300 dark:bg-dark-300" />
            </div>
          )}
          {card && (
            <>
              <div className="flex min-w-0 items-center gap-2 overflow-hidden">
                <Link
                  className="hidden truncate text-xs font-medium text-light-800 hover:text-light-1000 dark:text-dark-800 dark:hover:text-dark-1000 lg:block"
                  href={`${isTemplate ? "/templates" : "/boards"}`}
                >
                  {workspace.name}
                </Link>
                <IoChevronForwardSharp
                  className="hidden h-2.5 w-2.5 shrink-0 text-light-700 dark:text-dark-700 lg:block rtl:rotate-180"
                  aria-hidden="true"
                />
                <Link
                  className="truncate text-xs font-semibold text-light-900 hover:text-light-1000 dark:text-dark-950 dark:hover:text-dark-1000"
                  href={boardReturnUrl}
                >
                  {board?.name}
                </Link>
                {card.cardNumber != null &&
                  card.list.board.workspace.cardPrefix && (
                    <>
                      <IoChevronForwardSharp
                        className="h-2.5 w-2.5 shrink-0 text-light-700 dark:text-dark-700 rtl:rotate-180"
                        aria-hidden="true"
                      />
                      <span className="shrink-0 text-[11px] font-medium tabular-nums text-light-800 dark:text-dark-800">
                        <bdi dir="ltr">
                          {card.list.board.workspace.cardPrefix}-
                          {card.cardNumber}
                        </bdi>
                      </span>
                    </>
                  )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Dropdown
                  cardPublicId={cardId}
                  isTemplate={isTemplate}
                  boardPublicId={boardId}
                  cardCreatedBy={card?.createdBy}
                  ticketNumber={
                    card.cardNumber != null &&
                    card.list.board.workspace.cardPrefix
                      ? `${card.list.board.workspace.cardPrefix}-${card.cardNumber}`
                      : null
                  }
                  listPublicId={card?.list.publicId}
                  cardIndex={card?.index}
                />
                <Link
                  href={boardReturnUrl}
                  className="focus-visible:outline-brand-accent dark:focus-visible:outline-brand-lime flex h-10 w-10 items-center justify-center rounded-md text-light-900 hover:bg-light-200 focus-visible:outline focus-visible:outline-2 dark:text-dark-900 dark:hover:bg-dark-200"
                  aria-label={t`Close`}
                >
                  <HiXMark className="h-4 w-4" />
                </Link>
              </div>
            </>
          )}
          {!card && !isLoading && (
            <p className="block p-0 py-0 font-bold leading-[1.5rem] tracking-tight text-light-900 dark:text-dark-900 sm:text-[1rem]">
              {t`Card not found`}
            </p>
          )}
        </div>
        <div className="scrollbar-thumb-rounded-[4px] scrollbar-track-rounded-[4px] w-full flex-1 overflow-y-auto scrollbar scrollbar-track-light-200 scrollbar-thumb-light-400 hover:scrollbar-thumb-light-400 dark:scrollbar-track-dark-100 dark:scrollbar-thumb-dark-300 dark:hover:scrollbar-thumb-dark-300">
          <div className="mx-auto flex min-h-full w-full max-w-[880px] flex-col">
            <div className="px-5 pb-12 pt-7 md:px-8 md:pt-9 xl:px-10">
              <div className="mb-9">
                {!card && isLoading && (
                  <div className="flex gap-2">
                    <div className="h-[2.3rem] w-[300px] animate-pulse rounded-[5px] bg-light-300 dark:bg-dark-300" />
                  </div>
                )}
                {card && (
                  <form onSubmit={handleSubmit(onSubmit)} className="w-full">
                    <h1 className="sr-only">{card.title}</h1>
                    <div>
                      <textarea
                        id="title"
                        aria-label={t`Card title`}
                        dir="auto"
                        {...register("title")}
                        onBlur={canEdit ? handleSubmit(onSubmit) : undefined}
                        rows={1}
                        disabled={!canEdit}
                        className={`focus:ring-brand-accent dark:focus:ring-brand-lime block w-full resize-none overflow-hidden rounded border-0 bg-transparent p-0 text-[26px] font-bold leading-[1.35] tracking-[-0.04em] text-neutral-900 focus:ring-2 dark:text-dark-1000 md:text-[32px] ${!canEdit ? "cursor-default" : ""}`}
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = "auto";
                          target.style.height = `${target.scrollHeight}px`;
                        }}
                      />
                    </div>
                  </form>
                )}
                {!card && !isLoading && (
                  <p className="block p-0 py-0 font-bold leading-[2.3rem] tracking-tight text-neutral-900 dark:text-dark-1000 sm:text-[1.2rem]">
                    {t`Card not found`}
                  </p>
                )}
              </div>
              {card && (
                <>
                  <section
                    className="mb-9 flex w-full flex-col"
                    aria-labelledby="card-description-heading"
                  >
                    <h2
                      id="card-description-heading"
                      className="mb-3 text-sm font-bold text-light-1000 dark:text-dark-1000"
                    >{t`Description`}</h2>
                    <form
                      onSubmit={handleSubmit(onSubmit)}
                      className="w-full space-y-6"
                    >
                      <div className="focus-within:ring-brand-accent dark:focus-within:ring-brand-lime min-h-24 rounded-lg border border-light-300 bg-light-50 px-4 py-3 text-sm leading-7 focus-within:ring-2 dark:border-dark-300 dark:bg-dark-100">
                        <Editor
                          content={card.description}
                          onChange={
                            canEdit
                              ? (e) => setValue("description", e)
                              : undefined
                          }
                          onBlur={
                            canEdit ? () => handleSubmit(onSubmit)() : undefined
                          }
                          workspaceMembers={workspaceMembers ?? []}
                          readOnly={!canEdit}
                        />
                      </div>
                    </form>
                  </section>
                  {card.checklists.length > 0 && (
                    <h2 className="mb-4 text-sm font-bold text-light-1000 dark:text-dark-1000">{t`Checklists`}</h2>
                  )}
                  <Checklists
                    checklists={card.checklists}
                    cardPublicId={cardId}
                    activeChecklistForm={activeChecklistForm}
                    setActiveChecklistForm={setActiveChecklistForm}
                    viewOnly={!canEdit}
                  />
                  {!isTemplate && (
                    <>
                      {card?.attachments.length > 0 && (
                        <section
                          className="mb-8 mt-6"
                          aria-labelledby="card-attachments-heading"
                        >
                          <h2
                            id="card-attachments-heading"
                            className="mb-4 text-sm font-bold text-light-1000 dark:text-dark-1000"
                          >{t`Attachments`}</h2>
                          <AttachmentThumbnails
                            attachments={card.attachments}
                            cardPublicId={cardId ?? ""}
                            isReadOnly={!canEdit}
                          />
                        </section>
                      )}
                      {canEdit && (
                        <div className="mb-6 mt-4 rounded-lg border border-light-300 bg-light-100 px-2 py-1 dark:border-dark-300 dark:bg-dark-100">
                          <AttachmentUpload cardPublicId={cardId} />
                        </div>
                      )}
                    </>
                  )}
                  <section
                    className="border-t border-light-300 pt-8 dark:border-dark-300"
                    aria-labelledby="card-activity-heading"
                  >
                    <h2
                      id="card-activity-heading"
                      className="pb-5 text-sm font-bold text-light-1000 dark:text-dark-1000"
                    >
                      {t`Activity`}
                    </h2>
                    <div>
                      <ActivityList
                        cardPublicId={cardId}
                        isLoading={!card}
                        isAdmin={workspace.role === "admin"}
                      />
                    </div>
                    {!isTemplate && (
                      <div className="mt-6">
                        <NewCommentForm
                          cardPublicId={cardId}
                          workspaceMembers={editorWorkspaceMembers}
                        />
                      </div>
                    )}
                  </section>
                </>
              )}
            </div>
          </div>
        </div>

        <>
          <Modal
            modalSize="md"
            isVisible={isOpen && modalContentType === "NEW_FEEDBACK"}
          >
            <FeedbackModal />
          </Modal>

          <Modal
            modalSize="sm"
            isVisible={isOpen && modalContentType === "NEW_LABEL"}
          >
            <LabelForm boardPublicId={boardId ?? ""} refetch={refetchCard} />
          </Modal>

          <Modal
            modalSize="sm"
            isVisible={isOpen && modalContentType === "EDIT_LABEL"}
          >
            <LabelForm
              boardPublicId={boardId ?? ""}
              refetch={refetchCard}
              isEdit
            />
          </Modal>

          <Modal
            modalSize="sm"
            isVisible={isOpen && modalContentType === "DELETE_LABEL"}
          >
            <DeleteLabelConfirmation
              refetch={refetchCard}
              labelPublicId={entityId}
            />
          </Modal>

          <Modal
            modalSize="sm"
            isVisible={isOpen && modalContentType === "DELETE_CARD"}
          >
            <DeleteCardConfirmation
              boardPublicId={boardId ?? ""}
              cardPublicId={cardId}
            />
          </Modal>

          <Modal
            modalSize="sm"
            isVisible={isOpen && modalContentType === "DELETE_COMMENT"}
          >
            <DeleteCommentConfirmation
              cardPublicId={cardId}
              commentPublicId={entityId}
            />
          </Modal>

          <Modal
            modalSize="sm"
            isVisible={isOpen && modalContentType === "NEW_WORKSPACE"}
          >
            <NewWorkspaceForm />
          </Modal>

          <Modal
            modalSize="sm"
            isVisible={isOpen && modalContentType === "ADD_CHECKLIST"}
          >
            <NewChecklistForm cardPublicId={cardId} />
          </Modal>

          <Modal
            modalSize="sm"
            isVisible={isOpen && modalContentType === "DELETE_CHECKLIST"}
          >
            <DeleteChecklistConfirmation
              cardPublicId={cardId}
              checklistPublicId={entityId}
            />
          </Modal>

          <Modal
            modalSize="sm"
            isVisible={isOpen && modalContentType === "EDIT_YOUTUBE"}
          >
            <EditYouTubeModal />
          </Modal>
        </>
      </div>
    </>
  );
}
