import { t } from "@lingui/core/macro";

export function webhookEventLabel(event: string): string {
  switch (event) {
    case "card.created":
      return t`Task created`;
    case "card.updated":
      return t`Task updated`;
    case "card.moved":
      return t`Task moved`;
    case "card.deleted":
      return t`Task deleted`;
    default:
      return event;
  }
}
