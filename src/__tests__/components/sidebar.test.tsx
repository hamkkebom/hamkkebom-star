import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// Mock Next.js modules
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    <a href={href} {...props}>{children}</a>,
}));

let mockPathname = "/stars/dashboard";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

// Mock Supabase client
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { signOut: vi.fn().mockResolvedValue({}) },
  }),
}));

// Mock TanStack Query
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: null, isLoading: false }),
  useQueryClient: () => ({}),
}));

const { Sidebar } = await import("@/components/layout/sidebar");

describe("Sidebar", () => {
  afterEach(() => {
    cleanup();
    mockPathname = "/stars/dashboard";
  });

  it("renders brand name", () => {
    render(<Sidebar />);
    expect(screen.getByText("별들에게 물어봐")).toBeInTheDocument();
  });

  it("renders brand logo character", () => {
    render(<Sidebar />);
    expect(screen.getByText("봄")).toBeInTheDocument();
  });

  it("renders all main navigation items", () => {
    render(<Sidebar />);
    expect(screen.getByText("대시보드")).toBeInTheDocument();
    expect(screen.getByText("내 영상 관리")).toBeInTheDocument();
    expect(screen.getByText("프로젝트 찾기 & 제출")).toBeInTheDocument();
    expect(screen.getByText("피드백 확인")).toBeInTheDocument();
  });

  it("renders bottom navigation items", () => {
    render(<Sidebar />);
    expect(screen.getByText("설정")).toBeInTheDocument();
    expect(screen.getByText("로그아웃")).toBeInTheDocument();
  });

  it("renders correct nav links", () => {
    render(<Sidebar />);
    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/stars/dashboard");
    expect(hrefs).toContain("/stars/my-videos");
    expect(hrefs).toContain("/stars/upload");
    expect(hrefs).toContain("/stars/feedback");
    expect(hrefs).toContain("/");
    expect(hrefs).toContain("/stars/settings");
  });

  it("applies active styles for current path", () => {
    mockPathname = "/stars/my-videos";
    const { container } = render(<Sidebar />);
    const myVideosLink = screen.getByText("내 영상 관리").closest("a");
    expect(myVideosLink?.className).toContain("bg-sidebar-accent/60");
  });

  it("does not apply active styles to non-matching paths", () => {
    mockPathname = "/stars/dashboard";
    render(<Sidebar />);
    const myVideosLink = screen.getByText("내 영상 관리").closest("a");
    expect(myVideosLink?.className).not.toContain("bg-sidebar-accent/60");
  });

  it("renders aside element with correct width class", () => {
    const { container } = render(<Sidebar />);
    const aside = container.querySelector("aside");
    expect(aside).toBeDefined();
    expect(aside?.className).toContain("w-64");
  });
});
