import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/core/macro";
import { env } from "next-runtime-env";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import {
  HiInformationCircle,
  HiMiniCheck,
  HiOutlineDocumentDuplicate,
  HiXMark,
} from "react-icons/hi2";
import { z } from "zod";

import type { InviteMemberInput } from "@kan/api/types";
import type { Subscription } from "@kan/shared/utils";
import { getSubscriptionByPlan } from "@kan/shared/utils";

import Button from "~/components/Button";
import Input from "~/components/Input";
import Toggle from "~/components/Toggle";
import { useLocalisation } from "~/hooks/useLocalisation";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";

export function InviteMemberForm({
  subscriptions,
  unlimitedSeats,
  memberCount,
  seatLimit,
}: {
  subscriptions: Subscription[] | undefined;
  unlimitedSeats: boolean;
  memberCount: number;
  seatLimit: number | null;
}) {
  const { formatNumber } = useLocalisation();
  const utils = api.useUtils();
  const [isShareInviteLinkEnabled, setIsShareInviteLinkEnabled] =
    useState(false);
  const [inviteLink, setInviteLink] = useState<string>("");
  const [isLoadingInviteLink, setIsLoadingInviteLink] = useState(false);
  const inviteLinkOperation = useRef(false);
  const [copied, setCopied] = useState(false);
  const { closeModal } = useModal();
  const { workspace } = useWorkspace();
  const { showPopup } = usePopup();

  const isEmailEnabled = env("NEXT_PUBLIC_DISABLE_EMAIL") !== "true";

  const InviteMemberSchema = z.object({
    email: z.string().email({ message: t`Invalid email address` }),
    workspacePublicId: z.string(),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteMemberInput>({
    defaultValues: {
      email: "",
      workspacePublicId: workspace.publicId || "",
    },
    resolver: zodResolver(InviteMemberSchema),
  });

  const refetchBoards = () => utils.board.all.refetch();

  // Fetch active invite link on component mount
  const { data: activeInviteLink, isLoading: isLoadingActiveInviteLink } =
    api.member.getActiveInviteLink.useQuery(
      { workspacePublicId: workspace.publicId || "" },
      { enabled: !!workspace.publicId },
    );

  // Set initial state based on active invite link
  useEffect(() => {
    if (activeInviteLink && !inviteLinkOperation.current) {
      setIsShareInviteLinkEnabled(activeInviteLink.isActive);
      setInviteLink(activeInviteLink.inviteLink ?? "");
    }
  }, [activeInviteLink]);

  const inviteMember = api.member.invite.useMutation({
    onSuccess: async () => {
      closeModal();
      await utils.workspace.byId.refetch();
      await refetchBoards();
    },
    onError: (error) => {
      reset();
      if (!isShareInviteLinkEnabled) closeModal();

      if (error.data?.code === "CONFLICT") {
        showPopup({
          header: t`Error inviting member`,
          message: t`User is already a member of this workspace`,
          icon: "error",
        });
      } else if (
        error.data?.code === "FORBIDDEN" &&
        error.message === "SEAT_LIMIT_REACHED"
      ) {
        showPopup({
          header: t`Seat limit reached`,
          message: t`You've reached your ${seatLimit ?? 0}-seat limit. Please upgrade your plan to add more members.`,
          icon: "error",
        });
      } else {
        showPopup({
          header: t`Error inviting member`,
          message: t`Please try again later, or contact customer support.`,
          icon: "error",
        });
      }
    },
  });

  const createInviteLink = api.member.createInviteLink.useMutation({
    onSuccess: (data) => {
      setInviteLink(data.inviteLink);
      utils.member.getActiveInviteLink.setData(
        { workspacePublicId: workspace.publicId },
        {
          isActive: true,
          inviteCode: data.inviteCode,
          inviteLink: data.inviteLink,
          expiresAt: data.expiresAt ?? undefined,
        },
      );
      setIsLoadingInviteLink(false);
    },
    onError: (error) => {
      setIsLoadingInviteLink(false);
      setIsShareInviteLinkEnabled(false);

      if (
        error.data?.code === "FORBIDDEN" &&
        env("NEXT_PUBLIC_KAN_ENV") === "cloud"
      ) {
        showPopup({
          header: t`Subscription Required`,
          message: t`Invite links require a Team or Pro subscription. Please upgrade your workspace.`,
          icon: "error",
        });
      } else {
        showPopup({
          header: t`Error creating invite link`,
          message:
            error.data?.code === "UNAUTHORIZED"
              ? t`Your session has expired. Please sign in again.`
              : t`Please try again later.`,
          icon: "error",
        });
      }
    },
  });

  const deactivateInviteLink = api.member.deactivateInviteLink.useMutation({
    onSuccess: () => {
      setInviteLink("");
      utils.member.getActiveInviteLink.setData(
        { workspacePublicId: workspace.publicId },
        { isActive: false },
      );
      setIsLoadingInviteLink(false);
    },
    onError: () => {
      setIsLoadingInviteLink(false);
      showPopup({
        header: t`Error deactivating invite link`,
        message: t`Please try again later.`,
        icon: "error",
      });
    },
  });

  const teamSubscription = getSubscriptionByPlan(subscriptions, "team");
  const proSubscription = getSubscriptionByPlan(subscriptions, "pro");

  const hasTeamSubscription = !!teamSubscription;
  const hasProSubscription = !!proSubscription;
  const isPartnerTier = !!(
    teamSubscription?.partnerTier ?? proSubscription?.partnerTier
  );

  let isYearly = false;
  let price = t`$10/month`;
  let billingType = t`monthly billing`;

  if (teamSubscription?.periodStart && teamSubscription.periodEnd) {
    const periodStartDate = new Date(teamSubscription.periodStart);
    const periodEndDate = new Date(teamSubscription.periodEnd);
    const diffInDays = Math.round(
      (periodEndDate.getTime() - periodStartDate.getTime()) /
        (1000 * 60 * 60 * 24),
    );

    isYearly = diffInDays > 31;
    price = isYearly ? t`$8/month` : t`$10/month`;
    billingType = isYearly ? t`billed annually` : t`billed monthly`;
  }

  const onSubmit = (member: InviteMemberInput) => {
    inviteMember.mutate(member);
  };

  const isFreePlan =
    env("NEXT_PUBLIC_KAN_ENV") === "cloud" &&
    !hasTeamSubscription &&
    !hasProSubscription;

  const handleInviteLinkToggle = async () => {
    if (
      isFreePlan ||
      !workspace.publicId ||
      isLoadingActiveInviteLink ||
      inviteLinkOperation.current
    )
      return;

    inviteLinkOperation.current = true;
    setIsLoadingInviteLink(true);

    try {
      if (isShareInviteLinkEnabled) {
        await deactivateInviteLink.mutateAsync({
          workspacePublicId: workspace.publicId,
        });
        setIsShareInviteLinkEnabled(false);
      } else {
        await createInviteLink.mutateAsync({
          workspacePublicId: workspace.publicId,
        });
        setIsShareInviteLinkEnabled(true);
      }
    } catch {
      // Mutation callbacks show the error; contain the rejected event handler.
    } finally {
      inviteLinkOperation.current = false;
      setIsLoadingInviteLink(false);
    }
  };

  const copyToClipboard = async () => {
    if (!inviteLink || isLoadingInviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showPopup({
        header: t`Invite link copied`,
        message: t`Invite link copied to clipboard`,
        icon: "success",
      });
    } catch {
      showPopup({
        header: t`Error`,
        message: t`Failed to copy invite link`,
        icon: "error",
      });
    }
  };

  useEffect(() => {
    const emailElement: HTMLElement | null =
      document.querySelector<HTMLElement>("#email");
    if (emailElement) emailElement.focus();
  }, []);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="px-5 pt-5">
        <div className="text-neutral-9000 flex w-full items-center justify-between pb-4 dark:text-dark-1000">
          <h2 className="text-sm font-bold">{t`Add member`}</h2>
          <button
            type="button"
            className="hover:bg-li ght-300 rounded p-1 focus:outline-none dark:hover:bg-dark-300"
            onClick={(e) => {
              e.preventDefault();
              closeModal();
            }}
          >
            <HiXMark size={18} className="dark:text-dark-9000 text-light-900" />
          </button>
        </div>
        {isEmailEnabled && (
          <Input
            id="email"
            placeholder={t`Email`}
            disabled={isFreePlan}
            {...register("email", { required: true })}
            onKeyDown={async (e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                await handleSubmit(onSubmit)();
              }
            }}
            errorMessage={errors.email?.message}
          />
        )}
        {!isFreePlan &&
          (!isEmailEnabled || (isShareInviteLinkEnabled && inviteLink)) && (
            <div className="my-4">
              <div className="relative">
                <Input
                  aria-label={t`Invite link`}
                  dir="ltr"
                  value={inviteLink}
                  className="pe-10 text-sm text-light-900 dark:text-dark-900"
                  readOnly
                />
                <button
                  type="button"
                  aria-label={t`Copy invite link`}
                  disabled={!inviteLink || isLoadingInviteLink}
                  className="absolute inset-y-0 end-0 flex items-center pe-3 text-light-900 hover:text-light-950 disabled:cursor-not-allowed disabled:opacity-50 dark:text-dark-900 dark:hover:text-dark-950"
                  onClick={copyToClipboard}
                >
                  {copied ? (
                    <HiMiniCheck className="h-5 w-5 text-green-600" />
                  ) : (
                    <HiOutlineDocumentDuplicate className="h-5 w-5" />
                  )}
                </button>
              </div>
              <div className="mt-2 flex items-start gap-1">
                <HiInformationCircle className="mt-0.5 h-4 w-4 text-dark-900" />
                <p className="text-xs text-gray-500 dark:text-dark-900">
                  {t`Anyone with this link can join your workspace`}
                </p>
              </div>
            </div>
          )}

        {env("NEXT_PUBLIC_KAN_ENV") === "cloud" &&
          (isPartnerTier && seatLimit !== null ? (
            <div className="mt-3 rounded-md bg-light-100 p-3 text-xs text-light-900 dark:bg-dark-200 dark:text-dark-900">
              <div className="flex items-center justify-between">
                <span className="font-medium text-emerald-500 dark:text-emerald-400">
                  {hasTeamSubscription ? t`Team Plan` : t`Pro Plan`}
                </span>
                <span className="text-light-900 dark:text-dark-900">
                  <bdi dir="ltr">
                    {formatNumber(memberCount)} / {formatNumber(seatLimit)}
                  </bdi>{" "}
                  {t`seats`}
                </span>
              </div>
            </div>
          ) : !unlimitedSeats ? (
            <div className="mt-3 rounded-md bg-light-100 p-3 text-xs text-light-900 dark:bg-dark-200 dark:text-dark-900">
              {hasTeamSubscription || hasProSubscription ? (
                <div>
                  <span className="font-medium text-emerald-500 dark:text-emerald-400">
                    {hasTeamSubscription ? t`Team Plan` : t`Pro Plan ∞`}
                  </span>
                  <p className="mt-1">
                    {t`Adding a new member will cost an additional ${price} (${billingType}) per seat.`}
                  </p>
                </div>
              ) : (
                <div>
                  <span className="font-medium text-light-950 dark:text-dark-950">
                    {t`Free Plan`}
                  </span>
                  <p className="mt-1">
                    {t`Inviting members requires a Team plan. You'll be redirected to upgrade your workspace.`}
                  </p>
                </div>
              )}
            </div>
          ) : null)}
      </div>

      <div className="mt-12 flex flex-wrap items-center justify-end gap-4 border-t border-light-600 px-5 pb-5 pt-5 dark:border-dark-600">
        {!isFreePlan && (
          <Toggle
            label={
              isShareInviteLinkEnabled
                ? t`Deactivate invite link`
                : t`Create invite link`
            }
            isChecked={isShareInviteLinkEnabled}
            onChange={handleInviteLinkToggle}
            disabled={
              isLoadingInviteLink ||
              isLoadingActiveInviteLink ||
              !workspace.publicId
            }
          />
        )}
        <div>
          {isFreePlan ? (
            <Button
              type="button"
              href={`/upgrade/select-plan?plan=team&workspacePublicId=${workspace.publicId}&returnUrl=${encodeURIComponent("/members")}`}
            >
              {t`Choose plan`}
            </Button>
          ) : !isEmailEnabled ? (
            <Button
              type="button"
              disabled={isLoadingActiveInviteLink || !workspace.publicId}
              isLoading={isLoadingInviteLink}
              onClick={inviteLink ? copyToClipboard : handleInviteLinkToggle}
            >
              {inviteLink ? t`Copy invite link` : t`Create invite link`}
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={inviteMember.isPending || !isEmailEnabled}
              isLoading={inviteMember.isPending}
            >
              {t`Invite member`}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
