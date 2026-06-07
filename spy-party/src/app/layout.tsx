import type { Metadata } from "next";
import {
  ClerkProvider,
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
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
  title: "Ai Là Gián Điệp — Trò chơi truy tìm gián điệp",
  description:
    "Nhận từ bí mật, mô tả thật khéo, và lật mặt kẻ giả danh. Trò chơi suy luận xã hội cho nhóm bạn — chơi online hoặc offline.",
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
        <ClerkProvider>
          <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border/60 bg-background/70 px-4 backdrop-blur-md sm:px-6">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary">
                <VenetianMask className="size-5" />
              </span>
              <span className="flex flex-col leading-none">
                <span className="text-sm font-semibold tracking-wide">
                  AI LÀ GIÁN ĐIỆP
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
