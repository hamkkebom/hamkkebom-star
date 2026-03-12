import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useScrollDirection } from "@/hooks/use-scroll-direction";

describe("useScrollDirection", () => {
  beforeEach(() => {
    // Reset window.scrollY to 0
    Object.defineProperty(window, "scrollY", {
      writable: true,
      configurable: true,
      value: 0,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("초기 상태 — scrollDirection null, isAtTop true", () => {
    const { result } = renderHook(() => useScrollDirection());

    expect(result.current.scrollDirection).toBeNull();
    expect(result.current.isAtTop).toBe(true);
  });

  it("아래로 스크롤 — scrollDirection 'down'으로 변경", () => {
    const { result } = renderHook(() => useScrollDirection({ threshold: 10 }));

    act(() => {
      // Simulate scroll down by 20px (exceeds threshold of 10)
      Object.defineProperty(window, "scrollY", {
        writable: true,
        configurable: true,
        value: 20,
      });
      window.dispatchEvent(new Event("scroll"));
    });

    expect(result.current.scrollDirection).toBe("down");
    expect(result.current.isAtTop).toBe(false);
  });

  it("위로 스크롤 — scrollDirection 'up'으로 변경", () => {
    const { result } = renderHook(() => useScrollDirection({ threshold: 10 }));

    // First scroll down
    act(() => {
      Object.defineProperty(window, "scrollY", {
        writable: true,
        configurable: true,
        value: 50,
      });
      window.dispatchEvent(new Event("scroll"));
    });

    expect(result.current.scrollDirection).toBe("down");

    // Then scroll up
    act(() => {
      Object.defineProperty(window, "scrollY", {
        writable: true,
        configurable: true,
        value: 30,
      });
      window.dispatchEvent(new Event("scroll"));
    });

    expect(result.current.scrollDirection).toBe("up");
    expect(result.current.isAtTop).toBe(false);
  });

  it("작은 스크롤 델타 (< threshold) — direction 변경 안 함", () => {
    const { result } = renderHook(() => useScrollDirection({ threshold: 10 }));

    // First scroll down by 20px (exceeds threshold)
    act(() => {
      Object.defineProperty(window, "scrollY", {
        writable: true,
        configurable: true,
        value: 20,
      });
      window.dispatchEvent(new Event("scroll"));
    });

    expect(result.current.scrollDirection).toBe("down");

    // Then scroll down by only 5px (below threshold)
    act(() => {
      Object.defineProperty(window, "scrollY", {
        writable: true,
        configurable: true,
        value: 25,
      });
      window.dispatchEvent(new Event("scroll"));
    });

    // Direction should remain "down" since delta (5px) < threshold (10px)
    expect(result.current.scrollDirection).toBe("down");
  });

  it("threshold 옵션 — 커스텀 threshold 적용", () => {
    const { result } = renderHook(() => useScrollDirection({ threshold: 50 }));

    // Scroll by 30px (below threshold of 50)
    act(() => {
      Object.defineProperty(window, "scrollY", {
        writable: true,
        configurable: true,
        value: 30,
      });
      window.dispatchEvent(new Event("scroll"));
    });

    // Direction should remain null since delta (30px) < threshold (50px)
    expect(result.current.scrollDirection).toBeNull();

    // Scroll by additional 25px (total 55px, delta 25px from last update)
    act(() => {
      Object.defineProperty(window, "scrollY", {
        writable: true,
        configurable: true,
        value: 55,
      });
      window.dispatchEvent(new Event("scroll"));
    });

    // Now direction should be "down" since delta (25px) >= threshold (50px)
    // Wait, this is wrong. Let me reconsider: lastScrollY was 0, now it's 55, delta is 55 >= 50
    // Actually the logic should update lastScrollY only when threshold is exceeded
    // So: delta from 0 to 30 is 30 < 50, no update
    // Then delta from 0 to 55 is 55 >= 50, update to "down"
    expect(result.current.scrollDirection).toBe("down");
  });

  it("isAtTop — scrollY <= 0일 때 true", () => {
    const { result } = renderHook(() => useScrollDirection());

    // Scroll down
    act(() => {
      Object.defineProperty(window, "scrollY", {
        writable: true,
        configurable: true,
        value: 100,
      });
      window.dispatchEvent(new Event("scroll"));
    });

    expect(result.current.isAtTop).toBe(false);

    // Scroll back to top
    act(() => {
      Object.defineProperty(window, "scrollY", {
        writable: true,
        configurable: true,
        value: 0,
      });
      window.dispatchEvent(new Event("scroll"));
    });

    expect(result.current.isAtTop).toBe(true);
  });

  it("이벤트 리스너 정리 — unmount 시 listener 제거", () => {
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

    const { unmount } = renderHook(() => useScrollDirection());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "scroll",
      expect.any(Function),
    );

    removeEventListenerSpy.mockRestore();
  });

  it("passive: true 옵션 — scroll 이벤트 리스너 등록", () => {
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");

    renderHook(() => useScrollDirection());

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "scroll",
      expect.any(Function),
      { passive: true },
    );

    addEventListenerSpy.mockRestore();
  });

  it("threshold 변경 — 새로운 threshold로 리스너 재등록", () => {
    const { result, rerender } = renderHook(
      ({ threshold }: { threshold: number }) =>
        useScrollDirection({ threshold }),
      {
        initialProps: { threshold: 10 },
      },
    );

    // Scroll by 15px (exceeds initial threshold of 10)
    act(() => {
      Object.defineProperty(window, "scrollY", {
        writable: true,
        configurable: true,
        value: 15,
      });
      window.dispatchEvent(new Event("scroll"));
    });

    expect(result.current.scrollDirection).toBe("down");

    // Change threshold to 20
    rerender({ threshold: 20 });

    // Reset scrollY for next test
    act(() => {
      Object.defineProperty(window, "scrollY", {
        writable: true,
        configurable: true,
        value: 0,
      });
      window.dispatchEvent(new Event("scroll"));
    });

    // Scroll by 15px (below new threshold of 20)
    act(() => {
      Object.defineProperty(window, "scrollY", {
        writable: true,
        configurable: true,
        value: 15,
      });
      window.dispatchEvent(new Event("scroll"));
    });

    // Direction should remain "down" (unchanged) since delta (15px) < new threshold (20px)
    // The hook preserves the last known direction when delta is below threshold
    expect(result.current.scrollDirection).toBe("down");
  });
});
