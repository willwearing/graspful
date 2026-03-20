import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider } from "@/lib/theme/theme-provider";
import { ThemeToggle } from "@/components/app/theme-toggle";

describe("ThemeToggle", () => {
  it("toggles the document into dark mode", () => {
    const storage = {
      getItem: (_key: string) => null,
      setItem: (_key: string, _value: string) => undefined,
      removeItem: (_key: string) => undefined,
      clear: () => undefined,
    };
    const setItem = vi.spyOn(storage, "setItem");

    Object.defineProperty(window, "localStorage", {
      value: storage,
      configurable: true,
    });

    document.documentElement.classList.remove("dark");

    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /switch to dark mode/i }));

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(setItem).toHaveBeenCalledWith("theme-preference", "dark");
  });
});
