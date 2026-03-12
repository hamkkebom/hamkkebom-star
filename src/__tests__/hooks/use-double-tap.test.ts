import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDoubleTap } from "@/hooks/use-double-tap";

const createMouseEvent = (clientX: number, clientY: number) => {
  const event = new MouseEvent("click", {
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperty(event, "clientX", { value: clientX, enumerable: true });
  Object.defineProperty(event, "clientY", { value: clientY, enumerable: true });
  return event;
};

const createTouchEvent = (clientX: number, clientY: number) => {
  const touch = {
    clientX,
    clientY,
  };
  const event = new TouchEvent("touchend", {
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperty(event, "touches", {
    value: [touch],
    enumerable: true,
  });
  return event;
};

describe("useDoubleTap", () => {
  it("hook returns handlers", () => {
    const onDoubleTap = vi.fn();
    const { result } = renderHook(() => useDoubleTap({ onDoubleTap }));

    expect(result.current).toHaveProperty("onClick");
    expect(result.current).toHaveProperty("onTouchEnd");
    expect(typeof result.current.onClick).toBe("function");
    expect(typeof result.current.onTouchEnd).toBe("function");
  });

  it("onDoubleTap is NOT called on single click", () => {
    const onDoubleTap = vi.fn();
    const { result } = renderHook(() => useDoubleTap({ onDoubleTap }));

    const mockEvent = createMouseEvent(100, 100);

    act(() => {
      result.current.onClick(mockEvent as unknown as React.MouseEvent);
    });

    expect(onDoubleTap).not.toHaveBeenCalled();
  });

  it("onDoubleTap IS called on two clicks within delay", () => {
    vi.useFakeTimers();
    const onDoubleTap = vi.fn();
    const { result } = renderHook(() => useDoubleTap({ onDoubleTap, delay: 300 }));

    const mockEvent1 = createMouseEvent(100, 100);
    const mockEvent2 = createMouseEvent(100, 100);

    act(() => {
      result.current.onClick(mockEvent1 as unknown as React.MouseEvent);
    });

    act(() => {
      vi.advanceTimersByTime(150);
    });

    act(() => {
      result.current.onClick(mockEvent2 as unknown as React.MouseEvent);
    });

    expect(onDoubleTap).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it("onDoubleTap is NOT called if clicks are >delay apart", () => {
    vi.useFakeTimers();
    const onDoubleTap = vi.fn();
    const { result } = renderHook(() => useDoubleTap({ onDoubleTap, delay: 300 }));

    const mockEvent1 = createMouseEvent(100, 100);
    const mockEvent2 = createMouseEvent(100, 100);

    act(() => {
      result.current.onClick(mockEvent1 as unknown as React.MouseEvent);
    });

    act(() => {
      vi.advanceTimersByTime(301);
    });

    act(() => {
      result.current.onClick(mockEvent2 as unknown as React.MouseEvent);
    });

    expect(onDoubleTap).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("custom delay works", () => {
    vi.useFakeTimers();
    const onDoubleTap = vi.fn();
    const { result } = renderHook(() =>
      useDoubleTap({ onDoubleTap, delay: 500 })
    );

    const mockEvent1 = createMouseEvent(100, 100);
    const mockEvent2 = createMouseEvent(100, 100);

    act(() => {
      result.current.onClick(mockEvent1 as unknown as React.MouseEvent);
    });

    act(() => {
      vi.advanceTimersByTime(400);
    });

    act(() => {
      result.current.onClick(mockEvent2 as unknown as React.MouseEvent);
    });

    expect(onDoubleTap).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it("onDoubleTap is NOT called if clicks are >30px apart", () => {
    vi.useFakeTimers();
    const onDoubleTap = vi.fn();
    const { result } = renderHook(() => useDoubleTap({ onDoubleTap, delay: 300 }));

    const mockEvent1 = createMouseEvent(100, 100);
    const mockEvent2 = createMouseEvent(150, 150);

    act(() => {
      result.current.onClick(mockEvent1 as unknown as React.MouseEvent);
    });

    act(() => {
      vi.advanceTimersByTime(150);
    });

    act(() => {
      result.current.onClick(mockEvent2 as unknown as React.MouseEvent);
    });

    expect(onDoubleTap).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("onDoubleTap IS called if clicks are <=30px apart", () => {
    vi.useFakeTimers();
    const onDoubleTap = vi.fn();
    const { result } = renderHook(() => useDoubleTap({ onDoubleTap, delay: 300 }));

    const mockEvent1 = createMouseEvent(100, 100);
    const mockEvent2 = createMouseEvent(120, 120);

    act(() => {
      result.current.onClick(mockEvent1 as unknown as React.MouseEvent);
    });

    act(() => {
      vi.advanceTimersByTime(150);
    });

    act(() => {
      result.current.onClick(mockEvent2 as unknown as React.MouseEvent);
    });

    expect(onDoubleTap).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it("works with touch events", () => {
    vi.useFakeTimers();
    const onDoubleTap = vi.fn();
    const { result } = renderHook(() => useDoubleTap({ onDoubleTap, delay: 300 }));

    const mockTouchEvent1 = createTouchEvent(100, 100);
    const mockTouchEvent2 = createTouchEvent(100, 100);

    act(() => {
      result.current.onTouchEnd(mockTouchEvent1 as unknown as React.TouchEvent);
    });

    act(() => {
      vi.advanceTimersByTime(150);
    });

    act(() => {
      result.current.onTouchEnd(mockTouchEvent2 as unknown as React.TouchEvent);
    });

    expect(onDoubleTap).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it("calls preventDefault on double-tap", () => {
    vi.useFakeTimers();
    const onDoubleTap = vi.fn();
    const { result } = renderHook(() => useDoubleTap({ onDoubleTap, delay: 300 }));

    const mockEvent1 = createMouseEvent(100, 100);
    const mockEvent2 = createMouseEvent(100, 100);

    const preventDefaultSpy = vi.spyOn(mockEvent2, "preventDefault");

    act(() => {
      result.current.onClick(mockEvent1 as unknown as React.MouseEvent);
    });

    act(() => {
      vi.advanceTimersByTime(150);
    });

    act(() => {
      result.current.onClick(mockEvent2 as unknown as React.MouseEvent);
    });

    expect(preventDefaultSpy).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("resets timer after successful double-tap", () => {
    vi.useFakeTimers();
    const onDoubleTap = vi.fn();
    const { result } = renderHook(() => useDoubleTap({ onDoubleTap, delay: 300 }));

    const mockEvent1 = createMouseEvent(100, 100);
    const mockEvent2 = createMouseEvent(100, 100);
    const mockEvent3 = createMouseEvent(100, 100);

    act(() => {
      result.current.onClick(mockEvent1 as unknown as React.MouseEvent);
    });

    act(() => {
      vi.advanceTimersByTime(150);
    });

    act(() => {
      result.current.onClick(mockEvent2 as unknown as React.MouseEvent);
    });

    expect(onDoubleTap).toHaveBeenCalledOnce();

    // After double-tap, the next tap should be treated as a new single tap
    act(() => {
      vi.advanceTimersByTime(150);
    });

    act(() => {
      result.current.onClick(mockEvent3 as unknown as React.MouseEvent);
    });

    // Still only one call from the double-tap
    expect(onDoubleTap).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });
});
