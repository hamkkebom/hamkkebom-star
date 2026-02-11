import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// Mock Next.js modules
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    <a href={href} {...props}>{children}</a>,
}));

let mockPathname = "/";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

// Mock Zustand auth store
type MockUser = { id: string; name: string; role: "ADMIN" | "STAR"; email: string };
let mockUser: MockUser | null = null;
let mockIsLoading = false;

vi.mock("@/stores/auth-store", () => ({
  useAuthStore: (selector: (s: { user: MockUser | null; isLoading: boolean }) => unknown) =>
    selector({ user: mockUser, isLoading: mockIsLoading }),
}));

// Mock Supabase client
const mockSignOut = vi.fn().mockResolvedValue({});
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signOut: mockSignOut } }),
}));

// Mock ThemeToggle
vi.mock("@/components/layout/theme-toggle", () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}));

const { PublicHeader } = await import("@/components/layout/public-header");

describe("PublicHeader", () => {
  afterEach(() => {
    cleanup();
    mockPathname = "/";
    mockUser = null;
    mockIsLoading = false;
    vi.clearAllMocks();
  });

  it("영상 라이브러리 링크가 '/'를 가리킨다", () => {
    render(<PublicHeader />);
    const link = screen.getByText("영상 라이브러리").closest("a");
    expect(link?.getAttribute("href")).toBe("/");
  });

  it("스타 소개 링크가 '/stars'를 가리킨다", () => {
    render(<PublicHeader />);
    const link = screen.getByText("스타 소개").closest("a");
    expect(link?.getAttribute("href")).toBe("/stars");
  });

  it("설명회 링크가 존재하지 않는다", () => {
    render(<PublicHeader />);
    expect(screen.queryByText("설명회")).toBeNull();
  });

  it("'/videos' 링크가 존재하지 않는다", () => {
    render(<PublicHeader />);
    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).not.toContain("/videos");
  });

  it("pathname '/'에서 영상 라이브러리가 활성 스타일을 가진다", () => {
    mockPathname = "/";
    render(<PublicHeader />);
    const link = screen.getByText("영상 라이브러리").closest("a");
    expect(link?.className).toContain("bg-violet-50");
  });

  it("pathname '/stars'에서 영상 라이브러리가 비활성이다", () => {
    mockPathname = "/stars";
    render(<PublicHeader />);
    const link = screen.getByText("영상 라이브러리").closest("a");
    expect(link?.className).not.toContain("bg-violet-50");
  });

  it("isLoading=true일 때 로그인 버튼과 Avatar 모두 미표시", () => {
    mockIsLoading = true;
    mockUser = null;
    render(<PublicHeader />);
    expect(screen.queryByText("로그인")).toBeNull();
    expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
  });

  it("비로그인 상태에서 로그인 버튼 표시", () => {
    mockIsLoading = false;
    mockUser = null;
    render(<PublicHeader />);
    expect(screen.getByText("로그인")).toBeInTheDocument();
  });

  it("로그인 상태에서 Avatar 표시, 로그인 버튼 미표시", () => {
    mockUser = { id: "1", name: "Test", role: "STAR", email: "test@test.com" };
    mockIsLoading = false;
    render(<PublicHeader />);
    expect(screen.queryByText("로그인")).toBeNull();
    expect(screen.getByText("U")).toBeInTheDocument();
  });
});
