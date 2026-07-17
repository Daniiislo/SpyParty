import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { LanguageSwitcher } from "./language-switcher";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ replace }),
}));

describe("LanguageSwitcher", () => {
  beforeEach(() => replace.mockClear());

  it("switches to the other locale while preserving the current path", async () => {
    render(
      <NextIntlClientProvider locale="vi" messages={{}}>
        <LanguageSwitcher />
      </NextIntlClientProvider>,
    );

    // When the current locale is vi, the control offers a switch to English.
    await userEvent.click(screen.getByRole("button", { name: /english/i }));

    expect(replace).toHaveBeenCalledWith("/", { locale: "en" });
  });
});
