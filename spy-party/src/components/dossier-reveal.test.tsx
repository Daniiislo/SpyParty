import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { DossierReveal } from "./dossier-reveal";
import en from "../../messages/en.json";
import vi from "../../messages/vi.json";

describe("DossierReveal", () => {
  it("renders the English decode label inside an en provider", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <DossierReveal />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText("Decode dossier")).toBeInTheDocument();
  });

  it("renders the Vietnamese decode label inside a vi provider", () => {
    render(
      <NextIntlClientProvider locale="vi" messages={vi}>
        <DossierReveal />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText("Giải mã hồ sơ")).toBeInTheDocument();
  });

  it("reveal mode: decoding marks the player viewed and shows no separate confirm button", () => {
    // Force reduced motion so the scramble settles synchronously (no interval).
    window.matchMedia = (() => ({
      matches: true,
      addEventListener() {},
      removeEventListener() {},
    })) as unknown as typeof window.matchMedia;

    let viewed = 0;
    render(
      <NextIntlClientProvider locale="vi" messages={vi}>
        <DossierReveal
          mode="reveal"
          role="civilian"
          word="CÀ PHÊ"
          topic="Đồ uống"
          onDone={() => {
            viewed += 1;
          }}
        />
      </NextIntlClientProvider>,
    );

    // The old "I've memorized it" confirmation step is gone.
    expect(screen.queryByText("Tôi đã nhớ rồi")).not.toBeInTheDocument();

    // Decoding (viewing) the word is itself what marks the player ready.
    fireEvent.click(screen.getByRole("button", { name: /Giải mã hồ sơ/ }));
    expect(viewed).toBe(1);
    expect(screen.getByText("Đã xem")).toBeInTheDocument();
  });
});
