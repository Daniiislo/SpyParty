import {
  Fingerprint,
  LockOpen,
  Radar,
  ScrollText,
  Trophy,
  Users,
  UsersRound,
  VenetianMask,
  Vote,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { DossierReveal } from "@/components/dossier-reveal";

// Step number → icon. Titles/descriptions come from the message catalog
// (steps.items.<no>); only the number and icon live in code.
const STEP_ICONS = {
  "01": Radar,
  "02": Fingerprint,
  "03": ScrollText,
  "04": Vote,
} as const;

const STEP_NOS = ["01", "02", "03", "04"] as const;

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const hero = await getTranslations("hero");
  const landing = await getTranslations("landing");
  const roles = await getTranslations("roles");
  const steps = await getTranslations("steps");
  const cta = await getTranslations("cta");
  const footer = await getTranslations("footer");
  const lb = await getTranslations("leaderboard");

  return (
    <main className="flex flex-1 flex-col">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="bg-blueprint pointer-events-none absolute inset-0 opacity-40" />
        <div className="glow-hero pointer-events-none absolute inset-0" />
        <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center gap-12 px-4 py-20 sm:px-6 sm:py-28 lg:flex-row lg:gap-16">
          <div className="flex flex-1 flex-col items-center text-center lg:items-start lg:text-left">
            <span className="text-classified inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-[11px] text-primary">
              <Fingerprint className="size-3.5" /> {hero("badge")}
            </span>
            <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-6xl">
              SPY <span className="text-primary">PARTY</span>
            </h1>
            <p className="mt-5 max-w-md text-base text-muted-foreground sm:text-lg">
              {hero.rich("tagline", {
                hl: (chunks) => (
                  <span className="text-foreground">{chunks}</span>
                ),
              })}
            </p>
            <div className="mt-8 flex w-full max-w-xs flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row">
              <Button
                asChild
                className="h-11 w-full gap-2 px-6 text-sm font-semibold sm:w-auto"
              >
                <Link href="/create">
                  <Radar className="size-4" /> {hero("createRoom")}
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-11 w-full gap-2 px-6 text-sm font-semibold sm:w-auto"
              >
                <Link href="/join">
                  <Users className="size-4" /> {hero("joinRoom")}
                </Link>
              </Button>
            </div>
            <div className="text-classified mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] text-muted-foreground lg:justify-start">
              <span>● {hero("stat1")}</span>
              <span>● {hero("stat2")}</span>
              <span>● {hero("stat3")}</span>
            </div>
            <Link
              href="/leaderboard"
              className="text-classified mt-4 inline-flex items-center gap-1.5 text-[11px] text-primary hover:underline"
            >
              <Trophy className="size-3.5" /> {lb("title")}
            </Link>
          </div>
          <div className="w-full max-w-sm flex-1">
            <DossierReveal />
          </div>
        </div>
      </section>

      {/* ── Roles ── */}
      <section className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="text-center">
          <span className="text-classified text-[11px] text-muted-foreground">
            {roles("eyebrow")}
          </span>
          <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
            {roles("heading")}
          </h2>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          <article className="relative overflow-hidden rounded-xl border border-border bg-card p-6">
            <div className="glow-amber-tr pointer-events-none absolute right-0 top-0 size-28" />
            <span className="relative flex size-11 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
              <UsersRound className="size-5" />
            </span>
            <h3 className="relative mt-4 flex items-center gap-2 text-lg font-semibold">
              {roles("civilian.title")}
              <span className="text-classified text-[10px] text-primary">
                {roles("civilian.tag")}
              </span>
            </h3>
            <p className="relative mt-2 text-sm text-muted-foreground">
              {roles("civilian.desc")}
            </p>
          </article>
          <article className="relative overflow-hidden rounded-xl border border-destructive/30 bg-card p-6">
            <div className="glow-crimson-tr pointer-events-none absolute right-0 top-0 size-28" />
            <span className="relative flex size-11 items-center justify-center rounded-lg border border-destructive/40 bg-destructive/10 text-destructive">
              <VenetianMask className="size-5" />
            </span>
            <h3 className="relative mt-4 flex items-center gap-2 text-lg font-semibold">
              {roles("spy.title")}
              <span className="text-classified text-[10px] text-destructive">
                {roles("spy.tag")}
              </span>
            </h3>
            <p className="relative mt-2 text-sm text-muted-foreground">
              {roles("spy.desc")}
            </p>
          </article>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="border-y border-border/60 bg-card/30">
        <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="text-center">
            <span className="text-classified text-[11px] text-muted-foreground">
              {steps("eyebrow")}
            </span>
            <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
              {steps("heading")}
            </h2>
          </div>
          <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEP_NOS.map((no) => {
              const Icon = STEP_ICONS[no];
              return (
                <li
                  key={no}
                  className="relative rounded-xl border border-border bg-background/40 p-5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-classified text-2xl font-bold text-primary/40">
                      {no}
                    </span>
                    <Icon className="size-5 text-muted-foreground" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold">
                    {steps(`items.${no}.title`)}
                  </h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {steps(`items.${no}.desc`)}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* ── Closing CTA ── */}
      <section className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-card p-6 text-center sm:p-10">
          <div className="bg-blueprint pointer-events-none absolute inset-0 opacity-30" />
          <div className="glow-hero pointer-events-none absolute inset-0" />
          <div className="relative">
            <h2 className="text-2xl font-bold sm:text-3xl">{cta("heading")}</h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
              {cta("desc")}
            </p>
            <Button
              asChild
              className="mt-7 h-11 gap-2 px-6 text-sm font-semibold"
            >
              <Link href="/offline">
                <LockOpen className="size-4" /> {landing("playOffline")}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border/60">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-4 px-4 py-8 text-center sm:flex-row sm:justify-between sm:gap-2 sm:px-6 sm:text-left">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary">
              <VenetianMask className="size-4" />
            </span>
            <span className="text-sm font-semibold tracking-wide">
              SPY PARTY
            </span>
          </div>
          <p className="text-classified text-[11px] text-muted-foreground">
            {footer("copyright")}
          </p>
        </div>
      </footer>
    </main>
  );
}
