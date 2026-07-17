import { setRequestLocale } from "next-intl/server";

import { JoinForm } from "../join-form";

export default async function JoinWithCodePage({
  params,
}: PageProps<"/[locale]/join/[code]">) {
  const { locale, code } = await params;
  setRequestLocale(locale);
  return <JoinForm initialCode={code} />;
}
