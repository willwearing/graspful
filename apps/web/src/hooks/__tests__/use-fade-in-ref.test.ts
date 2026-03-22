import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, renderHook } from "@testing-library/react";
import { createElement } from "react";
import { useFadeInRef } from "../use-fade-in-ref";

describe("useFadeInRef", () => {
  let observeMock: ReturnType<typeof vi.fn>;
  let disconnectMock: ReturnType<typeof vi.fn>;
  let unobserveMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    observeMock = vi.fn();
    disconnectMock = vi.fn();
    unobserveMock = vi.fn();

    const MockIntersectionObserver = vi.fn(function (this: any) {
      this.observe = observeMock;
      this.disconnect = disconnectMock;
      this.unobserve = unobserveMock;
    });

    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  });

  it("returns a ref object", () => {
    const { result } = renderHook(() => useFadeInRef());
    expect(result.current).toHaveProperty("current");
  });

  it("observes .fade-in-section children when ref is attached", () => {
    function TestComponent() {
      const ref = useFadeInRef();
      return createElement(
        "div",
        { ref },
        createElement("div", { className: "fade-in-section" }),
        createElement("div", { className: "fade-in-section" }),
      );
    }

    render(createElement(TestComponent));

    expect(IntersectionObserver).toHaveBeenCalledTimes(1);
    expect(observeMock).toHaveBeenCalledTimes(2);
  });

  it("disconnects observer on unmount", () => {
    function TestComponent() {
      const ref = useFadeInRef();
      return createElement("div", { ref });
    }

    const { unmount } = render(createElement(TestComponent));
    unmount();

    expect(disconnectMock).toHaveBeenCalledTimes(1);
  });
});
