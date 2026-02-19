import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import type React from "react";

// Mock Next.js modules
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) =>
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
  beforeEach(() => {
    mockUser = null;
    mockIsLoading = false;
    mockPathname = "/";
  });

  afterEach(() => {
    cleanup();
    mockPathname = "/";
    mockUser = null;
    mockIsLoading = false;
    vi.clearAllMocks();
  });

  it("로고가 '/'를 가리킨다", () => {
    render(<PublicHeader />);
    const logoLink = screen.getByText("함께봄").closest("a");
    expect(logoLink).toHaveAttribute("href", "/");
  });

  it("설명회 링크가 존재하지 않는다", () => {
    render(<PublicHeader />);
    expect(screen.queryByText("설명회")).toBeNull();
  });

  it("'/videos' 링크가 존재하지 않는다", () => {
    render(<PublicHeader />);
    const header = screen.getByRole("banner");
    const links = header.querySelectorAll("a");
    const videoLinks = Array.from(links).filter((link) => link.getAttribute("href") === "/videos");
    expect(videoLinks).toHaveLength(0);
  });

  it("isLoading=true일 때 로그인 버튼과 Avatar 모두 미표시", () => {
    mockIsLoading = true;
    mockUser = null;
    render(<PublicHeader />);
    expect(screen.queryByText("로그인")).toBeNull();
    expect(screen.queryByText("U")).toBeNull();
  });

  it("비로그인 상태에서 로그인 버튼 표시", () => {
    mockIsLoading = false;
    mockUser = null;
    render(<PublicHeader />);
    expect(screen.getByText("로그인")).toBeInTheDocument();
  });

  it("로그인 상태에서 마이페이지 버튼 표시, 로그인 버튼 미표시", () => {
    mockUser = { id: "1", name: "Test User", role: "STAR", email: "test@test.com" };
    mockIsLoading = false;
    render(<PublicHeader />);
    expect(screen.queryByText("로그인")).toBeNull();
    expect(screen.getByText("마이페이지")).toBeInTheDocument();
  });

  it("STAR 사용자는 마이페이지에서 /stars/dashboard로 이동", () => {
    mockUser = { id: "1", name: "Test User", role: "STAR", email: "test@test.com" };
    mockIsLoading = false;
    render(<PublicHeader />);
    const myPageLink = screen.getByText("마이페이지").closest("a");
    expect(myPageLink).toHaveAttribute("href", "/stars/dashboard");
  });

  it("ADMIN 사용자는 마이페이지에서 /admin으로 이동", () => {
    mockUser = { id: "1", name: "Test User", role: "ADMIN", email: "test@test.com" };
    mockIsLoading = false;
    render(<PublicHeader />);
    const myPageLink = screen.getByText("마이페이지").closest("a");
    expect(myPageLink).toHaveAttribute("href", "/admin");
  });
});
