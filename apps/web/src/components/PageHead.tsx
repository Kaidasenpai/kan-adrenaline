import Head from "next/head";
import { t } from "@lingui/core/macro";

export const PageHead = ({ title }: { title: string }) => {
  return (
    <Head>
      <title>{title}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="application-name" content="Adrenaline Tasks" />
      <meta
        name="description"
        content={t`Projects, events, and production at Adrenaline Entertainment.`}
      />
      <meta name="theme-color" content="#B4D234" />
      <link
        rel="icon"
        type="image/png"
        sizes="32x32"
        href="/branding/favicon-32.png"
      />
      <link
        rel="apple-touch-icon"
        sizes="180x180"
        href="/branding/apple-touch-icon.png"
      />
      <link rel="manifest" href="/manifest.json" />
    </Head>
  );
};
