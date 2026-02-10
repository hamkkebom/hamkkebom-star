import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

const { FeedbackForm } = await import("@/components/feedback/feedback-form");

describe("FeedbackForm", () => {
  afterEach(cleanup);

  it("renders feedback textarea", () => {
    render(<FeedbackForm submissionId="sub-001" />);
    expect(screen.getByPlaceholderText("피드백 내용을 입력하세요...")).toBeInTheDocument();
  });

  it("renders submit button", () => {
    render(<FeedbackForm submissionId="sub-001" />);
    expect(screen.getByRole("button", { name: "피드백 등록" })).toBeInTheDocument();
  });

  it("renders timecode capture button", () => {
    render(<FeedbackForm submissionId="sub-001" />);
    expect(screen.getByRole("button", { name: "현재 시점 캡처" })).toBeInTheDocument();
  });

  it("disables capture button when no currentTime", () => {
    render(<FeedbackForm submissionId="sub-001" />);
    const captureBtn = screen.getByRole("button", { name: "현재 시점 캡처" });
    expect(captureBtn).toBeDisabled();
  });

  it("enables capture button when currentTime is provided", () => {
    render(<FeedbackForm submissionId="sub-001" currentTime={30} />);
    const captureBtn = screen.getByRole("button", { name: "현재 시점 캡처" });
    expect(captureBtn).not.toBeDisabled();
  });

  it("renders feedback type select label", () => {
    render(<FeedbackForm submissionId="sub-001" />);
    expect(screen.getByText("피드백 유형")).toBeInTheDocument();
  });

  it("renders priority select label", () => {
    render(<FeedbackForm submissionId="sub-001" />);
    expect(screen.getByText("우선순위")).toBeInTheDocument();
  });

  it("disables submit when textarea is empty", () => {
    render(<FeedbackForm submissionId="sub-001" />);
    const submitBtn = screen.getByRole("button", { name: "피드백 등록" });
    expect(submitBtn).toBeDisabled();
  });

  it("enables submit when textarea has content", async () => {
    const user = userEvent.setup();
    render(<FeedbackForm submissionId="sub-001" />);
    const textarea = screen.getByPlaceholderText("피드백 내용을 입력하세요...");
    await user.type(textarea, "자막 수정 필요");
    const submitBtn = screen.getByRole("button", { name: "피드백 등록" });
    expect(submitBtn).not.toBeDisabled();
  });

  it("shows timecode after capture", async () => {
    const user = userEvent.setup();
    render(<FeedbackForm submissionId="sub-001" currentTime={125} />);
    const captureBtn = screen.getByRole("button", { name: "현재 시점 캡처" });
    await user.click(captureBtn);
    // 125 seconds = 02:05
    expect(screen.getByText("⏱ 02:05")).toBeInTheDocument();
  });
});
