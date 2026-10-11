import { t } from "@lingui/core/macro";

import { i18n } from "~/utils/i18n";

interface ServiceError {
  code?: string;
  message?: string;
  data?: { code?: string } | null;
}

// Keep service details for English; expose useful translated guidance in Arabic.
export function localizedError(
  error: ServiceError | string | null | undefined,
  fallback: string,
): string {
  const message = typeof error === "string" ? error : error?.message;
  if (i18n.locale !== "ar") return message?.length ? message : fallback;
  const serviceMessages: Record<string, string> = {
    "Admin role permissions cannot be modified": t`Admin role permissions cannot be modified`,
    "Archived boards cannot be moved. Unarchive the board first.": t`Archived boards cannot be moved. Unarchive the board first.`,
    "At least one of title, completed, or index must be provided": t`At least one of title, completed, or index must be provided`,
    "Attachments bucket not configured": t`Attachments bucket not configured`,
    "Board is already in this workspace": t`Board is already in this workspace`,
    "Cloud metadata endpoints are not allowed": t`Cloud metadata endpoints are not allowed`,
    "Custom URLs are only available for Pro workspaces": t`Custom URLs are only available for Pro workspaces`,
    "Failed to add label to card": t`Failed to add label to card`,
    "Failed to add member to card": t`Failed to add member to card`,
    "Failed to create attachment": t`Failed to create attachment`,
    "Failed to create board": t`Failed to create board`,
    "Failed to create card": t`Failed to create card`,
    "Failed to create card label relationships": t`Failed to create card label relationships`,
    "Failed to create card member relationships": t`Failed to create card member relationships`,
    "Failed to create checklist": t`Failed to create checklist`,
    "Failed to create checklist item": t`Failed to create checklist item`,
    "Failed to create comment": t`Failed to create comment`,
    "Failed to create import record": t`Failed to create import record`,
    "Failed to create invite link": t`Failed to create invite link`,
    "Failed to create label": t`Failed to create label`,
    "Failed to create list": t`Failed to create list`,
    "Failed to create new board": t`Failed to create new board`,
    "Failed to create new cards": t`Failed to create new cards`,
    "Failed to delete cards": t`Failed to delete cards`,
    "Failed to delete checklist": t`Failed to delete checklist`,
    "Failed to delete comment": t`Failed to delete comment`,
    "Failed to delete item": t`Failed to delete item`,
    "Failed to delete list": t`Failed to delete list`,
    "Failed to delete lists": t`Failed to delete lists`,
    "Failed to fetch boards from Trello": t`Failed to fetch boards from Trello`,
    "Failed to fetch GitHub projects (GraphQL Error)": t`Failed to fetch GitHub projects (GraphQL Error)`,
    "Failed to import any boards from Trello": t`Failed to import any boards from Trello`,
    "Failed to remove label from card": t`Failed to remove label from card`,
    "Failed to remove member from card": t`Failed to remove member from card`,
    "Failed to set password": t`Failed to set password`,
    "Failed to update board": t`Failed to update board`,
    "Failed to update card": t`Failed to update card`,
    "Failed to update checklist": t`Failed to update checklist`,
    "Failed to update checklist item": t`Failed to update checklist item`,
    "Failed to update comment": t`Failed to update comment`,
    "Failed to update label": t`Failed to update label`,
    "Failed to update list": t`Failed to update list`,
    "Failed to update subscription for the new member.": t`Failed to update subscription for the new member.`,
    "GitHub token not found": t`GitHub token not found`,
    "Integration not found": t`Integration not found`,
    "Invalid or expired invite link": t`Invalid or expired invite link`,
    "Invalid provider": t`Invalid provider`,
    "Invite links require a Team or Pro subscription": t`Invite links require a Team or Pro subscription`,
    "Localhost URLs are not allowed": t`Localhost URLs are not allowed`,
    "Member not found": t`Member not found`,
    "Only HTTPS URLs are allowed": t`Only HTTPS URLs are allowed`,
    "Only the admin role can manage billing or delete the workspace": t`Only the admin role can manage billing or delete the workspace`,
    "Password already set; use change password instead": t`Password already set; use change password instead`,
    "Private IP addresses are not allowed": t`Private IP addresses are not allowed`,
    "Role not found": t`Role not found`,
    SEAT_LIMIT_REACHED: t`SEAT_LIMIT_REACHED`,
    "Source board does not belong to this workspace": t`Source board does not belong to this workspace`,
    "Target list must be in the same workspace": t`Target list must be in the same workspace`,
    "Target member not found": t`Target member not found`,
    "Target workspace not found": t`Target workspace not found`,
    "Templates cannot be moved between workspaces": t`Templates cannot be moved between workspaces`,
    "Trello API key not found": t`Trello API key not found`,
    "Trello token not found": t`Trello token not found`,
    "Unable to create webhook": t`Unable to create webhook`,
    "Unable to create workspace": t`Unable to create workspace`,
    "Unable to delete workspace": t`Unable to delete workspace`,
    "Unable to update webhook": t`Unable to update webhook`,
    "User is already a member of this workspace": t`User is already a member of this workspace`,
    "User not authenticated": t`User not authenticated`,
    "User not found": t`User not found`,
    "Webhook not found": t`Webhook not found`,
    "Workspace not found": t`Workspace not found`,
    "Workspace slug already taken": t`Workspace slug already taken`,
    "Workspace slug cannot be changed in cloud without upgrading to a paid plan": t`Workspace slug cannot be changed in cloud without upgrading to a paid plan`,
    "You are not a member of this workspace": t`You are not a member of this workspace`,
    "You cannot manage this member due to role hierarchy": t`You cannot manage this member due to role hierarchy`,
    "You do not have access to this workspace": t`You do not have access to this workspace`,
  };
  if (message && serviceMessages[message]) return serviceMessages[message];
  const code =
    typeof error === "string" ? "" : (error?.code ?? error?.data?.code ?? "");
  switch (code) {
    case "INVALID_EMAIL_OR_PASSWORD":
    case "INVALID_PASSWORD":
    case "USER_NOT_FOUND":
      return t`The email address or password is incorrect.`;
    case "INVALID_EMAIL":
      return t`Please enter a valid email address`;
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return t`An account with this email address already exists.`;
    case "PASSWORD_TOO_SHORT":
      return t`Your password is too short. Use at least 8 characters.`;
    case "PASSWORD_TOO_LONG":
      return t`Your password is too long. Use no more than 128 characters.`;
    case "EMAIL_NOT_VERIFIED":
      return t`Verify your email address before signing in.`;
    case "UNAUTHORIZED":
    case "SESSION_EXPIRED":
      return t`Your session has expired. Please sign in again.`;
    case "FORBIDDEN":
      return t`You do not have permission to perform this action.`;
    case "NOT_FOUND":
      return t`This item is no longer available. Refresh the page and try again.`;
    case "CONFLICT":
      return t`This item already exists. Check the details and try again.`;
    case "TOO_MANY_REQUESTS":
      return t`Too many attempts. Wait a moment and try again.`;
    case "INVALID_TOKEN":
      return t`This link has expired or has already been used.`;
  }
  if (/invalid (email|password)|incorrect password/i.test(message ?? ""))
    return t`The email address or password is incorrect.`;
  return fallback;
}
