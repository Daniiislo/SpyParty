import { getTranslations } from "next-intl/server";
import { LoadingScreen } from "@/components/loading-screen";

export default async function RoomLoading() {
  const t = await getTranslations("online");
  return <LoadingScreen label={t("establishingLink")} />;
}
