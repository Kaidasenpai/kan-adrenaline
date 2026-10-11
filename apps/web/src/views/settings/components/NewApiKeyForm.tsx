import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/core/macro";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { authClient } from "@kan/auth/client";

import Button from "~/components/Button";
import Input from "~/components/Input";
import { useModal } from "~/providers/modal";

const newApiKeySchema = () =>
  z.object({
    name: z.string().min(1, t`API key name is required`),
  });

export default function NewApiKeyForm() {
  const { openModal } = useModal();
  const form = useForm({
    resolver: zodResolver(newApiKeySchema()),
    defaultValues: {
      name: "",
    },
  });

  const qc = useQueryClient();

  const createApiKeyMutation = useMutation({
    mutationFn: ({ name }: { name: string }) =>
      authClient.apiKey.create({ name, prefix: "kan_" }),
    onSuccess: ({ data: apiKey }) => {
      qc.invalidateQueries({
        queryKey: ["apiKeys"],
      });
      openModal("API_KEY_CREATED", apiKey?.key, apiKey?.name ?? "");
    },
    onError: () => {
      form.setError("name", {
        type: "manual",
        message: t`Failed to create API key`,
      });
    },
  });

  const handleSubmit = (data: z.infer<ReturnType<typeof newApiKeySchema>>) => {
    createApiKeyMutation.mutate({ name: data.name });
  };

  return (
    <div className="px-2 py-2">
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex flex-col gap-2"
      >
        <h2 className="text-sm font-bold text-neutral-900 dark:text-dark-1000">
          {t`New API key`}
        </h2>
        <Input
          {...form.register("name")}
          placeholder={t`Name`}
          className="w-full"
          errorMessage={form.formState.errors.name?.message}
        />
        <Button type="submit" isLoading={createApiKeyMutation.isPending}>
          {t`Create`}
        </Button>
      </form>
    </div>
  );
}
