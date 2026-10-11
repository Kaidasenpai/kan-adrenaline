import Link from "next/link";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { env } from "next-runtime-env";
import {
  HiBolt,
  HiChevronDown,
  HiEllipsisHorizontal,
  HiOutlinePlusSmall,
} from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import type { Subscription } from "@kan/shared/utils";
import { authClient } from "@kan/auth/client";
import {
  getSeatLimit,
  getSubscriptionByPlan,
  hasUnlimitedSeats,
} from "@kan/shared/utils";

import Avatar from "~/components/Avatar";
import Button from "~/components/Button";
import Dropdown from "~/components/Dropdown";
import FeedbackModal from "~/components/FeedbackModal";
import Modal from "~/components/modal";
import { NewWorkspaceForm } from "~/components/NewWorkspaceForm";
import { PageHead } from "~/components/PageHead";
import { usePermissions } from "~/hooks/usePermissions";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";
import { getAvatarUrl } from "~/utils/helpers";
import { DeleteMemberConfirmation } from "./components/DeleteMemberConfirmation";
import { EditMemberPermissionsModal } from "./components/EditMemberPermissionsModal";
import { InviteMemberForm } from "./components/InviteMemberForm";

export default function MembersPage() {
  useLingui();
  const { modalContentType, openModal, isOpen } = useModal();
  const { workspace } = useWorkspace();
  const { showPopup } = usePopup();

  const { data, isLoading } = api.workspace.byId.useQuery(
    { workspacePublicId: workspace.publicId },
    { enabled: !!workspace.publicId && workspace.publicId.length >= 12 },
  );

  const { data: session } = authClient.useSession();

  const { canEditMember } = usePermissions();

  const utils = api.useUtils();

  const updateRoleMutation = api.member.updateRole.useMutation({
    onSuccess: async () => {
      if (workspace.publicId && workspace.publicId.length >= 12) {
        await utils.workspace.byId.invalidate({
          workspacePublicId: workspace.publicId,
        });
      }

      showPopup({
        header: t`Role updated`,
        message: t`The member's role has been updated.`,
        icon: "success",
      });
    },
    onError: () => {
      showPopup({
        header: t`Unable to update role`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
  });

  const subscriptions = data?.subscriptions as Subscription[] | undefined;

  const teamSubscription = getSubscriptionByPlan(subscriptions, "team");
  const proSubscription = getSubscriptionByPlan(subscriptions, "pro");

  const unlimitedSeats = hasUnlimitedSeats(subscriptions);

  const isProPlan =
    !!proSubscription ||
    workspace.plan === "pro" ||
    workspace.plan === "enterprise";
  const isTeamPlan = !!teamSubscription || workspace.plan === "team";
  const isPaidPlan = isProPlan || isTeamPlan;

  const activeMembers = data?.members.length ?? 0;
  const seatLimit = getSeatLimit(subscriptions);
  const memberCount =
    data?.members.filter((m) => m.status === "active" || m.status === "invited")
      .length ?? 0;
  const totalSeats =
    teamSubscription?.seats ??
    proSubscription?.seats ??
    (isPaidPlan ? null : 1);

  const TableRow = ({
    memberPublicId,
    memberId,
    memberName,
    memberEmail,
    memberImage,
    memberRole,
    memberStatus,
    isLastRow,
    showSkeleton,
    showPendingIcon,
  }: {
    memberPublicId?: string;
    memberId?: string | null | undefined;
    memberName?: string | null | undefined;
    memberEmail?: string | null | undefined;
    memberImage?: string | null | undefined;
    memberRole?: string;
    memberStatus?: string;
    isLastRow?: boolean;
    showSkeleton?: boolean;
    showPendingIcon?: boolean;
  }) => {
    const handleRoleChange = (newRole: "admin" | "member" | "guest") => {
      if (!memberPublicId) return;

      updateRoleMutation.mutate({
        workspacePublicId: workspace.publicId,
        memberPublicId,
        role: newRole,
      });
    };

    return (
      <tr className="group rounded-b-lg hover:bg-light-100/70 dark:hover:bg-dark-200/50">
        <td
          className={twMerge(
            "w-[58%] sm:w-[60%]",
            isLastRow ? "rounded-es-lg" : "",
          )}
        >
          <div className="flex items-center gap-3 px-4 py-5 sm:px-6">
            <div className="flex-shrink-0">
              {showSkeleton ? (
                <div className="h-8 w-8 animate-pulse rounded-full bg-light-200 dark:bg-dark-200 sm:h-9 sm:w-9" />
              ) : (
                <Avatar
                  name={memberName ?? ""}
                  email={memberEmail ?? ""}
                  imageUrl={memberImage ? getAvatarUrl(memberImage) : undefined}
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div>
                <div className="flex items-center">
                  <p
                    className={twMerge(
                      "truncate text-sm font-semibold leading-6 text-neutral-900 dark:text-dark-1000",
                      showSkeleton &&
                        "md mb-2 h-3 w-[125px] animate-pulse rounded-sm bg-light-200 dark:bg-dark-200",
                      showPendingIcon && "text-light-800 dark:text-dark-900",
                    )}
                  >
                    <bdi>
                      {memberName ?? (showPendingIcon ? t`Pending` : t`Member`)}
                    </bdi>
                  </p>
                </div>
                {(workspace.role === "admin" ||
                  data?.showEmailsToMembers === true ||
                  showSkeleton) && (
                  <p
                    className={twMerge(
                      "mt-0.5 truncate text-xs leading-5 text-light-800 dark:text-dark-800",
                      showSkeleton &&
                        "h-3 w-[175px] animate-pulse rounded-sm bg-light-200 dark:bg-dark-200",
                    )}
                  >
                    <bdi dir="ltr">{memberEmail}</bdi>
                  </p>
                )}
              </div>
            </div>
          </div>
        </td>
        <td
          className={twMerge(
            "w-[42%] overflow-visible sm:w-[40%]",
            isLastRow && "rounded-ee-lg",
          )}
        >
          <div className="flex w-full items-center justify-between gap-2 px-3 sm:px-6">
            <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:gap-2">
              {showSkeleton ? (
                <span
                  className={twMerge(
                    "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium",
                    "h-5 w-[50px] animate-pulse bg-light-200 ring-0 dark:bg-dark-200",
                  )}
                />
              ) : (
                <div className="focus-within:ring-brand-accent dark:focus-within:ring-brand-lime relative inline-flex items-center rounded-md focus-within:ring-2">
                  <span className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-light-300 bg-light-100 px-2.5 py-1 text-xs font-medium text-light-950 dark:border-dark-400 dark:bg-dark-200 dark:text-dark-950">
                    {memberRole === "admin"
                      ? t`Admin`
                      : memberRole === "member"
                        ? t`Member`
                        : memberRole === "guest"
                          ? t`Guest`
                          : memberRole &&
                            memberRole.charAt(0).toUpperCase() +
                              memberRole.slice(1)}
                    {canEditMember && session?.user.id !== memberId && (
                      <HiChevronDown className="h-3 w-3" />
                    )}
                  </span>

                  {canEditMember && session?.user.id !== memberId && (
                    <select
                      aria-label={t`Role`}
                      value={memberRole}
                      onChange={(e) =>
                        handleRoleChange(
                          e.target.value as "admin" | "member" | "guest",
                        )
                      }
                      disabled={updateRoleMutation.isPending}
                      className="absolute inset-0 h-full w-full cursor-pointer appearance-none border-none bg-transparent p-0 text-[10px] leading-none opacity-0 focus:outline-none focus-visible:outline-none sm:text-[11px]"
                    >
                      <option value="admin">{t`Admin`}</option>
                      <option value="member">{t`Member`}</option>
                      <option value="guest">{t`Guest`}</option>
                    </select>
                  )}
                </div>
              )}
              {!showSkeleton && (
                <span
                  className={twMerge(
                    "inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] font-medium",
                    memberStatus === "active"
                      ? "text-brand-accent dark:text-brand-lime"
                      : memberStatus === "invited"
                        ? "text-amber-700 dark:text-amber-300"
                        : "text-light-800 dark:text-dark-800",
                  )}
                >
                  <span
                    className={twMerge(
                      "h-1.5 w-1.5 rounded-full",
                      memberStatus === "active"
                        ? "bg-brand-lime"
                        : memberStatus === "invited"
                          ? "bg-amber-500"
                          : "bg-light-600 dark:bg-dark-600",
                    )}
                    aria-hidden="true"
                  />
                  {memberStatus === "active"
                    ? t`Active`
                    : memberStatus === "invited"
                      ? t`Pending`
                      : t`Paused`}
                </span>
              )}
            </div>
            <div
              className={twMerge(
                "relative shrink-0",
                (workspace.role !== "admin" || showSkeleton) && "hidden",
              )}
            >
              {session?.user.id !== memberId && (
                <Dropdown
                  items={[
                    {
                      label: t`Edit permissions`,
                      action: () =>
                        openModal(
                          "EDIT_MEMBER_PERMISSIONS",
                          memberPublicId,
                          memberEmail ?? "",
                        ),
                    },
                    {
                      label: t`Remove member`,
                      action: () =>
                        openModal(
                          "REMOVE_MEMBER",
                          memberPublicId,
                          memberEmail ?? "",
                        ),
                    },
                  ]}
                  ariaLabel={t`Member options`}
                >
                  <HiEllipsisHorizontal
                    size={20}
                    className="text-light-900 dark:text-dark-900 sm:size-[20px]"
                  />
                </Dropdown>
              )}
            </div>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <>
      <PageHead
        title={`${t`Members`} | ${workspace.name} | Adrenaline Tasks`}
      />
      <div className="mx-auto min-h-full w-full max-w-[1280px] px-5 pb-12 pt-7 md:px-10 md:pt-10 xl:px-12">
        <p className="mb-3 text-xs font-medium text-light-800 dark:text-dark-800">
          {workspace.name}
        </p>
        <div className="mb-8 flex w-full flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-[32px] font-bold leading-tight tracking-[-0.045em] text-neutral-900 dark:text-dark-1000 md:text-[40px]">
                {t`Members`}
              </h1>
              {!isLoading && (
                <span className="rounded-md bg-light-200 px-2.5 py-1 text-xs font-semibold tabular-nums text-light-800 dark:bg-dark-200 dark:text-dark-900">
                  {data?.members.length ?? 0}
                </span>
              )}
            </div>
            <p className="mt-2 max-w-xl text-sm leading-6 text-light-800 dark:text-dark-800">{t`Manage your team and workspace access.`}</p>
          </div>
          <div className="flex items-center gap-3">
            {env("NEXT_PUBLIC_KAN_ENV") === "cloud" && !!data && (
              <>
                {!isPaidPlan && (
                  <Link
                    href={`/upgrade/select-plan?plan=team&workspacePublicId=${workspace.publicId}&returnUrl=${encodeURIComponent("/members")}`}
                    className="hidden items-center rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-center text-xs text-emerald-400 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 lg:flex"
                  >
                    <HiBolt />
                    <span className="ms-1 font-medium">{t`Upgrade`}</span>
                  </Link>
                )}
                <div
                  className={twMerge(
                    "flex items-center rounded-full border px-3 py-1 text-center text-xs",
                    isPaidPlan
                      ? "border-emerald-300 bg-emerald-50 text-emerald-400 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                      : "border-light-300 bg-light-50 text-light-1000 dark:border-dark-300 dark:bg-dark-50 dark:text-dark-900",
                  )}
                >
                  <span className="font-medium">
                    {isProPlan
                      ? t`Pro Plan`
                      : isTeamPlan
                        ? t`Team Plan`
                        : t`Free Plan`}
                  </span>
                </div>
                {isPaidPlan && (unlimitedSeats || totalSeats !== null) && (
                  <div className="flex items-center rounded-full border border-light-300 bg-light-50 px-3 py-1 text-center text-xs text-light-1000 dark:border-dark-300 dark:bg-dark-50 dark:text-dark-900">
                    <span className="font-medium">
                      {unlimitedSeats
                        ? t`Unlimited seats`
                        : `${activeMembers}/${totalSeats} ${t`seats`}`}
                    </span>
                  </div>
                )}
              </>
            )}
            <Button
              onClick={() => openModal("INVITE_MEMBER")}
              iconLeft={<HiOutlinePlusSmall className="h-4 w-4" />}
              disabled={workspace.role !== "admin"}
            >
              {t`Invite member`}
            </Button>
          </div>
        </div>

        <div className="flow-root">
          <div className="w-full">
            <div className="w-full overflow-x-auto pb-16 align-middle">
              <div className="rounded-xl border border-light-300 bg-white dark:border-dark-300 dark:bg-dark-100">
                <table className="w-full min-w-[320px] table-fixed divide-y divide-light-300 overflow-visible dark:divide-dark-300">
                  <caption className="sr-only">{t`Workspace members`}</caption>
                  <thead className="rounded-t-xl bg-light-100 dark:bg-dark-200">
                    <tr>
                      <th
                        scope="col"
                        className="w-[58%] rounded-ss-xl py-4 pe-3 ps-4 text-start text-xs font-semibold text-light-800 dark:text-dark-800 sm:w-[60%] sm:ps-6"
                      >
                        {t`User`}
                      </th>
                      <th
                        scope="col"
                        className="w-[42%] whitespace-nowrap rounded-se-xl px-3 py-4 text-start text-xs font-semibold text-light-800 dark:text-dark-800 sm:w-[40%] sm:px-6"
                      >
                        {t`Role`}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-light-300 overflow-visible bg-white dark:divide-dark-300 dark:bg-dark-100">
                    {!isLoading &&
                      data?.members.map((member, index) => {
                        const isPendingInvite = member.status === "invited";

                        return (
                          <TableRow
                            key={member.publicId}
                            memberPublicId={member.publicId}
                            memberId={member.user?.id}
                            memberName={member.user?.name}
                            memberEmail={member.user?.email ?? member.email}
                            memberImage={member.user?.image}
                            memberRole={member.role}
                            memberStatus={member.status}
                            isLastRow={index === data.members.length - 1}
                            showPendingIcon={isPendingInvite}
                          />
                        );
                      })}

                    {isLoading && (
                      <>
                        <TableRow showSkeleton />
                        <TableRow showSkeleton />
                        <TableRow showSkeleton isLastRow />
                      </>
                    )}
                  </tbody>
                </table>
              </div>
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
            isVisible={isOpen && modalContentType === "NEW_WORKSPACE"}
          >
            <NewWorkspaceForm />
          </Modal>

          <Modal
            modalSize="sm"
            isVisible={isOpen && modalContentType === "INVITE_MEMBER"}
          >
            <InviteMemberForm
              subscriptions={subscriptions}
              unlimitedSeats={unlimitedSeats}
              memberCount={memberCount}
              seatLimit={seatLimit}
            />
          </Modal>

          <Modal
            modalSize="sm"
            isVisible={isOpen && modalContentType === "REMOVE_MEMBER"}
          >
            <DeleteMemberConfirmation />
          </Modal>

          <Modal
            modalSize="sm"
            isVisible={isOpen && modalContentType === "EDIT_MEMBER_PERMISSIONS"}
            centered
          >
            <EditMemberPermissionsModal />
          </Modal>
        </>
      </div>
    </>
  );
}
