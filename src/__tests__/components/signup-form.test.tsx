import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// Mock Next.js modules
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    <a href={href} {...props}>{children}</a>,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    auth: {
      signUp: vi.fn().mockResolvedValue({ error: null }),
    },
  })),
}));

const { SignupForm } = await import("@/components/auth/signup-form");

describe("SignupForm", () => {
  afterEach(cleanup);

  it("renders signup heading", () => {
    render(<SignupForm />);
    expect(screen.getByRole("heading", { name: "회원가입" })).toBeInTheDocument();
  });

  it("renders description text", () => {
    render(<SignupForm />);
    expect(screen.getByText("새 계정을 만들어 시작하세요.")).toBeInTheDocument();
  });

  it("renders all required form fields", () => {
    render(<SignupForm />);
    expect(screen.getByLabelText("한문이름")).toBeInTheDocument();
    expect(screen.getByLabelText("한글이름")).toBeInTheDocument();
    expect(screen.getByLabelText("이메일")).toBeInTheDocument();
    expect(screen.getByLabelText("전화번호 (선택)")).toBeInTheDocument();
    expect(screen.getByLabelText("비밀번호")).toBeInTheDocument();
    expect(screen.getByLabelText("비밀번호 확인")).toBeInTheDocument();
  });

  it("renders submit button", () => {
    render(<SignupForm />);
    const button = screen.getByRole("button", { name: "회원가입" });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it("renders login link", () => {
    render(<SignupForm />);
    const loginLink = screen.getByText("로그인");
    expect(loginLink).toBeInTheDocument();
    expect(loginLink.closest("a")).toHaveAttribute("href", "/auth/login");
  });

  it("renders correct placeholders", () => {
    render(<SignupForm />);
    expect(screen.getByPlaceholderText("홍길동")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("동서번쩍")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("name@example.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("010-1234-5678")).toBeInTheDocument();
  });

  it("renders email field with correct type", () => {
    render(<SignupForm />);
    const emailInput = screen.getByPlaceholderText("name@example.com");
    expect(emailInput).toHaveAttribute("type", "email");
  });

  it("renders password fields with correct type", () => {
    render(<SignupForm />);
    const passwordInput = screen.getByPlaceholderText("비밀번호를 입력하세요");
    const confirmInput = screen.getByPlaceholderText("비밀번호를 다시 입력하세요");
    expect(passwordInput).toHaveAttribute("type", "password");
    expect(confirmInput).toHaveAttribute("type", "password");
  });

  it("renders phone field with tel type", () => {
    render(<SignupForm />);
    const phoneInput = screen.getByPlaceholderText("010-1234-5678");
    expect(phoneInput).toHaveAttribute("type", "tel");
  });
});
