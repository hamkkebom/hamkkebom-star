import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

const { RequestForm } = await import("@/components/project/request-form");

describe("RequestForm", () => {
  afterEach(cleanup);

  const mockOnSubmit = vi.fn().mockResolvedValue(undefined);

  it("renders form with submit button label", () => {
    render(<RequestForm submitLabel="제출하기" onSubmit={mockOnSubmit} />);
    const button = screen.getByRole("button", { name: "제출하기" });
    expect(button).toBeInTheDocument();
  });

  it("renders all form labels", () => {
    render(<RequestForm submitLabel="저장" onSubmit={mockOnSubmit} />);
    expect(screen.getByLabelText("요청 제목")).toBeInTheDocument();
    expect(screen.getByLabelText("카테고리")).toBeInTheDocument();
    expect(screen.getByLabelText("마감일")).toBeInTheDocument();
    expect(screen.getByLabelText("할당 방식")).toBeInTheDocument();
    expect(screen.getByLabelText("최대 수락 인원")).toBeInTheDocument();
    expect(screen.getByLabelText("예상 예산 (원)")).toBeInTheDocument();
    expect(screen.getByLabelText("요구사항")).toBeInTheDocument();
    expect(screen.getByLabelText("레퍼런스 URL (줄바꿈으로 구분)")).toBeInTheDocument();
  });

  it("renders correct placeholders", () => {
    render(<RequestForm submitLabel="저장" onSubmit={mockOnSubmit} />);
    expect(screen.getByPlaceholderText("예: 숏폼 브랜디드 영상 제작")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("예: 숏폼, 브랜딩, 광고")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("선택 입력")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("작업에 필요한 요구사항을 입력해 주세요.")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("https://example.com/reference-1")).toBeInTheDocument();
  });

  it("renders with initial values", () => {
    render(
      <RequestForm
        submitLabel="수정하기"
        onSubmit={mockOnSubmit}
        initialValues={{
          title: "기존 제작 요청",
          categories: ["숏폼", "브랜딩"],
          deadline: "2026-03-01",
          assignmentType: "SINGLE",
          maxAssignees: 5,
          estimatedBudget: 500000,
          requirements: "요구사항 내용",
        }}
      />
    );
    const titleInput = screen.getByPlaceholderText("예: 숏폼 브랜디드 영상 제작") as HTMLInputElement;
    expect(titleInput.value).toBe("기존 제작 요청");
  });

  it("renders default maxAssignees as 3", () => {
    render(<RequestForm submitLabel="저장" onSubmit={mockOnSubmit} />);
    const maxInput = screen.getByLabelText("최대 수락 인원") as HTMLInputElement;
    expect(maxInput.value).toBe("3");
  });

  it("renders submit button not disabled by default", () => {
    render(<RequestForm submitLabel="저장" onSubmit={mockOnSubmit} />);
    const button = screen.getByRole("button", { name: "저장" });
    expect(button).not.toBeDisabled();
  });

  it("renders deadline field with date type", () => {
    render(<RequestForm submitLabel="저장" onSubmit={mockOnSubmit} />);
    const dateInput = screen.getByLabelText("마감일");
    expect(dateInput).toHaveAttribute("type", "date");
  });
});
