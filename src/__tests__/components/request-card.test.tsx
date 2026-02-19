import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// Mock Next.js modules
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    <a href={href} {...props}>{children}</a>,
}));

const { RequestCard } = await import("@/components/project/request-card");
import type { RequestCardItem } from "@/components/project/request-card";

describe("RequestCard", () => {
  afterEach(cleanup);

  const defaultRequest: RequestCardItem = {
    id: "req-001",
    title: "숏폼 브랜디드 영상 제작",
    categories: ["숏폼", "브랜딩"],
    deadline: "2026-03-15T00:00:00Z",
    estimatedBudget: 500000,
    maxAssignees: 5,
    currentAssignees: 2,
    status: "OPEN",
  };

  it("renders request title", () => {
    render(<RequestCard request={defaultRequest} />);
    expect(screen.getByText("숏폼 브랜디드 영상 제작")).toBeInTheDocument();
  });

  it("links to request detail page", () => {
    render(<RequestCard request={defaultRequest} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/stars/request-detail/req-001");
  });

  it("renders status badge for OPEN", () => {
    render(<RequestCard request={defaultRequest} />);
    expect(screen.getByText("모집중")).toBeInTheDocument();
  });

  it("renders status badge for FULL", () => {
    render(<RequestCard request={{ ...defaultRequest, status: "FULL" }} />);
    expect(screen.getByText("정원마감")).toBeInTheDocument();
  });

  it("renders status badge for CLOSED", () => {
    render(<RequestCard request={{ ...defaultRequest, status: "CLOSED" }} />);
    expect(screen.getByText("종료")).toBeInTheDocument();
  });

  it("renders status badge for CANCELLED", () => {
    render(<RequestCard request={{ ...defaultRequest, status: "CANCELLED" }} />);
    expect(screen.getByText("취소")).toBeInTheDocument();
  });

  it("renders category badges", () => {
    render(<RequestCard request={defaultRequest} />);
    expect(screen.getByText("숏폼")).toBeInTheDocument();
    expect(screen.getByText("브랜딩")).toBeInTheDocument();
  });

  it("renders formatted budget", () => {
    render(<RequestCard request={defaultRequest} />);
    expect(screen.getByText("예산 500,000원")).toBeInTheDocument();
  });

  it("does not render budget when budget is null", () => {
    render(<RequestCard request={{ ...defaultRequest, estimatedBudget: null }} />);
    expect(screen.queryByText(/예산/)).toBeNull();
  });

  it("renders assignee count", () => {
    render(<RequestCard request={defaultRequest} />);
    expect(screen.getByText("수락 인원 2/5")).toBeInTheDocument();
  });

  it("renders formatted deadline", () => {
    render(<RequestCard request={defaultRequest} />);
    // ko-KR format: 2026. 03. 15.
    const deadlineElement = screen.getByText(/마감일/);
    expect(deadlineElement).toBeInTheDocument();
  });
});
