import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
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
});
