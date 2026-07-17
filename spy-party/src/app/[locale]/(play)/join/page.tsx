import { setRequestLocale } from "next-intl/server";

import { JoinForm } from "./join-form";

export default async function JoinPage({ params }: PageProps<"/[locale]/join">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <JoinForm />;
}
