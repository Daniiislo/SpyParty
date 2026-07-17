import { Home, Trophy } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { getLeaderboard } from "@/lib/data/leaderboard";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage({
  params,
}: PageProps<"/[locale]/leaderboard">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("leaderboard");
  const rows = await getLeaderboard();

  return (
    <main className="bg-blueprint relative flex min-h-dvh flex-col">
      <div className="relative mx-auto w-full max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="text-center">
          <span className="text-classified inline-flex items-center gap-2 text-[11px] text-primary">
            <Trophy className="size-4" /> {t("eyebrow")}
          </span>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>

        {rows.length === 0 ? (
          <p className="text-classified mt-12 text-center text-sm text-muted-foreground">
            {t("empty")}
          </p>
        ) : (
          <div className="mt-10 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-classified border-b border-border text-left text-[10px] text-muted-foreground">
                  <th className="w-10 py-2 font-medium">{t("rank")}</th>
                  <th className="py-2 font-medium">{t("agent")}</th>
                  <th className="py-2 text-right font-medium">{t("games")}</th>
                  <th className="py-2 text-right font-medium">{t("wins")}</th>
                  <th className="py-2 text-right font-medium">{t("points")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.rank} className="border-b border-border/50">
                    <td className="py-3 font-mono text-muted-foreground">{r.rank}</td>
                    <td className="py-3 font-medium">{r.name}</td>
                    <td className="py-3 text-right font-mono tabular-nums">
                      {r.gamesPlayed}
                    </td>
                    <td className="py-3 text-right font-mono tabular-nums">
                      {r.gamesWon}
                    </td>
                    <td className="py-3 text-right font-mono font-bold tabular-nums text-primary">
                      {r.totalPoints}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-10 flex justify-center">
          <Button asChild variant="outline" className="h-11 gap-2 px-6">
            <Link href="/">
              <Home className="size-4" /> {t("backHome")}
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
