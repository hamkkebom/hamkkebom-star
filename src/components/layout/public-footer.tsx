import Link from "next/link";
import { Sparkles } from "lucide-react";

const serviceLinks = [
  { href: "/videos", label: "영상" },
  { href: "/best", label: "베스트 영상" },
  { href: "/categories", label: "카테고리" },
  { href: "/counselors", label: "상담사" },
  { href: "/showcase", label: "미디어 쇼케이스" },
  { href: "/stars", label: "크리에이터" },
  { href: "/community", label: "커뮤니티" },
];

const supportLinks = [
  { href: "/announcements", label: "공지사항" },
  { href: "/faq", label: "FAQ" },
  { href: "/guide", label: "이용 가이드" },
  { href: "/recruit", label: "STAR 모집" },
  { href: "/updates", label: "업데이트" },
];

const legalLinks = [
  { href: "/terms", label: "이용약관" },
  { href: "/privacy", label: "개인정보처리방침" },
  { href: "/about", label: "회사소개" },
];

export function PublicFooter() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-4">
          {/* Logo */}
          <div className="flex items-start gap-3 col-span-1 border-b pb-6 md:border-none md:pb-0 border-border/10">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-violet-500 to-indigo-600 text-white shadow-md shadow-violet-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-foreground tracking-tight">별들에게 물어봐</span>
              <span className="text-xs text-muted-foreground mt-0.5">프리미엄 지식 크리에이터 네트워크</span>
            </div>
          </div>

          <div className="flex flex-col gap-8 sm:flex-row sm:justify-between md:col-span-3 pt-4 md:pt-0">
            {/* Service */}
            <nav className="flex flex-col gap-3">
              <h4 className="font-bold text-sm text-foreground mb-1">서비스</h4>
              {serviceLinks.map((link) => (
                <Link key={link.href} href={link.href} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Support */}
            <nav className="flex flex-col gap-3">
              <h4 className="font-bold text-sm text-foreground mb-1">지원</h4>
              {supportLinks.map((link) => (
                <Link key={link.href} href={link.href} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Legal */}
            <nav className="flex flex-col gap-3">
              <h4 className="font-bold text-sm text-foreground mb-1">법적 고지</h4>
              {legalLinks.map((link) => (
                <Link key={link.href} href={link.href} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 pt-6 border-t border-border/10 flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground/60 w-full text-center md:text-left">
            © {new Date().getFullYear()} 함께봄. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
