"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Users } from "lucide-react";

import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhaseBanner } from "@/components/phase-banner";
import { joinRoom } from "@/lib/actions/rooms";

const ERROR_KEYS: Record<string, string> = {
  name_required: "errNameRequired",
  not_found: "errNotFound",
  already_started: "errAlreadyStarted",
  room_full: "errRoomFull",
  name_taken: "errNameTaken",
};

export function JoinForm({ initialCode = "" }: { initialCode?: string }) {
  const t = useTranslations("online");
  const tc = useTranslations("common");
  const router = useRouter();

  const [code, setCode] = useState(initialCode.toUpperCase());
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      setError(null);
      const res = await joinRoom(code, name);
      if ("ok" in res && res.code) {
        router.push(`/room/${res.code}`);
      } else if ("error" in res) {
        setError(t(ERROR_KEYS[res.error] ?? "errGeneric"));
      }
    });
  }

  return (
    <main className="bg-blueprint relative flex min-h-dvh flex-col items-center justify-center px-4">
      <div className="glow-hero pointer-events-none absolute inset-0" />
      <div className="relative w-full max-w-sm">
        <PhaseBanner
          eyebrow={t("joinTitle")}
          title="SPY PARTY"
          description={t("joinDesc")}
        />

        <div className="mt-8 flex flex-col gap-4">
          <div>
            <Label className="text-classified text-[11px] text-muted-foreground">
              {t("codeLabel")}
            </Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="ABC123"
              autoCapitalize="characters"
              className="mt-2 h-12 text-center font-mono text-2xl tracking-[0.3em]"
            />
          </div>
          <div>
            <Label className="text-classified text-[11px] text-muted-foreground">
              {t("nameLabel")}
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("nameLabel")}
              maxLength={24}
              className="mt-2 h-11"
            />
          </div>

          {error && <p className="text-center text-sm text-destructive">{error}</p>}

          <Button
            type="button"
            onClick={submit}
            disabled={pending || code.length < 4 || !name.trim()}
            className="h-12 w-full gap-2 text-sm font-semibold"
          >
            <Users className="size-4" /> {pending ? tc("loading") : t("joinButton")}
          </Button>
        </div>
      </div>
    </main>
  );
}
