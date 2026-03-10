import { Metadata } from "next";
import Link from "next/link";
import { ChevronUp } from "lucide-react";

export const metadata: Metadata = {
  title: "이용약관 | 함께봄스타",
  description: "함께봄스타 서비스 이용약관입니다.",
};

const ARTICLES = [
  { id: "article-1", title: "제1조 (목적)" },
  { id: "article-2", title: "제2조 (용어의 정의)" },
  { id: "article-3", title: "제3조 (약관의 효력 및 변경)" },
  { id: "article-4", title: "제4조 (서비스의 제공 및 변경)" },
  { id: "article-5", title: "제5조 (이용계약의 체결)" },
  { id: "article-6", title: "제6조 (회원의 의무)" },
  { id: "article-7", title: "제7조 (서비스 이용의 제한)" },
  { id: "article-8", title: "제8조 (콘텐츠의 저작권 및 활용)" },
  { id: "article-9", title: "제9조 (정산 및 보수)" },
  { id: "article-10", title: "제10조 (면책조항)" },
  { id: "article-11", title: "제11조 (분쟁의 해결)" },
  { id: "article-12", title: "제12조 (기타)" },
];

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-8 md:py-12 max-w-5xl">
      <div className="mb-8 md:mb-12 text-center animate-fade-in-up">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-gradient">
          이용약관
        </h1>
        <p className="text-muted-foreground">시행일: 2026년 3월 1일</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8 relative items-start">
        {/* TOC Sidebar (Desktop) / Top (Mobile) */}
        <aside className="w-full md:w-64 shrink-0 md:sticky md:top-24 bg-card border rounded-xl p-4 shadow-sm animate-fade-in-up" style={{ animationDelay: "100ms" }}>
          <h2 className="font-semibold mb-4 text-lg">목차</h2>
          <nav className="flex flex-col gap-2 max-h-[40vh] md:max-h-[calc(100vh-12rem)] overflow-y-auto scrollbar-pretty pr-2">
            {ARTICLES.map((article) => (
              <Link
                key={article.id}
                href={`#${article.id}`}
                className="text-sm text-muted-foreground hover:text-primary transition-colors py-1"
              >
                {article.title}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0 bg-card border rounded-xl p-6 md:p-10 shadow-sm animate-fade-in-up" style={{ animationDelay: "200ms" }}>
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <section id="article-1" className="scroll-mt-24 mb-10">
              <h2 className="text-xl font-bold mb-4 text-foreground">제1조 (목적)</h2>
              <p className="text-muted-foreground leading-relaxed">
                본 약관은 함께봄스타(이하 "회사"라 합니다)가 제공하는 영상 제작 의뢰, 납품, 피드백 및 정산 플랫폼 서비스(이하 "서비스"라 합니다)의 이용과 관련하여 회사와 회원 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
              </p>
            </section>

            <section id="article-2" className="scroll-mt-24 mb-10">
              <h2 className="text-xl font-bold mb-4 text-foreground">제2조 (용어의 정의)</h2>
              <p className="text-muted-foreground leading-relaxed">
                1. "서비스"란 회사가 제공하는 영상 제작 관련 중개 및 관리 플랫폼을 의미합니다.<br />
                2. "회원"이란 본 약관에 동의하고 서비스에 가입한 자를 말하며, "STAR(영상 제작 프리랜서)"와 "ADMIN(관리자)"으로 구분됩니다.<br />
                3. "STAR"란 회사로부터 영상 제작을 의뢰받아 결과물을 납품하는 회원을 의미합니다.
              </p>
            </section>

            <section id="article-3" className="scroll-mt-24 mb-10">
              <h2 className="text-xl font-bold mb-4 text-foreground">제3조 (약관의 효력 및 변경)</h2>
              <p className="text-muted-foreground leading-relaxed">
                1. 본 약관은 서비스 화면에 게시하거나 기타의 방법으로 회원에게 공지함으로써 효력이 발생합니다.<br />
                2. 회사는 필요하다고 인정되는 경우 관련 법령을 위배하지 않는 범위 내에서 본 약관을 변경할 수 있습니다.
              </p>
            </section>

            <section id="article-4" className="scroll-mt-24 mb-10">
              <h2 className="text-xl font-bold mb-4 text-foreground">제4조 (서비스의 제공 및 변경)</h2>
              <p className="text-muted-foreground leading-relaxed">
                회사는 영상 제작 의뢰, 결과물 업로드 및 피드백, 정산 관리 등의 서비스를 제공하며, 운영상 또는 기술상의 필요에 따라 제공하고 있는 서비스의 전부 또는 일부를 변경할 수 있습니다.
              </p>
            </section>

            <section id="article-5" className="scroll-mt-24 mb-10">
              <h2 className="text-xl font-bold mb-4 text-foreground">제5조 (이용계약의 체결)</h2>
              <p className="text-muted-foreground leading-relaxed">
                이용계약은 회원이 되고자 하는 자가 약관의 내용에 대하여 동의를 한 다음 회원가입 신청을 하고 회사가 이러한 신청에 대하여 승낙함으로써 체결됩니다.
              </p>
            </section>

            <section id="article-6" className="scroll-mt-24 mb-10">
              <h2 className="text-xl font-bold mb-4 text-foreground">제6조 (회원의 의무)</h2>
              <p className="text-muted-foreground leading-relaxed">
                1. 영상 저작권: STAR는 납품하는 영상이 제3자의 저작권 등 지적재산권을 침해하지 않음을 보증해야 합니다.<br />
                2. 납품 기한: STAR는 상호 합의된 기한 내에 결과물을 납품해야 합니다.<br />
                3. 비밀 유지: 회원은 서비스 이용 과정에서 취득한 회사 및 타 회원의 영업비밀을 제3자에게 누설해서는 안 됩니다.
              </p>
            </section>

            <section id="article-7" className="scroll-mt-24 mb-10">
              <h2 className="text-xl font-bold mb-4 text-foreground">제7조 (서비스 이용의 제한)</h2>
              <p className="text-muted-foreground leading-relaxed">
                회사는 회원이 본 약관의 의무를 위반하거나 서비스의 정상적인 운영을 방해한 경우, 경고, 일시정지, 영구이용정지 등으로 서비스 이용을 단계적으로 제한할 수 있습니다.
              </p>
            </section>

            <section id="article-8" className="scroll-mt-24 mb-10">
              <h2 className="text-xl font-bold mb-4 text-foreground">제8조 (콘텐츠의 저작권 및 활용)</h2>
              <p className="text-muted-foreground leading-relaxed">
                1. 업로드 소유권: STAR가 제작하여 납품한 영상의 소유권 및 저작재산권은 대금이 완납된 시점에 회사로 이전됩니다.<br />
                2. 라이선스 및 2차 활용: 회사는 납품된 영상을 서비스 홍보 등의 목적으로 2차 가공 및 활용할 수 있습니다.
              </p>
            </section>

            <section id="article-9" className="scroll-mt-24 mb-10">
              <h2 className="text-xl font-bold mb-4 text-foreground">제9조 (정산 및 보수)</h2>
              <p className="text-muted-foreground leading-relaxed">
                1. 월별 정산: 회사는 STAR가 당월 납품 완료한 건에 대하여 익월 지정된 기일에 정산 대금을 지급합니다.<br />
                2. 지급 조건: 대금 지급은 결과물에 대한 최종 승인이 완료된 건에 한합니다.<br />
                3. 세금: 정산 대금 지급 시 관련 법령에 따른 원천징수 세액을 공제한 후 지급합니다.
              </p>
            </section>

            <section id="article-10" className="scroll-mt-24 mb-10">
              <h2 className="text-xl font-bold mb-4 text-foreground">제10조 (면책조항)</h2>
              <p className="text-muted-foreground leading-relaxed">
                회사는 천재지변, 불가항력, 회원의 귀책사유로 인한 서비스 이용의 장애에 대하여 책임을 지지 않습니다.
              </p>
            </section>

            <section id="article-11" className="scroll-mt-24 mb-10">
              <h2 className="text-xl font-bold mb-4 text-foreground">제11조 (분쟁의 해결)</h2>
              <p className="text-muted-foreground leading-relaxed">
                서비스 이용과 관련하여 회사와 회원 간에 발생한 분쟁에 대하여는 상호 원만하게 합의하여 해결하며, 합의가 이루어지지 않을 경우 관할 법원은 회사의 본점 소재지를 관할하는 법원으로 합니다.
              </p>
            </section>

            <section id="article-12" className="scroll-mt-24">
              <h2 className="text-xl font-bold mb-4 text-foreground">제12조 (기타)</h2>
              <p className="text-muted-foreground leading-relaxed">
                본 약관에 명시되지 않은 사항은 관련 법령 및 상관례에 따릅니다.
              </p>
            </section>
          </div>
        </div>
      </div>

      {/* Mobile Back to Top */}
      <div className="fixed bottom-6 right-6 md:hidden z-50">
        <Link
          href="#"
          className="flex items-center justify-center w-12 h-12 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-colors active:scale-95"
          aria-label="맨 위로 가기"
        >
          <ChevronUp className="w-6 h-6" />
        </Link>
      </div>
    </div>
  );
}
