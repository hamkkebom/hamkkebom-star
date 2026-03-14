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

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: { children?: React.ReactNode;[key: string]: unknown }) => <div {...props}>{children}</div>,
  },
  useMotionValue: () => ({ set: vi.fn() }),
  useSpring: () => ({ set: vi.fn() }),
  useTransform: () => 0,
  useMotionTemplate: (..._args: unknown[]) => "",
}));

// Mock Header component
vi.mock("@/components/layout/header", () => ({
  Header: ({ children }: { children?: React.ReactNode }) => <header>{children}</header>,
}));

// Mock sub-tabs
vi.mock("@/components/layout/star-sub-tabs", () => ({
  ExploreSubTabs: () => null,
  WorkspaceSubTabs: () => null,
}));

// Mock Sheet components
vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SheetTrigger: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

const { StarTopNav } = await import("@/components/layout/star-top-nav");

describe("StarTopNav", () => {
  afterEach(() => {
    cleanup();
    mockPathname = "/stars/dashboard";
  });

  it("renders all main navigation tabs", () => {
    render(<StarTopNav />);
    expect(screen.getAllByText("작업실").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("의뢰").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("프로필").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("수익").length).toBeGreaterThanOrEqual(1);
  });

  it("renders correct nav links", () => {
    render(<StarTopNav />);
    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/stars/dashboard");
    expect(hrefs).toContain("/stars/project-board");
    expect(hrefs).toContain("/stars/portfolio");
    expect(hrefs).toContain("/stars/earnings");
  });

  it("renders menu items in sheet", () => {
    render(<StarTopNav />);
    expect(screen.getByText("앱 설치 · 설정")).toBeInTheDocument();
    expect(screen.getByText("메인으로 돌아가기")).toBeInTheDocument();
  });

  it("renders logout button", () => {
    render(<StarTopNav />);
    expect(screen.getByText("로그아웃")).toBeInTheDocument();
  });

  it("renders mobile bottom nav with '전체' menu tab", () => {
    render(<StarTopNav />);
    expect(screen.getByText("전체")).toBeInTheDocument();
  });

  it("renders correct links for menu items", () => {
    render(<StarTopNav />);
    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/stars/install");
    expect(hrefs).toContain("/");
  });

  it("includes links to key star pages", () => {
    render(<StarTopNav />);
    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/stars/dashboard");
    expect(hrefs).toContain("/stars/project-board");
  });
});
