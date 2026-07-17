import type { Metadata } from "next";
import {
  ClerkProvider,
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import { viVN } from "@clerk/localizations";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { VenetianMask } from "lucide-react";
import { Button } from "@/components/ui/button";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Spy Party — Ai Là Gián Điệp",
  description:
    "Nhận từ bí mật, mô tả thật khéo, và lật mặt kẻ giả danh. Trò chơi suy luận xã hội cho nhóm bạn — chơi online hoặc offline.",
};

// Theme Clerk's UI (modals, UserButton menu) to match the "Classified Dossier"
// dark palette: warm charcoal surfaces, amber primary, crimson danger, Geist font.
// NOTE: this clerk-js honors the CURRENT variable names
// (colorForeground / colorInput / colorInputForeground / colorPrimaryForeground /
// colorNeutral). The legacy names (colorText / colorInputBackground / …) are
// silently ignored at runtime, and `@clerk/themes`' baseTheme is not applied by
// this @clerk/nextjs version — so we theme entirely via these flat variables.
const clerkAppearance = {
  variables: {
    colorBackground: "#1c1b19",
    colorNeutral: "white",
    colorForeground: "#ece9e0",
    colorPrimary: "#e0a82e",
    colorPrimaryForeground: "#1a160b",
    colorInput: "#26241f",
    colorInputForeground: "#ece9e0",
    colorDanger: "#e5484d",
    borderRadius: "0.625rem",
    fontFamily: "var(--font-geist-sans), ui-sans-serif, sans-serif",
  },
  // Make the "Sign out" item in the UserButton dropdown stand out in crimson.
  elements: {
    userButtonPopoverActionButton__signOut:
      "text-destructive! hover:bg-destructive/10",
    userButtonPopoverActionButtonIcon__signOut: "text-destructive!",
    userButtonPopoverActionButtonText__signOut: "text-destructive!",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`dark ${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="flex min-h-dvh flex-col antialiased">
        <ClerkProvider appearance={clerkAppearance} localization={viVN}>
          <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border/60 bg-background/70 px-4 backdrop-blur-md sm:px-6">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary">
                <VenetianMask className="size-5" />
              </span>
              <span className="flex flex-col leading-none">
                <span className="text-sm font-semibold tracking-wide">
                  SPY PARTY
                </span>
                <span className="text-classified text-[10px] text-muted-foreground">
                  Classified · Briefing
                </span>
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <Show when="signed-out">
                <SignInButton mode="modal">
                  <Button variant="ghost" size="sm">
                    Đăng nhập
                  </Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <Button size="sm">Vào cuộc</Button>
                </SignUpButton>
              </Show>
              <Show when="signed-in">
                <UserButton />
              </Show>
            </div>
          </header>
          <div className="flex flex-1 flex-col">{children}</div>
        </ClerkProvider>
      </body>
    </html>
  );
}
