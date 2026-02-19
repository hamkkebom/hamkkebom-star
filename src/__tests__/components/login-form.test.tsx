import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// Mock Next.js modules
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    <a href={href} {...props}>{children}</a>,
}));

vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string }) =>
    <img src={src} alt={alt} {...props} />,
}));

const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    refresh: mockRefresh,
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
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
    },
  })),
}));

const { LoginForm } = await import("@/components/auth/login-form");

describe("LoginForm", () => {
  afterEach(cleanup);

  it("renders login heading", () => {
    render(<LoginForm />);
    expect(screen.getByRole("heading", { name: "로그인" })).toBeInTheDocument();
  });

  it("renders email and password fields", () => {
    render(<LoginForm />);
    expect(screen.getByLabelText("이메일")).toBeInTheDocument();
    expect(screen.getByLabelText("비밀번호")).toBeInTheDocument();
  });

  it("renders submit button", () => {
    render(<LoginForm />);
    const button = screen.getByRole("button", { name: "로그인" });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it("renders sign-up link", () => {
    render(<LoginForm />);
    const signupLink = screen.getByText("회원가입");
    expect(signupLink).toBeInTheDocument();
    expect(signupLink.closest("a")).toHaveAttribute("href", "/auth/signup");
  });

  it("renders forgot-password link", () => {
    render(<LoginForm />);
    const forgotLink = screen.getByText("비밀번호 찾기");
    expect(forgotLink).toBeInTheDocument();
    expect(forgotLink.closest("a")).toHaveAttribute("href", "/auth/forgot-password");
  });

  it("renders email input with correct type and placeholder", () => {
    render(<LoginForm />);
    const emailInput = screen.getByPlaceholderText("name@example.com");
    expect(emailInput).toHaveAttribute("type", "email");
  });

  it("renders password input with correct type", () => {
    render(<LoginForm />);
    const passwordInput = screen.getByPlaceholderText("비밀번호를 입력하세요");
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  it("renders branding text", () => {
    render(<LoginForm />);
    expect(screen.getByText("이메일과 비밀번호를 입력해 주세요.")).toBeInTheDocument();
  });

  it("renders branding title in left panel", () => {
    render(<LoginForm />);
    const titles = screen.getAllByText("별들에게 물어봐");
    expect(titles.length).toBeGreaterThanOrEqual(1);
  });
});
