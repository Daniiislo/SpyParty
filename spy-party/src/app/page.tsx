import {
  Fingerprint,
  LockOpen,
  Radar,
  ScrollText,
  Users,
  UsersRound,
  VenetianMask,
  Vote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DossierReveal } from "@/components/dossier-reveal";

const STEPS = [
  {
    no: "01",
    title: "Tạo phòng",
    desc: "Chọn số người chơi, số gián điệp và một chủ đề.",
    Icon: Radar,
  },
  {
    no: "02",
    title: "Nhận từ",
    desc: "Mỗi đặc vụ mở hồ sơ mật để xem từ của riêng mình.",
    Icon: Fingerprint,
  },
  {
    no: "03",
    title: "Mô tả",
    desc: "Lần lượt mỗi người nói một từ gợi ý cho từ của mình.",
    Icon: ScrollText,
  },
  {
    no: "04",
    title: "Truy tìm",
    desc: "Bỏ phiếu loại nghi can. Lật mặt hết gián điệp để thắng.",
    Icon: Vote,
  },
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="bg-blueprint pointer-events-none absolute inset-0 opacity-40" />
        <div className="glow-hero pointer-events-none absolute inset-0" />
        <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center gap-12 px-4 py-20 sm:px-6 sm:py-28 lg:flex-row lg:gap-16">
          <div className="flex flex-1 flex-col items-center text-center lg:items-start lg:text-left">
            <span className="text-classified inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-[11px] text-primary">
              <Fingerprint className="size-3.5" /> Hồ sơ mật · Briefing
            </span>
            <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-6xl">
              SPY <span className="text-primary">PARTY</span>
            </h1>
            <p className="mt-5 max-w-md text-base text-muted-foreground sm:text-lg">
              Mỗi người nhận một từ bí mật. Gián điệp nhận từ{" "}
              <span className="text-foreground">gần giống</span>. Mô tả thật
              khéo, bỏ phiếu thật tinh — và lật mặt kẻ giả danh trước khi quá
              muộn.
            </p>
            <div className="mt-8 flex w-full max-w-xs flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row">
              <Button className="h-11 w-full gap-2 px-6 text-sm font-semibold sm:w-auto">
                <Radar className="size-4" /> Tạo phòng
              </Button>
              <Button
                variant="outline"
                className="h-11 w-full gap-2 px-6 text-sm font-semibold sm:w-auto"
              >
                <Users className="size-4" /> Tham gia phòng
              </Button>
            </div>
            <div className="text-classified mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] text-muted-foreground lg:justify-start">
              <span>● 3–12 đặc vụ</span>
              <span>● Online &amp; Offline</span>
              <span>● Nhiều chủ đề</span>
            </div>
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
            Phân vai
          </span>
          <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
            Hai phe, một sự thật
          </h2>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          <article className="relative overflow-hidden rounded-xl border border-border bg-card p-6">
            <div className="glow-amber-tr pointer-events-none absolute right-0 top-0 size-28" />
            <span className="relative flex size-11 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
              <UsersRound className="size-5" />
            </span>
            <h3 className="relative mt-4 flex items-center gap-2 text-lg font-semibold">
              Người thường
              <span className="text-classified text-[10px] text-primary">
                Civilian
              </span>
            </h3>
            <p className="relative mt-2 text-sm text-muted-foreground">
              Bạn và đồng đội cùng nhận một từ. Mô tả đủ rõ để nhận ra nhau —
              nhưng đừng quá lộ liễu, kẻo gián điệp đoán được từ của bạn.
            </p>
          </article>
          <article className="relative overflow-hidden rounded-xl border border-destructive/30 bg-card p-6">
            <div className="glow-crimson-tr pointer-events-none absolute right-0 top-0 size-28" />
            <span className="relative flex size-11 items-center justify-center rounded-lg border border-destructive/40 bg-destructive/10 text-destructive">
              <VenetianMask className="size-5" />
            </span>
            <h3 className="relative mt-4 flex items-center gap-2 text-lg font-semibold">
              Gián điệp
              <span className="text-classified text-[10px] text-destructive">
                Undercover
              </span>
            </h3>
            <p className="relative mt-2 text-sm text-muted-foreground">
              Bạn nhận một từ gần giống nhưng không biết từ gốc. Hoà vào đám
              đông, mô tả thật mập mờ, và sống sót qua mỗi vòng bỏ phiếu.
            </p>
          </article>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="border-y border-border/60 bg-card/30">
        <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="text-center">
            <span className="text-classified text-[11px] text-muted-foreground">
              Quy trình
            </span>
            <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
              Một ván diễn ra thế nào
            </h2>
          </div>
          <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ no, title, desc, Icon }) => (
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
                <h3 className="mt-4 text-base font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Closing CTA ── */}
      <section className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-card p-6 text-center sm:p-10">
          <div className="bg-blueprint pointer-events-none absolute inset-0 opacity-30" />
          <div className="glow-hero pointer-events-none absolute inset-0" />
          <div className="relative">
            <h2 className="text-2xl font-bold sm:text-3xl">Sẵn sàng vào vai?</h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
              Tập hợp đồng đội, phát hồ sơ, và xem ai mới là kẻ giả danh thực
              sự.
            </p>
            <Button className="mt-7 h-11 gap-2 px-6 text-sm font-semibold">
              <LockOpen className="size-4" /> Bắt đầu nhiệm vụ
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
            © 2026 · Trò chơi suy luận xã hội
          </p>
        </div>
      </footer>
    </main>
  );
}
