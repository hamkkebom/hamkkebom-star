import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

const mockReplace = vi.fn();
let mockPathname = "/stars/project-board";
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
}));

const { FilterBar } = await import("@/components/project/filter-bar");

describe("FilterBar", () => {
  afterEach(() => {
    cleanup();
    mockReplace.mockReset();
    mockPathname = "/stars/project-board";
    mockSearchParams = new URLSearchParams();
  });

  it("renders search input with placeholder", () => {
    render(<FilterBar />);
    expect(
      screen.getByPlaceholderText("요청 제목 또는 요구사항 검색")
    ).toBeInTheDocument();
  });

  it("renders status select with default value", () => {
    render(<FilterBar />);
    // Default status is "ALL" which shows "전체"
    expect(screen.getByText("전체")).toBeInTheDocument();
  });

  it("renders search input as text input", () => {
    render(<FilterBar />);
    const input = screen.getByPlaceholderText("요청 제목 또는 요구사항 검색");
    expect(input.tagName).toBe("INPUT");
  });

  it("renders with initial search value from URL", () => {
    mockSearchParams = new URLSearchParams("search=브랜딩");
    render(<FilterBar />);
    const input = screen.getByPlaceholderText("요청 제목 또는 요구사항 검색") as HTMLInputElement;
    expect(input.value).toBe("브랜딩");
  });

  it("renders wrapper with border styling", () => {
    const { container } = render(<FilterBar />);
    const wrapper = container.firstElementChild;
    expect(wrapper?.className).toContain("border");
    expect(wrapper?.className).toContain("rounded-xl");
  });
});
