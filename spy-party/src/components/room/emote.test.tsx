import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { EmoteOverlay } from "./emote-overlay";
import { EmotePickerBar } from "./emote-picker-bar";
import en from "../../../messages/en.json";
import viMessages from "../../../messages/vi.json";
import type { ActiveEmote } from "@/hooks/use-room-emotes";

describe("EmoteOverlay", () => {
  it("renders nothing when emotes list is empty", () => {
    const { container } = render(<EmoteOverlay emotes={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders active emotes with sender names", () => {
    const mockEmotes: ActiveEmote[] = [
      {
        id: "1",
        senderId: "p1",
        senderName: "Agent 007",
        emoji: "🕵️",
        xPercent: 50,
        createdAt: Date.now(),
      },
    ];

    render(<EmoteOverlay emotes={mockEmotes} />);
    expect(screen.getByText("🕵️")).toBeInTheDocument();
    expect(screen.getByText("Agent 007")).toBeInTheDocument();
  });
});

describe("EmotePickerBar", () => {
  it("renders quick emojis and calls onSelectEmote when clicked", () => {
    const handleSelect = vi.fn();
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <EmotePickerBar onSelectEmote={handleSelect} />
      </NextIntlClientProvider>,
    );

    const spyEmoteBtn = screen.getByText("🕵️");
    expect(spyEmoteBtn).toBeInTheDocument();

    fireEvent.click(spyEmoteBtn);
    expect(handleSelect).toHaveBeenCalledWith("🕵️");
  });

  it("opens extended palette popover and switches categories", () => {
    const handleSelect = vi.fn();
    render(
      <NextIntlClientProvider locale="vi" messages={viMessages}>
        <EmotePickerBar onSelectEmote={handleSelect} />
      </NextIntlClientProvider>,
    );

    // Open palette popover
    const openBtn = screen.getByTitle("Thêm emote");
    fireEvent.click(openBtn);

    // Verify title in popover
    expect(screen.getByText("Thả cảm xúc")).toBeInTheDocument();

    // Click category tab "Reactions"
    const reactionsTab = screen.getByText("Reactions");
    fireEvent.click(reactionsTab);

    // Select emoji from grid
    const skullBtn = screen.getByText("💀");
    fireEvent.click(skullBtn);
    expect(handleSelect).toHaveBeenCalledWith("💀");
  });
});
