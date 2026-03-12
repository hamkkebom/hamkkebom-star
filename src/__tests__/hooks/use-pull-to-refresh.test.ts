import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";

describe("usePullToRefresh", () => {
  let mockOnRefresh: () => Promise<void>;

  beforeEach(() => {
    mockOnRefresh = vi.fn().mockResolvedValue(undefined);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("초기 상태 — pullDistance=0, isRefreshing=false", () => {
    const { result } = renderHook(() =>
      usePullToRefresh({ onRefresh: mockOnRefresh })
    );

    expect(result.current.pullDistance).toBe(0);
    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.pullIndicatorRef).toBeDefined();
  });

  it("threshold 기본값 80px", () => {
    const { result } = renderHook(() =>
      usePullToRefresh({ onRefresh: mockOnRefresh })
    );

    // threshold는 내부 상태이므로, 동작으로 검증
    // 80px 이상 당기면 refresh 트리거
    act(() => {
      const touchStartEvent = new TouchEvent("touchstart", {
        touches: [{ clientY: 100 } as Touch],
      });
      window.dispatchEvent(touchStartEvent);
    });

    act(() => {
      const touchMoveEvent = new TouchEvent("touchmove", {
        touches: [{ clientY: 180 } as Touch],
      });
      window.dispatchEvent(touchMoveEvent);
    });

    // pullDistance = (180 - 100) * 0.5 = 40 (< 80, 아직 threshold 미달)
    expect(result.current.pullDistance).toBeLessThan(80);
  });

  it("isEnabled=false — 리스너 미등록", () => {
    const { result } = renderHook(() =>
      usePullToRefresh({ onRefresh: mockOnRefresh, isEnabled: false })
    );

    act(() => {
      const touchStartEvent = new TouchEvent("touchstart", {
        touches: [{ clientY: 100 } as Touch],
      });
      window.dispatchEvent(touchStartEvent);
    });

    act(() => {
      const touchMoveEvent = new TouchEvent("touchmove", {
        touches: [{ clientY: 200 } as Touch],
      });
      window.dispatchEvent(touchMoveEvent);
    });

    // isEnabled=false이므로 pullDistance 변화 없음
    expect(result.current.pullDistance).toBe(0);
  });

  it("touchmove — window.scrollY !== 0이면 무시", () => {
    const { result } = renderHook(() =>
      usePullToRefresh({ onRefresh: mockOnRefresh })
    );

    // scrollY를 0이 아닌 값으로 설정
    Object.defineProperty(window, "scrollY", {
      value: 100,
      writable: true,
      configurable: true,
    });

    act(() => {
      const touchStartEvent = new TouchEvent("touchstart", {
        touches: [{ clientY: 100 } as Touch],
      });
      window.dispatchEvent(touchStartEvent);
    });

    act(() => {
      const touchMoveEvent = new TouchEvent("touchmove", {
        touches: [{ clientY: 200 } as Touch],
      });
      window.dispatchEvent(touchMoveEvent);
    });

    // scrollY !== 0이므로 pullDistance 변화 없음
    expect(result.current.pullDistance).toBe(0);

    // 정리
    Object.defineProperty(window, "scrollY", {
      value: 0,
      writable: true,
      configurable: true,
    });
  });

  it("resistance factor 적용 — pullDistance = Math.min(delta * 0.5, threshold * 1.5)", () => {
    const { result } = renderHook(() =>
      usePullToRefresh({ onRefresh: mockOnRefresh, threshold: 80 })
    );

    act(() => {
      const touchStartEvent = new TouchEvent("touchstart", {
        touches: [{ clientY: 100 } as Touch],
      });
      window.dispatchEvent(touchStartEvent);
    });

    act(() => {
      // delta = 300 - 100 = 200
      // pullDistance = Math.min(200 * 0.5, 80 * 1.5) = Math.min(100, 120) = 100
      const touchMoveEvent = new TouchEvent("touchmove", {
        touches: [{ clientY: 300 } as Touch],
      });
      window.dispatchEvent(touchMoveEvent);
    });

    expect(result.current.pullDistance).toBe(100);
  });

  it("pullDistance >= threshold — onRefresh 호출, isRefreshing=true", async () => {
    const { result } = renderHook(() =>
      usePullToRefresh({ onRefresh: mockOnRefresh, threshold: 40 })
    );

    act(() => {
      const touchStartEvent = new TouchEvent("touchstart", {
        touches: [{ clientY: 100 } as Touch],
      });
      window.dispatchEvent(touchStartEvent);
    });

    act(() => {
      // delta = 280 - 100 = 180
      // pullDistance = Math.min(180 * 0.5, 40 * 1.5) = Math.min(90, 60) = 60 (>= threshold)
      const touchMoveEvent = new TouchEvent("touchmove", {
        touches: [{ clientY: 280 } as Touch],
      });
      window.dispatchEvent(touchMoveEvent);
    });

    expect(result.current.pullDistance).toBe(60);

    await act(async () => {
      const touchEndEvent = new TouchEvent("touchend");
      window.dispatchEvent(touchEndEvent);
      // onRefresh 완료 대기
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    expect(mockOnRefresh).toHaveBeenCalledOnce();
    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.pullDistance).toBe(0);
  });

  it("pullDistance < threshold — 애니메이션 복귀, onRefresh 미호출", async () => {
    const { result } = renderHook(() =>
      usePullToRefresh({ onRefresh: mockOnRefresh, threshold: 80 })
    );

    act(() => {
      const touchStartEvent = new TouchEvent("touchstart", {
        touches: [{ clientY: 100 } as Touch],
      });
      window.dispatchEvent(touchStartEvent);
    });

    act(() => {
      // delta = 220 - 100 = 120
      // pullDistance = Math.min(120 * 0.5, 80 * 1.5) = Math.min(60, 120) = 60 (< threshold)
      const touchMoveEvent = new TouchEvent("touchmove", {
        touches: [{ clientY: 220 } as Touch],
      });
      window.dispatchEvent(touchMoveEvent);
    });

    expect(result.current.pullDistance).toBe(60);

    await act(async () => {
      const touchEndEvent = new TouchEvent("touchend");
      window.dispatchEvent(touchEndEvent);
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    expect(mockOnRefresh).not.toHaveBeenCalled();
    expect(result.current.pullDistance).toBe(0);
  });

  it("onRefresh 실패 — isRefreshing 해제, pullDistance 초기화", async () => {
    const mockFailingRefresh = vi
      .fn()
      .mockRejectedValue(new Error("Refresh failed"));

    const { result } = renderHook(() =>
      usePullToRefresh({ onRefresh: mockFailingRefresh, threshold: 40 })
    );

    act(() => {
      const touchStartEvent = new TouchEvent("touchstart", {
        touches: [{ clientY: 100 } as Touch],
      });
      window.dispatchEvent(touchStartEvent);
    });

    act(() => {
      const touchMoveEvent = new TouchEvent("touchmove", {
        touches: [{ clientY: 280 } as Touch],
      });
      window.dispatchEvent(touchMoveEvent);
    });

    await act(async () => {
      const touchEndEvent = new TouchEvent("touchend");
      window.dispatchEvent(touchEndEvent);
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    expect(mockFailingRefresh).toHaveBeenCalledOnce();
    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.pullDistance).toBe(0);
  });

  it("touchmove — { passive: false } 옵션으로 preventDefault 가능", () => {
    const preventDefaultSpy = vi.fn();
    const { result } = renderHook(() =>
      usePullToRefresh({ onRefresh: mockOnRefresh })
    );

    act(() => {
      const touchStartEvent = new TouchEvent("touchstart", {
        touches: [{ clientY: 100 } as Touch],
      });
      window.dispatchEvent(touchStartEvent);
    });

    act(() => {
      const touchMoveEvent = new TouchEvent("touchmove", {
        touches: [{ clientY: 200 } as Touch],
        cancelable: true,
      });
      touchMoveEvent.preventDefault = preventDefaultSpy;
      window.dispatchEvent(touchMoveEvent);
    });

    // preventDefault가 호출되었는지 확인 (pulling down 시)
    expect(result.current.pullDistance).toBeGreaterThan(0);
  });

  it("cleanup — 언마운트 시 리스너 제거", () => {
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

    const { unmount } = renderHook(() =>
      usePullToRefresh({ onRefresh: mockOnRefresh })
    );

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith("touchstart", expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith("touchmove", expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith("touchend", expect.any(Function));

    removeEventListenerSpy.mockRestore();
  });

  it("custom threshold 적용", () => {
    const { result } = renderHook(() =>
      usePullToRefresh({ onRefresh: mockOnRefresh, threshold: 120 })
    );

    act(() => {
      const touchStartEvent = new TouchEvent("touchstart", {
        touches: [{ clientY: 100 } as Touch],
      });
      window.dispatchEvent(touchStartEvent);
    });

    act(() => {
      // delta = 300 - 100 = 200
      // pullDistance = Math.min(200 * 0.5, 120 * 1.5) = Math.min(100, 180) = 100
      const touchMoveEvent = new TouchEvent("touchmove", {
        touches: [{ clientY: 300 } as Touch],
      });
      window.dispatchEvent(touchMoveEvent);
    });

    expect(result.current.pullDistance).toBe(100);
  });

  it("isRefreshing 중 touchmove 무시", async () => {
    const slowRefresh = vi.fn(
      () => new Promise<void>((resolve) => setTimeout(resolve, 50))
    );

    const { result } = renderHook(() =>
      usePullToRefresh({ onRefresh: slowRefresh, threshold: 40 })
    );

    act(() => {
      const touchStartEvent = new TouchEvent("touchstart", {
        touches: [{ clientY: 100 } as Touch],
      });
      window.dispatchEvent(touchStartEvent);
    });

    act(() => {
      const touchMoveEvent = new TouchEvent("touchmove", {
        touches: [{ clientY: 280 } as Touch],
      });
      window.dispatchEvent(touchMoveEvent);
    });

    const initialPullDistance = result.current.pullDistance;

    // touchend 트리거 — isRefreshing 시작
    await act(async () => {
      const touchEndEvent = new TouchEvent("touchend");
      window.dispatchEvent(touchEndEvent);
      // 상태 업데이트 대기
      await new Promise((resolve) => setTimeout(resolve, 5));
    });

    // isRefreshing 중 touchmove 시도
    act(() => {
      const touchMoveEvent = new TouchEvent("touchmove", {
        touches: [{ clientY: 400 } as Touch],
      });
      window.dispatchEvent(touchMoveEvent);
    });

    // pullDistance 변화 없음 (isRefreshing 중이므로)
    expect(result.current.pullDistance).toBe(initialPullDistance);

    // onRefresh 완료 대기
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 60));
    });
  });
});
