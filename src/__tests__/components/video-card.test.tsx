import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// We need to mock Next.js modules before importing components
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    <a href={href} {...props}>{children}</a>,
}));

vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string }) =>
    <img src={src} alt={alt} {...props} />,
}));

// Import component after mocks
const { VideoCard } = await import("@/components/video/video-card");

describe("VideoCard", () => {
  afterEach(cleanup);

  const defaultProps = {
    id: "test-video-1",
    title: "테스트 영상",
    thumbnailUrl: null as string | null,
    streamUid: "abc123uid" as string | null,
    duration: 125 as number | null,
    ownerName: "홍길동",
    categoryName: "콕콕상담" as string | null,
    createdAt: "2026-01-15T00:00:00Z",
  };

  it("renders video title", () => {
    render(<VideoCard {...defaultProps} />);
    expect(screen.getByText("테스트 영상")).toBeInTheDocument();
  });

  it("renders owner name", () => {
    render(<VideoCard {...defaultProps} />);
    expect(screen.getByText("홍길동")).toBeInTheDocument();
  });

  it("renders category badge", () => {
    render(<VideoCard {...defaultProps} />);
    expect(screen.getByText("콕콕상담")).toBeInTheDocument();
  });

  it("links to video detail page", () => {
    render(<VideoCard {...defaultProps} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/videos/test-video-1");
  });

  it("shows Cloudflare Stream thumbnail when streamUid is present", () => {
    render(<VideoCard {...defaultProps} />);
    const imgs = screen.getAllByRole("img");
    const thumb = imgs.find((img) => img.getAttribute("alt") === "테스트 영상");
    expect(thumb).toBeDefined();
    expect(thumb?.getAttribute("src")).toContain("videodelivery.net/abc123uid");
  });

  it("shows fallback when no thumbnail at all", () => {
    render(
      <VideoCard
        {...defaultProps}
        streamUid={null}
        thumbnailUrl={null}
      />
    );
    expect(screen.getByText("🎬")).toBeInTheDocument();
  });

  it("formats duration correctly", () => {
    render(<VideoCard {...defaultProps} duration={125} />);
    expect(screen.getByText("2:05")).toBeInTheDocument();
  });

  it("renders compact mode with smaller width", () => {
    const { container } = render(<VideoCard {...defaultProps} compact />);
    const link = container.querySelector("a");
    expect(link?.className).toContain("shrink-0");
  });

  it("hides date in compact mode", () => {
    render(<VideoCard {...defaultProps} compact />);
    // In compact mode, date should not be rendered
    const dateText = screen.queryByText(/2026/);
    expect(dateText).toBeNull();
  });
});

describe("VideoCard - thumbnail logic", () => {
  it("prefers streamUid over thumbnailUrl", () => {
    render(
      <VideoCard
        id="vid1"
        title="Test"
        thumbnailUrl="https://old.example.com/thumb.jpg"
        streamUid="stream123"
        duration={null}
        ownerName="User"
        categoryName={null}
        createdAt="2026-01-01T00:00:00Z"
      />
    );
    const imgs = screen.getAllByRole("img");
    const mainImg = imgs.find((img) => img.getAttribute("alt") === "Test");
    expect(mainImg?.getAttribute("src")).toContain("videodelivery.net/stream123");
    expect(mainImg?.getAttribute("src")).not.toContain("old.example.com");
  });
});
