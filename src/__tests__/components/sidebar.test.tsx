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
}));

const { Sidebar } = await import("@/components/layout/sidebar");

describe("Sidebar", () => {
  afterEach(() => {
    cleanup();
    mockPathname = "/stars/dashboard";
  });

  it("renders brand name", () => {
    render(<Sidebar />);
    expect(screen.getByText("함께봄 스타")).toBeInTheDocument();
  });

  it("renders brand logo character", () => {
    render(<Sidebar />);
    expect(screen.getByText("봄")).toBeInTheDocument();
  });

  it("renders all main navigation items", () => {
    render(<Sidebar />);
    expect(screen.getByText("대시보드")).toBeInTheDocument();
    expect(screen.getByText("제작요청 게시판")).toBeInTheDocument();
    expect(screen.getByText("내 영상 관리")).toBeInTheDocument();
    expect(screen.getByText("영상 업로드")).toBeInTheDocument();
    expect(screen.getByText("피드백 확인")).toBeInTheDocument();
    expect(screen.getByText("정산 내역")).toBeInTheDocument();
    expect(screen.getByText("포트폴리오")).toBeInTheDocument();
  });

  it("renders external navigation items", () => {
    render(<Sidebar />);
    expect(screen.getByText("영상 브라우저")).toBeInTheDocument();
  });

  it("renders bottom navigation items", () => {
    render(<Sidebar />);
    expect(screen.getByText("프로필")).toBeInTheDocument();
    expect(screen.getByText("설정")).toBeInTheDocument();
  });

  it("renders correct nav links", () => {
    render(<Sidebar />);
    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/stars/dashboard");
    expect(hrefs).toContain("/stars/project-board");
    expect(hrefs).toContain("/stars/my-videos");
    expect(hrefs).toContain("/stars/upload");
    expect(hrefs).toContain("/stars/feedback");
    expect(hrefs).toContain("/stars/earnings");
    expect(hrefs).toContain("/stars/portfolio");
    expect(hrefs).toContain("/videos");
    expect(hrefs).toContain("/stars/profile");
    expect(hrefs).toContain("/stars/settings");
  });

  it("applies active styles for current path", () => {
    mockPathname = "/stars/project-board";
    const { container } = render(<Sidebar />);
    const projectLink = screen.getByText("제작요청 게시판").closest("a");
    expect(projectLink?.className).toContain("bg-primary/10");
  });

  it("does not apply active styles to non-matching paths", () => {
    mockPathname = "/stars/dashboard";
    render(<Sidebar />);
    const projectLink = screen.getByText("제작요청 게시판").closest("a");
    expect(projectLink?.className).not.toContain("bg-primary/10");
  });

  it("renders aside element with correct width class", () => {
    const { container } = render(<Sidebar />);
    const aside = container.querySelector("aside");
    expect(aside).toBeDefined();
    expect(aside?.className).toContain("w-64");
  });
});
