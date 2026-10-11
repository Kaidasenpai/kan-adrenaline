import { t } from "@lingui/core/macro";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { HiXMark } from "react-icons/hi2";

import type { NewListInput } from "@kan/api/types";
import { generateUID } from "@kan/shared/utils";

import Button from "~/components/Button";
import Input from "~/components/Input";
import Toggle from "~/components/Toggle";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";

type NewListFormInput = NewListInput & {
  isCreateAnotherEnabled: boolean;
};

interface QueryParams {
  boardPublicId: string;
  members: string[];
  labels: string[];
  lists: string[];
}

export function NewListForm({
  boardPublicId,
  queryParams,
}: {
  boardPublicId: string;
  queryParams: QueryParams;
}) {
  const { closeModal } = useModal();
  const { showPopup } = usePopup();

  const utils = api.useUtils();

  const { register, handleSubmit, reset, setValue, watch } =
    useForm<NewListFormInput>({
      defaultValues: {
        name: "",
        boardPublicId: boardPublicId,
        isCreateAnotherEnabled: false,
      },
    });

  const isCreateAnotherEnabled = watch("isCreateAnotherEnabled");

  const createList = api.list.create.useMutation({
    onMutate: async (args) => {
      await utils.board.byId.cancel();

      const currentState = utils.board.byId.getData(queryParams);
      const optimisticPublicId = `PLACEHOLDER_${generateUID()}`;

      utils.board.byId.setData(queryParams, (oldBoard) => {
        if (!oldBoard) return oldBoard;

        const newList = {
          publicId: optimisticPublicId,
          name: args.name,
          boardId: 1,
          boardPublicId,
          cards: [],
          index: oldBoard.lists.length,
        };

        const updatedLists = [...oldBoard.lists, newList];

        return { ...oldBoard, lists: updatedLists };
      });

      return { previousState: currentState, optimisticPublicId };
    },
    onSuccess: (result, _args, context) => {
      if (!context) return;
      utils.board.byId.setData(queryParams, (oldBoard) => {
        if (!oldBoard) return oldBoard;
        return {
          ...oldBoard,
          lists: oldBoard.lists.map((list) =>
            list.publicId === context.optimisticPublicId
              ? { ...list, publicId: result.publicId }
              : list,
          ),
        };
      });
    },
    onError: (_error, _newList, context) => {
      utils.board.byId.setData(queryParams, context?.previousState);
      showPopup({
        header: t`Unable to create list`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: async () => {
      await utils.board.byId.invalidate(queryParams);
    },
  });

  useEffect(() => {
    const nameElement: HTMLElement | null =
      document.querySelector<HTMLElement>("#list-name");
    if (nameElement) nameElement.focus();
  }, []);

  const onSubmit = (data: NewListInput) => {
    const isCreateAnotherEnabled = watch("isCreateAnotherEnabled");
    if (!isCreateAnotherEnabled) closeModal();
    reset({
      name: "",
      isCreateAnotherEnabled,
    });

    createList.mutate({
      name: data.name,
      boardPublicId,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="px-6 pt-6">
        <div className="flex w-full items-center justify-between gap-4 pb-6">
          <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-dark-1000">
            {t`New list`}
          </h2>
          <button
            type="button"
            aria-label={t`Close`}
            className="focus-visible:outline-brand-accent dark:focus-visible:outline-brand-lime flex h-10 w-10 shrink-0 items-center justify-center rounded-md hover:bg-light-200 focus-visible:outline focus-visible:outline-2 dark:hover:bg-dark-300"
            onClick={(e) => {
              e.preventDefault();
              closeModal();
            }}
          >
            <HiXMark size={18} className="text-light-900 dark:text-dark-900" />
          </button>
        </div>

        <label
          htmlFor="list-name"
          className="mb-2 block text-xs font-semibold text-light-950 dark:text-dark-950"
        >
          {t`List name`}
        </label>
        <Input
          id="list-name"
          className="min-h-11 bg-white text-light-1000 dark:bg-dark-200"
          placeholder={t`List name`}
          {...register("name")}
          onKeyDown={async (e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              await handleSubmit(onSubmit)();
            }
          }}
        />
      </div>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-light-300 px-6 pb-6 pt-5 dark:border-dark-300">
        <Toggle
          label={t`Create another`}
          isChecked={isCreateAnotherEnabled}
          onChange={() =>
            setValue("isCreateAnotherEnabled", !isCreateAnotherEnabled)
          }
        />

        <div>
          <Button
            type="submit"
            disabled={createList.isPending || !watch("name")}
          >
            {t`Create list`}
          </Button>
        </div>
      </div>
    </form>
  );
}
