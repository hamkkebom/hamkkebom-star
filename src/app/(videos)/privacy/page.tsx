import { Metadata } from "next";
import Link from "next/link";
import { ChevronUp } from "lucide-react";

export const metadata: Metadata = {
  title: "개인정보처리방침 | 함께봄스타",
  description: "함께봄스타 서비스 개인정보처리방침입니다.",
};

const SECTIONS = [
  { id: "section-1", title: "1. 수집하는 개인정보 항목" },
  { id: "section-2", title: "2. 개인정보의 수집 및 이용 목적" },
  { id: "section-3", title: "3. 개인정보의 보유 및 이용기간" },
  { id: "section-4", title: "4. 개인정보의 제3자 제공" },
  { id: "section-5", title: "5. 개인정보의 파기절차 및 방법" },
  { id: "section-6", title: "6. 이용자 및 법정대리인의 권리와 그 행사방법" },
  { id: "section-7", title: "7. 개인정보 보호책임자" },
  { id: "section-8", title: "8. 개인정보 자동 수집 장치의 설치/운영 및 거부" },
  { id: "section-9", title: "9. 고지의 의무" },
];

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-8 md:py-12 max-w-5xl">
      <div className="mb-8 md:mb-12 text-center animate-fade-in-up">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-gradient">
          개인정보처리방침
        </h1>
        <p className="text-muted-foreground">시행일: 2026년 3월 1일</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8 relative items-start">
        {/* TOC Sidebar (Desktop) / Top (Mobile) */}
        <aside className="w-full md:w-64 shrink-0 md:sticky md:top-24 bg-card border rounded-xl p-4 shadow-sm animate-fade-in-up" style={{ animationDelay: "100ms" }}>
          <h2 className="font-semibold mb-4 text-lg">목차</h2>
          <nav className="flex flex-col gap-2 max-h-[40vh] md:max-h-[calc(100vh-12rem)] overflow-y-auto scrollbar-pretty pr-2">
            {SECTIONS.map((section) => (
              <Link
                key={section.id}
                href={`#${section.id}`}
                className="text-sm text-muted-foreground hover:text-primary transition-colors py-1"
              >
                {section.title}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0 bg-card border rounded-xl p-6 md:p-10 shadow-sm animate-fade-in-up" style={{ animationDelay: "200ms" }}>
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <section id="section-1" className="scroll-mt-24 mb-10">
              <h2 className="text-xl font-bold mb-4 text-foreground">1. 수집하는 개인정보 항목</h2>
              <p className="text-muted-foreground leading-relaxed">
                회사는 회원가입, 상담, 서비스 신청 등을 위해 아래와 같은 개인정보를 수집하고 있습니다.<br />
                - 필수항목: 이름, 이메일, 전화번호<br />
                - 선택항목: 프로필 사진<br />
                - 정산 관련: 주민등록번호, 은행명, 계좌번호<br />
                - 자동수집항목: IP 주소, 서비스 이용 기록, 접속 로그
              </p>
            </section>

            <section id="section-2" className="scroll-mt-24 mb-10">
              <h2 className="text-xl font-bold mb-4 text-foreground">2. 개인정보의 수집 및 이용 목적</h2>
              <p className="text-muted-foreground leading-relaxed">
                회사는 수집한 개인정보를 다음의 목적을 위해 활용합니다.<br />
                - 서비스 제공에 관한 계약 이행 및 서비스 제공에 따른 요금정산<br />
                - 회원 관리: 회원제 서비스 이용에 따른 본인확인, 개인 식별, 불량회원의 부정 이용 방지와 비인가 사용 방지, 가입 의사 확인, 연령확인, 불만처리 등 민원처리, 고지사항 전달<br />
                - 마케팅 및 광고에 활용: 신규 서비스(제품) 개발 및 특화, 이벤트 등 광고성 정보 전달, 인구통계학적 특성에 따른 서비스 제공 및 광고 게재, 접속 빈도 파악 또는 회원의 서비스 이용에 대한 통계
              </p>
            </section>

            <section id="section-3" className="scroll-mt-24 mb-10">
              <h2 className="text-xl font-bold mb-4 text-foreground">3. 개인정보의 보유 및 이용기간</h2>
              <p className="text-muted-foreground leading-relaxed">
                원칙적으로, 개인정보 수집 및 이용목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 단, 다음의 정보에 대해서는 아래의 이유로 명시한 기간 동안 보존합니다.<br />
                - 회원 탈퇴 시: 지체 없이 파기<br />
                - 세법에 따른 정산 관련 정보: 5년<br />
                - 통신비밀보호법에 따른 접속 로그: 3개월
              </p>
            </section>

            <section id="section-4" className="scroll-mt-24 mb-10">
              <h2 className="text-xl font-bold mb-4 text-foreground">4. 개인정보의 제3자 제공</h2>
              <p className="text-muted-foreground leading-relaxed">
                회사는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 다만, 아래의 경우에는 예외로 합니다.<br />
                - 이용자들이 사전에 동의한 경우<br />
                - 법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우<br />
                - 서비스 제공을 위한 인프라 제공업체: Supabase (데이터베이스), Cloudflare (영상 스트리밍 및 스토리지), Vercel (호스팅)
              </p>
            </section>

            <section id="section-5" className="scroll-mt-24 mb-10">
              <h2 className="text-xl font-bold mb-4 text-foreground">5. 개인정보의 파기절차 및 방법</h2>
              <p className="text-muted-foreground leading-relaxed">
                회사는 원칙적으로 개인정보 수집 및 이용목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 파기절차 및 방법은 다음과 같습니다.<br />
                - 파기절차: 회원님이 회원가입 등을 위해 입력하신 정보는 목적이 달성된 후 별도의 DB로 옮겨져(종이의 경우 별도의 서류함) 내부 방침 및 기타 관련 법령에 의한 정보보호 사유에 따라(보유 및 이용기간 참조) 일정 기간 저장된 후 파기되어집니다.<br />
                - 파기방법: 전자적 파일형태로 저장된 개인정보는 기록을 재생할 수 없는 기술적 방법을 사용하여 삭제합니다.
              </p>
            </section>

            <section id="section-6" className="scroll-mt-24 mb-10">
              <h2 className="text-xl font-bold mb-4 text-foreground">6. 이용자 및 법정대리인의 권리와 그 행사방법</h2>
              <p className="text-muted-foreground leading-relaxed">
                이용자는 언제든지 등록되어 있는 자신의 개인정보를 조회하거나 수정할 수 있으며 가입해지를 요청할 수도 있습니다. 이용자들의 개인정보 조회, 수정을 위해서는 &apos;개인정보변경&apos;(또는 &apos;회원정보수정&apos; 등)을 가입해지(동의철회)를 위해서는 &quot;회원탈퇴&quot;를 클릭하여 본인 확인 절차를 거치신 후 직접 열람, 정정 또는 탈퇴가 가능합니다.
              </p>
            </section>

            <section id="section-7" className="scroll-mt-24 mb-10">
              <h2 className="text-xl font-bold mb-4 text-foreground">7. 개인정보 보호책임자</h2>
              <p className="text-muted-foreground leading-relaxed">
                회사는 고객의 개인정보를 보호하고 개인정보와 관련한 불만을 처리하기 위하여 아래와 같이 관련 부서 및 개인정보관리책임자를 지정하고 있습니다.<br />
                - 개인정보 보호책임자: 함께봄스타 개인정보보호팀<br />
                - 이메일: privacy@hamkkebom.com
              </p>
            </section>

            <section id="section-8" className="scroll-mt-24 mb-10">
              <h2 className="text-xl font-bold mb-4 text-foreground">8. 개인정보 자동 수집 장치의 설치/운영 및 거부</h2>
              <p className="text-muted-foreground leading-relaxed">
                회사는 이용자들에게 특화된 맞춤서비스를 제공하기 위해서 이용자들의 정보를 저장하고 수시로 불러오는 &apos;쿠키(cookie)&apos;를 사용합니다. 이용자는 쿠키 설치에 대한 선택권을 가지고 있습니다. 따라서, 이용자는 웹브라우저에서 옵션을 설정함으로써 모든 쿠키를 허용하거나, 쿠키가 저장될 때마다 확인을 거치거나, 아니면 모든 쿠키의 저장을 거부할 수도 있습니다.
              </p>
            </section>

            <section id="section-9" className="scroll-mt-24">
              <h2 className="text-xl font-bold mb-4 text-foreground">9. 고지의 의무</h2>
              <p className="text-muted-foreground leading-relaxed">
                현 개인정보처리방침 내용 추가, 삭제 및 수정이 있을 시에는 개정 최소 7일전부터 홈페이지의 &apos;공지사항&apos;을 통해 고지할 것입니다.
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
