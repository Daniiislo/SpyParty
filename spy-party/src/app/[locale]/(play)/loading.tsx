import { getTranslations } from "next-intl/server";
import { LoadingScreen } from "@/components/loading-screen";

export default async function PlayLoading() {
  const t = await getTranslations("common");
  return <LoadingScreen label={t("loading")} />;
}
