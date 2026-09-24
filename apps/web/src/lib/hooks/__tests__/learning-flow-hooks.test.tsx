import { StrictMode, type PropsWithChildren } from "react";
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAnswerSubmission } from "../use-answer-submission";
import { useLatestRef } from "../use-latest-ref";
import { useMountEffect } from "../use-mount-effect";
import { usePracticeLoop } from "../use-practice-loop";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

afterEach(() => vi.useRealTimers());

describe("learning flow request lifecycle", () => {
  it("blocks repeated same-tick submissions and waits for feedback before releasing the guard", async () => {
    const response = deferred<string>();
    const feedback = deferred<void>();
    const send = vi.fn(() => response.promise);
    const onSuccess = vi.fn(() => feedback.promise);
    const { result } = renderHook(() => useAnswerSubmission({ send, onSuccess, errorMessage: "Save failed" }));
    let first!: Promise<void>;
    act(() => {
      first = result.current.submit({ answer: "A" });
      expect(result.current.submit({ answer: "B" })).toBe(first);
    });
    await act(async () => { response.resolve("saved"); });
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith({ answer: "A" });
    expect(onSuccess).toHaveBeenCalledWith("saved", { answer: "A" });
    expect(result.current.submitting).toBe(true);
    await act(async () => { feedback.resolve(); await first; });
    expect(result.current.submitting).toBe(false);
    expect(result.current.pendingRequestRef.current).toBeNull();
  });

  it("retries the exact original request after a failed response", async () => {
    const send = vi.fn<(request: { body: string }) => Promise<string>>()
      .mockRejectedValueOnce(new Error("response lost"))
      .mockResolvedValueOnce("saved");
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useAnswerSubmission({ send, onSuccess, errorMessage: "Save failed" }));
    const original = { body: JSON.stringify({ requestId: "one-attempt", answer: "A", responseTimeMs: 8 }) };
    await act(() => result.current.submit(original));
    expect(result.current.error).toBe("Save failed");
    expect(onSuccess).not.toHaveBeenCalled();
    await act(() => result.current.retry());
    expect(send.mock.calls[1][0]).toBe(original);
    expect(result.current.error).toBeNull();
    await act(() => result.current.retry());
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("uses the latest committed send callback without changing submit identity", async () => {
    const firstSend = vi.fn(async () => "old token");
    const nextSend = vi.fn(async () => "new token");
    const { result, rerender } = renderHook(({ send }) => useAnswerSubmission({ send, errorMessage: "Failed" }), {
      initialProps: { send: firstSend },
    });
    const submit = result.current.submit;
    rerender({ send: nextSend });
    expect(result.current.submit).toBe(submit);
    await act(() => result.current.submit("answer"));
    expect(firstSend).not.toHaveBeenCalled();
    expect(nextSend).toHaveBeenCalledWith("answer");
  });

  it.each(["resolve", "reject"] as const)("ignores a late %s after unmount", async (settle) => {
    const response = deferred<string>();
    const onSuccess = vi.fn();
    const { result, unmount } = renderHook(() => useAnswerSubmission({
      send: () => response.promise, onSuccess, errorMessage: "Failed",
    }));
    let pending!: Promise<void>;
    act(() => { pending = result.current.submit("answer"); });
    unmount();
    await act(async () => {
      if (settle === "resolve") response.resolve("saved");
      else response.reject(new Error("offline"));
      await pending;
    });
    expect(onSuccess).not.toHaveBeenCalled();
  });
});

describe("practice feedback lifecycle", () => {
  it("respects the server retry delay and advances once", async () => {
    vi.useFakeTimers();
    const advance = vi.fn();
    const { result } = renderHook(() => usePracticeLoop<string>());
    act(() => { void result.current.present("Try again", advance, 4000); });
    await act(() => vi.advanceTimersByTimeAsync(3999));
    expect(result.current.feedback).toBe("Try again");
    expect(advance).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(advance).toHaveBeenCalledTimes(1);
    expect(result.current.feedback).toBeNull();
    expect(result.current.attempt).toBe(1);
  });

  it("cancels advancement on unmount and settles the waiting submission", async () => {
    vi.useFakeTimers();
    const advance = vi.fn();
    const { result, unmount } = renderHook(() => usePracticeLoop<string>());
    let pending!: Promise<void>;
    act(() => { pending = result.current.present("Saved", advance); });
    unmount();
    await pending;
    await act(() => vi.advanceTimersByTimeAsync(3000));
    expect(advance).not.toHaveBeenCalled();
  });

  it("resets feedback and cancels the previous question's timer", async () => {
    vi.useFakeTimers();
    const advance = vi.fn();
    const { result } = renderHook(() => usePracticeLoop<string>());
    act(() => { void result.current.present("Saved", advance, 0); });
    await act(() => vi.advanceTimersByTimeAsync(1499));
    expect(advance).not.toHaveBeenCalled();
    act(() => result.current.reset());
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(result.current.feedback).toBeNull();
    expect(advance).not.toHaveBeenCalled();
  });
});

it("mount cleanup reads latest committed values without replaying start on rerender", () => {
  const start = vi.fn();
  const cleanup = vi.fn();
  const { rerender, unmount } = renderHook(({ phase }) => {
    const latest = useLatestRef(phase);
    useMountEffect(() => { start(); return () => cleanup(latest.current); });
  }, { initialProps: { phase: "instruction" } });
  rerender({ phase: "practice" });
  unmount();
  expect(start).toHaveBeenCalledTimes(1);
  expect(cleanup).toHaveBeenCalledWith("practice");
});

it("submissions still work after StrictMode effect cleanup and remount", async () => {
  const send = vi.fn(async () => "saved");
  const onSuccess = vi.fn();
  const { result } = renderHook(() => useAnswerSubmission({ send, onSuccess, errorMessage: "Failed" }), {
    wrapper: ({ children }: PropsWithChildren) => <StrictMode>{children}</StrictMode>,
  });
  await act(() => result.current.submit("answer"));
  expect(onSuccess).toHaveBeenCalledWith("saved", "answer");
});
