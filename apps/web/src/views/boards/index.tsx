import { t } from "@lingui/core/macro";
import { useMemo, useState } from "react";
import { HiArrowDownTray, HiOutlinePlusSmall } from "react-icons/hi2";

import Button from "~/components/Button";
import FeedbackModal from "~/components/FeedbackModal";
import Modal from "~/components/modal";
import { NewWorkspaceForm } from "~/components/NewWorkspaceForm";
import { PageHead } from "~/components/PageHead";
import { Tooltip } from "~/components/Tooltip";
import { useLocalisation } from "~/hooks/useLocalisation";
import { usePermissions } from "~/hooks/usePermissions";
import { useKeyboardShortcut } from "~/providers/keyboard-shortcuts";
import { useModal } from "~/providers/modal";
import { useWorkspace } from "~/providers/workspace";
import { BoardsList } from "./components/BoardsList";
import { ImportBoardsForm } from "./components/ImportBoardsForm";
import { NewBoardForm } from "./components/NewBoardForm";

export default function BoardsPage({ isTemplate }: { isTemplate?: boolean }) {
  const { locale } = useLocalisation();
  const boardsTabs = [
    { key: "boards" as const, label: t`Active boards` },
    { key: "archived" as const, label: t`Archived` },
  ];
  const { openModal, modalContentType, isOpen } = useModal();
  const { workspace } = useWorkspace();
  const [activeTab, setActiveTab] = useState<"boards" | "archived">("boards");
  const { canCreateBoard } = usePermissions();

  const createBoardShortcut = useMemo(
    () => ({
      type: "PRESS" as const,
      stroke: { key: "C" },
      action: () => canCreateBoard && openModal("NEW_BOARD"),
      description: isTemplate ? t`Create new template` : t`Create new board`,
      group: "ACTIONS" as const,
    }),
    // Lingui macros read the active locale indirectly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canCreateBoard, isTemplate, openModal, locale],
  );

  const { tooltipContent: createModalShortcutTooltipContent } =
    useKeyboardShortcut(createBoardShortcut);

  return (
    <>
      <PageHead
        title={t`${isTemplate ? t`Templates` : t`Boards`} | ${workspace.name || t`Workspace`}`}
      />
      <div className="mx-auto min-h-full w-full max-w-[1280px] px-5 py-8 sm:px-8 md:py-10 xl:px-12">
        <header className="mb-8">
          <p className="mb-4 text-sm font-medium text-light-950 dark:text-dark-950">
            {workspace.name || t`Workspace`}
          </p>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <h1 className="text-[36px] font-bold leading-tight tracking-[-0.025em] text-light-1000 dark:text-dark-1000">
                {isTemplate ? t`Templates` : t`Boards`}
              </h1>
              <p className="mt-2 max-w-xl text-base leading-relaxed text-light-950 dark:text-dark-950">
                {isTemplate
                  ? t`Reusable workflows for your next project.`
                  : t`Projects, events, and production in one workspace.`}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-3">
              <Tooltip
                content={
                  !canCreateBoard
                    ? t`You don't have permission`
                    : createModalShortcutTooltipContent
                }
              >
                <Button
                  type="button"
                  size="lg"
                  className="h-11 px-5"
                  onClick={() => {
                    if (canCreateBoard) openModal("NEW_BOARD");
                  }}
                  disabled={!canCreateBoard}
                  iconLeft={
                    <HiOutlinePlusSmall
                      aria-hidden="true"
                      className="h-4 w-4"
                    />
                  }
                >
                  {isTemplate ? t`New template` : t`New board`}
                </Button>
              </Tooltip>
              {!isTemplate && (
                <Tooltip
                  content={
                    !canCreateBoard ? t`You don't have permission` : undefined
                  }
                >
                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    className="h-11 px-5"
                    onClick={() => {
                      if (canCreateBoard) openModal("IMPORT_BOARDS");
                    }}
                    disabled={!canCreateBoard}
                    iconLeft={
                      <HiArrowDownTray aria-hidden="true" className="h-4 w-4" />
                    }
                  >
                    {t`Import`}
                  </Button>
                </Tooltip>
              )}
            </div>
          </div>
        </header>

        {!isTemplate && (
          <nav
            aria-label={t`Board status`}
            className="mb-8 flex gap-7 border-b border-light-500 dark:border-dark-500"
          >
            {boardsTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                aria-pressed={activeTab === tab.key}
                aria-controls="workspace-boards"
                onClick={() => setActiveTab(tab.key)}
                className={`focus-visible:outline-brand-accent dark:focus-visible:outline-brand-lime -mb-px min-h-11 border-b-[3px] px-1 pb-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 ${
                  activeTab === tab.key
                    ? "border-brand-lime text-light-1000 dark:text-dark-1000"
                    : "border-transparent text-light-950 hover:text-light-1000 dark:text-dark-950 dark:hover:text-dark-1000"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        )}

        <section
          id="workspace-boards"
          aria-label={
            isTemplate
              ? t`Templates`
              : activeTab === "archived"
                ? t`Archived boards`
                : t`Active boards`
          }
          className="pb-12"
        >
          <BoardsList
            isTemplate={isTemplate}
            archived={!isTemplate && activeTab === "archived"}
          />
        </section>
      </div>

      <Modal
        modalSize="md"
        isVisible={isOpen && modalContentType === "NEW_FEEDBACK"}
      >
        <FeedbackModal />
      </Modal>
      <Modal
        modalSize="sm"
        isVisible={isOpen && modalContentType === "NEW_BOARD"}
      >
        <NewBoardForm isTemplate={!!isTemplate} />
      </Modal>
      <Modal
        modalSize="sm"
        isVisible={isOpen && modalContentType === "IMPORT_BOARDS"}
      >
        <ImportBoardsForm />
      </Modal>
      <Modal
        modalSize="sm"
        isVisible={isOpen && modalContentType === "NEW_WORKSPACE"}
      >
        <NewWorkspaceForm />
      </Modal>
    </>
  );
}
