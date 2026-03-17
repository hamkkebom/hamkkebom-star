# 커뮤니티 프리뷰 섹션 UI 리디자인 설계서

**프로젝트**: 별들에게 물어봐 (hamkkebom-star)
**작성일**: 2026-03-17
**대상 컴포넌트**: `src/components/home/community-preview.tsx`
**위치**: 메인 홈페이지 (`src/app/page.tsx`) 내 섹션

---

## 1. 현행 분석 및 문제점

### 1.1 현재 구현 상태

현재 `CommunityPreview` 컴포넌트는 단순한 1차원 리스트로 구현되어 있다:

```
┌──────────────────────────────────────────────────┐
│ 👥 커뮤니티                          전체 보기 > │
├──────────────────────────────────────────────────┤
│ [자유] 게시글 제목...        💬0  ❤️0  5일 전   │
│ [Q&A] 게시글 제목...         💬0  ❤️0  5일 전   │
│ [자유] 게시글 제목...        💬0  ❤️0  5일 전   │
│ [제작팁] 게시글 제목...      💬0  ❤️0  5일 전   │
│ [자유] 게시글 제목...        💬0  ❤️0  5일 전   │
└──────────────────────────────────────────────────┘
```

### 1.2 핵심 문제점

| # | 문제 | 상세 |
|---|------|------|
| 1 | **시각적 빈약함** | 아이콘, 썸네일, 아바타 없이 텍스트만 나열. 다른 섹션(WeeklyChart, CategoryShowcase)과 비교 시 현저히 빈약 |
| 2 | **정보 밀도 부족** | BoardPost에는 author.avatarUrl, viewCount, hotScore, tags, thumbnailUrl, isFeatured 등 풍부한 필드가 있으나 3가지(제목, 댓글, 좋아요)만 활용 |
| 3 | **게시판 유형 차별화 없음** | 6종 게시판(FREE, QNA, TIPS, SHOWCASE, RECRUITMENT, NOTICE)을 모두 동일한 1줄 리스트로 표시 |
| 4 | **공간 활용 미흡** | max-w-7xl 전체 폭 대비 콘텐츠가 매우 얇음. 높이도 약 200px로 다른 섹션의 1/3 수준 |
| 5 | **인터랙션 부재** | hover 시 배경색 변경 외 마이크로 인터랙션 없음 |
| 6 | **커뮤니티 활성화 유도 부족** | "글쓰기" CTA가 빈 상태에서만 노출. 활발한 토론을 유도하는 시각적 장치 없음 |
| 7 | **모바일 미최적화** | 데스크탑/모바일 동일 레이아웃. 모바일에서 터치 타겟이 작음 |

### 1.3 다른 홈 섹션과의 일관성 분석

| 섹션 | 시각 요소 | 높이 | 인터랙션 |
|------|-----------|------|----------|
| HeroBanner | 풀스크린 썸네일, 그래디언트 오버레이, 스와이프 | ~500px | 자동 슬라이드, 클릭 |
| PopularStars | 아바타 아이콘, 랭킹 뱃지, 수평 스크롤 | ~200px | 수평 스크롤, 호버 |
| WeeklyChart | TOP3 카드, 썸네일, 랭킹 뱃지, 나머지 리스트 | ~600px | 호버 스케일, 클릭 |
| CategoryShowcase | 그래디언트 카드, 아이콘, 카운트 뱃지 | ~250px | 호버 떠오름, 회전 |
| **CommunityPreview** | **텍스트만, 뱃지 1개** | **~200px** | **hover 배경색만** |
| FaqPreview | 아코디언, 아이콘 | ~300px | 아코디언 토글 |

**결론**: 커뮤니티 섹션만 유독 시각적 밀도와 인터랙션이 부족하여 홈페이지 전체 품질을 저하시킴.

---

## 2. 레퍼런스 분석

### 2.1 한국 플랫폼 레퍼런스

#### Velog 홈피드
- **패턴**: 카드 그리드 (3열 데스크탑, 1열 모바일)
- **정보**: 썸네일 이미지 + 제목 + 본문 미리보기(2줄) + 작성자 아바타/이름 + 좋아요/댓글 수
- **특징**: 트렌딩 태그 필터, 카드 hover시 약간 떠오르는 효과
- **적용점**: 카드 기반 레이아웃, 본문 미리보기 텍스트

#### Naver Cafe 메인
- **패턴**: 탭 + 리스트 하이브리드
- **정보**: 카테고리 탭 + 게시글 리스트 (아이콘 + 제목 + 댓글수 + 시간)
- **특징**: 인기글/최신글 탭 전환, HOT 뱃지, 실시간 알림 표시
- **적용점**: 인기/최신 탭 전환, HOT 뱃지 표시

#### 브런치 커뮤니티
- **패턴**: 매거진 스타일 카드
- **정보**: 대형 커버이미지 + 제목 + 서브타이틀 + 작가 정보
- **특징**: 깔끔한 타이포그래피 중심, 여백 활용
- **적용점**: 주요 게시글 1~2개를 대형으로 표시

### 2.2 글로벌 플랫폼 레퍼런스

#### Reddit 홈피드 위젯
- **패턴**: 컴팩트 리스트 + 투표 시스템
- **정보**: 투표수(좌측) + 서브레딧 라벨 + 제목 + 댓글수 + 시간
- **특징**: 카테고리(서브레딧) 컬러 도트, 핫/라이징 소팅
- **적용점**: 좌측 engagement 인디케이터, 카테고리별 색상 구분

#### Product Hunt 오늘의 제품
- **패턴**: 랭킹 리스트 + 투표 버튼
- **정보**: 순위 + 아이콘 + 제목 + 설명 1줄 + 태그 + upvote 버튼
- **특징**: 우측 upvote 버튼이 시각적 focal point, 카테고리 태그 칩
- **적용점**: upvote/engagement 수를 시각적으로 강조하는 방식

#### Dribbble 커뮤니티 샷
- **패턴**: 마소닉 그리드 (2~4열)
- **정보**: 이미지 중심 + 좋아요/조회수 오버레이 + 작가 아바타
- **특징**: hover 시 정보 오버레이 표시, 깔끔한 카드 테두리
- **적용점**: SHOWCASE 타입 게시글에 이미지 중심 카드 적용

#### Discord 서버 위젯
- **패턴**: 실시간 활동 리스트
- **정보**: 채널명 + 최근 메시지 + 활동 인원수 + 온라인 표시
- **특징**: 실시간 느낌의 펄스 애니메이션, 그린 온라인 도트
- **적용점**: "방금 활동" 실시간 느낌의 시간 표시

#### Steam 커뮤니티 허브
- **패턴**: 좌우 분할 (인기글 + 최신글)
- **정보**: 큰 이미지 + 제목 + 카테고리 + 댓글수 + 좋아요
- **특징**: 좌측 대형 피처드, 우측 컴팩트 리스트
- **적용점**: Featured 게시글 하이라이트 영역

### 2.3 SaaS 플랫폼 레퍼런스

#### Linear 체인지로그
- **패턴**: 타임라인 + 카드
- **정보**: 날짜 마커 + 제목 + 설명 + 태그
- **특징**: 클린한 타이포그래피, 미니멀 카드, 좌측 타임라인 도트
- **적용점**: 깔끔한 타이포그래피와 여백 활용

#### Figma 커뮤니티
- **패턴**: 카드 그리드 (유형별 필터)
- **정보**: 미리보기 이미지 + 제목 + 제작자 + 좋아요/포크 수
- **특징**: 카테고리 필터 탭, 카드 호버 시 약간의 그림자
- **적용점**: 게시판 유형별 탭 필터

---

## 3. 디자인 콘셉트

### 3.1 디자인 방향성

**"생동감 있는 커뮤니티 허브"** — 단순 게시글 리스트에서 커뮤니티의 활기를 보여주는 시각적 허브로 전환

**핵심 원칙**:
1. **다층 정보 계층** — 피처드 → 인기 → 최신의 3단계 시각 계층
2. **유형별 차별화** — 6종 게시판 각각의 성격을 시각적으로 구분
3. **참여 유도** — engagement 지표의 시각적 강조, 글쓰기 CTA 상시 노출
4. **홈 일관성** — WeeklyChart, CategoryShowcase와 동일한 시각적 밀도
5. **반응형 우선** — 모바일/데스크탑 각각 최적화된 별도 레이아웃

### 3.2 컬러 시스템

프로젝트 globals.css의 oklch 체계를 따르되, 커뮤니티 섹션 고유의 액센트를 정의:

| 게시판 유형 | 아이콘 | 액센트 색상 | 용도 |
|------------|--------|-------------|------|
| FREE | MessageSquare | violet-500 (프로젝트 기본) | 자유 게시판 기본색 |
| QNA | HelpCircle | orange-500 | Q&A 질문 강조 |
| TIPS | Lightbulb | yellow-500 (amber) | 팁/노하우 표시 |
| SHOWCASE | Camera | blue-500 (cyan) | 작품 전시 |
| RECRUITMENT | Users | emerald-500 | 협업 모집 |
| NOTICE | Megaphone | red-500 | 공지사항 강조 |

### 3.3 타이포그래피

| 요소 | 스타일 | 비고 |
|------|--------|------|
| 섹션 타이틀 | text-2xl font-bold | "크리에이터 라운지" 또는 기존 "커뮤니티" |
| 섹션 서브타이틀 | text-sm text-muted-foreground | "영상 제작자들의 이야기" |
| 피처드 포스트 제목 | text-lg font-bold line-clamp-2 | 대형 카드 |
| 일반 포스트 제목 | text-sm font-bold line-clamp-1 | 컴팩트 아이템 |
| 메타 정보 | text-xs text-muted-foreground | 시간, 조회수 등 |
| 게시판 라벨 | text-[11px] font-bold | 컬러 뱃지 내 |

---

## 4. 레이아웃 설계

### 4.1 데스크탑 레이아웃 (≥768px)

**2열 분할 + 탭 필터** 구조:

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  💬 크리에이터 라운지                                               │
│  영상 제작자들의 이야기를 나눠보세요           [글쓰기]  [전체보기 >] │
│                                                                     │
│  ┌─ 탭 필터 ────────────────────────────────────────────────────┐   │
│  │ [전체]  [🔥인기]  [Q&A]  [제작 팁]  [작품 자랑]  [협업 모집]  │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─── 피처드/인기 (좌 60%) ───┐  ┌─── 최신 리스트 (우 40%) ────┐   │
│  │                             │  │                              │   │
│  │  ┌───────────────────────┐  │  │  ┌────────────────────────┐  │   │
│  │  │  🔥 HOT              │  │  │  │ [자유] 게시글 제목      │  │   │
│  │  │                       │  │  │  │ 👤 작성자  · 2시간 전   │  │   │
│  │  │  게시글 제목 (2줄)     │  │  │  │ 💬3  ❤️12  👁️234      │  │   │
│  │  │  본문 미리보기 (2줄)   │  │  │  ├────────────────────────┤  │   │
│  │  │                       │  │  │  │ [Q&A] 게시글 제목       │  │   │
│  │  │  👤아바타 작성자 · 3h  │  │  │  │ 👤 작성자  · 5시간 전   │  │   │
│  │  │  💬15  ❤️42  👁️1.2k  │  │  │  │ 💬8  ❤️5  👁️156       │  │   │
│  │  └───────────────────────┘  │  │  ├────────────────────────┤  │   │
│  │                             │  │  │ [팁] 게시글 제목        │  │   │
│  │  ┌──────────┐ ┌──────────┐  │  │  │ 👤 작성자  · 1일 전    │  │   │
│  │  │ 인기글2  │ │ 인기글3  │  │  │  │ 💬2  ❤️8  👁️89        │  │   │
│  │  │ 제목     │ │ 제목     │  │  │  ├────────────────────────┤  │   │
│  │  │ 작성자   │ │ 작성자   │  │  │  │ [모집] 게시글 제목      │  │   │
│  │  │ 💬 ❤️   │ │ 💬 ❤️   │  │  │  │ 👤 작성자  · 2일 전     │  │   │
│  │  └──────────┘ └──────────┘  │  │  │ 💬1  ❤️3  👁️67        │  │   │
│  └─────────────────────────────┘  │  └────────────────────────┘  │   │
│                                    └──────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 모바일 레이아웃 (<768px)

**수직 스택 + 수평 스크롤 카드**:

```
┌─────────────────────────────┐
│ 💬 크리에이터 라운지         │
│ 영상 제작자들의 이야기       │
│                     [전체 >] │
│                              │
│ [전체] [🔥인기] [Q&A] [팁] →│
│                              │
│ ┌──────────────────────────┐ │
│ │ 🔥 HOT                   │ │
│ │                           │ │
│ │ 게시글 제목 (2줄)         │ │
│ │ 본문 미리보기 2줄...      │ │
│ │                           │ │
│ │ 👤 작성자 · 3h            │ │
│ │ 💬15  ❤️42  👁️1.2k      │ │
│ └──────────────────────────┘ │
│                              │
│ ┌────────────────────────┐   │
│ │ [자유] 게시글 제목...   │   │
│ │ 작성자  💬3 ❤️12  2h   │   │
│ ├────────────────────────┤   │
│ │ [Q&A] 게시글 제목...    │   │
│ │ 작성자  💬8 ❤️5   5h   │   │
│ ├────────────────────────┤   │
│ │ [팁] 게시글 제목...     │   │
│ │ 작성자  💬2 ❤️8   1d   │   │
│ └────────────────────────┘   │
│                              │
│    [✏️ 글쓰기]              │
└─────────────────────────────┘
```

### 4.3 빈 상태 (Empty State)

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  💬 크리에이터 라운지                                │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │              ┌──────────┐                    │    │
│  │              │  💬 ✨   │                    │    │
│  │              └──────────┘                    │    │
│  │                                              │    │
│  │    커뮤니티의 첫 이야기를 시작해보세요!        │    │
│  │                                              │    │
│  │    영상 제작 팁, Q&A, 협업 모집 등            │    │
│  │    크리에이터들과 소통하는 공간입니다          │    │
│  │                                              │    │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐       │    │
│  │  │ 자유 │ │ Q&A  │ │ 팁   │ │ 모집 │       │    │
│  │  └──────┘ └──────┘ └──────┘ └──────┘       │    │
│  │                                              │    │
│  │          [✏️ 첫 글 작성하기]                  │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 5. 컴포넌트 구조 설계

### 5.1 컴포넌트 계층

```
CommunityPreview (메인 래퍼)
├── SectionHeader
│   ├── 아이콘 + 타이틀 + 서브타이틀
│   ├── WriteButton (데스크탑 CTA)
│   └── ViewAllLink
│
├── CategoryTabs (게시판 필터)
│   ├── TabItem × 6 (전체, 인기, QNA, TIPS, SHOWCASE, RECRUITMENT)
│   └── 수평 스크롤 (모바일)
│
├── ContentArea
│   ├── FeaturedSection (데스크탑: 좌 60%)
│   │   ├── FeaturedCard (인기글 1위 - 대형)
│   │   └── SubFeaturedCards (인기글 2-3위 - 2열 소형)
│   │
│   └── LatestList (데스크탑: 우 40%)
│       └── CompactPostItem × 4
│           ├── BoardTypeBadge (색상 코딩)
│           ├── Title (1줄)
│           ├── AuthorInfo (아바타 + 이름)
│           └── EngagementMeta (댓글/좋아요/조회수/시간)
│
└── EmptyState (게시글 없을 때)
    ├── 일러스트레이션
    ├── 안내 텍스트
    ├── 카테고리 칩 소개
    └── WriteButton
```

### 5.2 데이터 fetching 전략

**현재**: `pageSize=5&sort=latest` 단일 쿼리
**변경**: `pageSize=8&sort=popular` + 탭 변경 시 `boardType` 파라미터 추가

```typescript
// 인기글 (피처드 영역) + 최신글 (리스트 영역) 분리 전략
// Option A: 단일 쿼리로 8개 가져와서 클라이언트에서 분할
//   - 인기순으로 8개 fetch
//   - 1위 = FeaturedCard, 2-3위 = SubFeaturedCards, 4-8위 = LatestList
//   → 장점: API 변경 없음, 1회 호출
//   → 단점: 인기글과 최신글이 겹칠 수 있음

// Option B: 2개 쿼리 (인기 3 + 최신 5)
//   → 장점: 역할 분리 명확
//   → 단점: API 2회 호출

// → Option A 선택 (단순성 우선, 기존 API 활용)
```

### 5.3 타입 정의

```typescript
type CommunityPost = {
  id: string;
  boardType: string;
  title: string;
  content: string;          // 본문 미리보기용
  viewCount: number;
  likeCount: number;
  commentCount: number;
  hotScore: number;
  tags: string[];
  thumbnailUrl: string | null;
  isFeatured: boolean;
  isPinned: boolean;
  isNotice: boolean;
  createdAt: string;
  author: {
    name: string;
    chineseName: string | null;
    avatarUrl: string | null;
    role: string;
  };
  _count: { comments: number; likes: number };
};
```

**변경 사항**: 기존 PostPreview 타입에서 `content`, `viewCount`, `tags`, `thumbnailUrl`, `isFeatured`, `isPinned`, `isNotice`, `hotScore`, `author.avatarUrl`, `author.role`, `commentCount` 필드 추가 활용.

API 응답에 이미 이 필드들이 포함되어 있으므로 **API 변경 불필요** — 타입 정의만 확장.

---

## 6. 인터랙션 설계

### 6.1 마이크로 인터랙션

| 요소 | 트리거 | 애니메이션 | 시간 |
|------|--------|------------|------|
| FeaturedCard | hover | translateY(-4px) + shadow 강화 | 200ms ease |
| SubFeaturedCard | hover | translateY(-2px) + border-color 변경 | 200ms ease |
| CompactPostItem | hover | 배경색 accent + 좌측 보더 표시 | 150ms ease |
| CategoryTab | click | 하단 인디케이터 슬라이드 | 200ms spring |
| EngagementBadge | 존재 | 초기 로드 시 숫자 카운트업 | 300ms |
| 전체 섹션 | 뷰포트 진입 | staggered fadeIn+slideUp | 50ms delay each |
| WriteButton | hover | scale(1.02) + glow effect | 200ms |
| HOT 뱃지 | 항상 | 은은한 pulse 애니메이션 | 2s infinite |

### 6.2 Framer Motion 전략

```typescript
// 섹션 진입 애니메이션
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
};

// 탭 전환 시 콘텐츠 애니메이션
// AnimatePresence + layoutId 활용
```

### 6.3 탭 필터 동작

| 탭 | 쿼리 파라미터 | 정렬 |
|----|--------------|------|
| 전체 | (없음) | latest |
| 🔥 인기 | sort=popular | popular (likeCount desc) |
| Q&A | boardType=QNA | latest |
| 제작 팁 | boardType=TIPS | latest |
| 작품 자랑 | boardType=SHOWCASE | latest |
| 협업 모집 | boardType=RECRUITMENT | latest |

탭 전환 시 `queryKey`에 탭 상태 포함하여 TanStack Query가 자동 캐싱/리페치.

---

## 7. 반응형 설계

### 7.1 브레이크포인트 전략

| 브레이크포인트 | 레이아웃 | 콘텐츠 |
|--------------|---------|--------|
| < 640px (모바일) | 단일 열 스택 | Featured 1개 + 리스트 3개 |
| 640-767px (태블릿) | 단일 열 스택 | Featured 1개 + 리스트 4개 |
| ≥ 768px (데스크탑) | 2열 분할 (7:5) | Featured 3개 + 리스트 4개 |

### 7.2 터치 최적화

- 모바일 탭 아이템: min-height 44px (Apple HIG 기준)
- 리스트 아이템: py-4 (터치 영역 확보)
- 수평 스크롤 탭: `snap-x snap-mandatory` + `scrollbar-hide`
- 카드: `active:scale-[0.98]` 탭 피드백

### 7.3 성능 고려사항

- 아바타 이미지: width/height 지정, lazy loading
- 썸네일: aspect-ratio 예약으로 CLS 방지
- 탭 전환: staleTime 2분 (기존 유지) — 빈번한 탭 전환 시 캐시 활용
- motion.div: `will-change: transform` 자동 적용 (Framer Motion 기본)

---

## 8. 상세 컴포넌트 스펙

### 8.1 FeaturedCard (인기글 1위 대형 카드)

```
┌────────────────────────────────────────────┐
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │  [🔥 HOT · 자유]          💬15 ❤️42 │  │
│  │                                      │  │
│  │  게시글 제목이 여기에 표시됩니다      │  │
│  │  최대 2줄까지 표시                    │  │
│  │                                      │  │
│  │  본문 미리보기 텍스트가 여기에        │  │
│  │  2줄까지 표시됩니다...               │  │
│  │                                      │  │
│  │  ┌──┐                                │  │
│  │  │👤│ 작성자이름 · 3시간 전          │  │
│  │  └──┘        👁️ 1,234               │  │
│  └──────────────────────────────────────┘  │
│                                            │
└────────────────────────────────────────────┘
```

**스타일 스펙**:
- 컨테이너: `rounded-2xl border border-border bg-card p-5 hover:shadow-lg transition-all`
- 뱃지 영역: 상단 좌측에 HOT 뱃지 (pulse 애니메이션) + 게시판 유형 뱃지
- 제목: `text-lg font-bold text-foreground line-clamp-2`
- 본문 미리보기: `text-sm text-muted-foreground line-clamp-2 mt-2`
- 작성자: 아바타(w-7 h-7 rounded-full) + 이름 + 시간
- engagement: 우상단에 댓글/좋아요, 하단에 조회수
- 호버: `hover:-translate-y-1 hover:shadow-xl hover:border-primary/30`

### 8.2 SubFeaturedCard (인기글 2-3위 소형 카드)

```
┌──────────────────────┐
│ [Q&A]        💬8 ❤️5 │
│                      │
│ 게시글 제목 (1줄)     │
│ 본문 미리보기 1줄...  │
│                      │
│ 👤 작성자 · 5h       │
└──────────────────────┘
```

**스타일 스펙**:
- 컨테이너: `rounded-xl border border-border bg-card p-4 hover:bg-accent/50 transition-all`
- 2열 그리드: `grid grid-cols-2 gap-3`
- 제목: `text-sm font-bold line-clamp-1`
- 본문 미리보기: `text-xs text-muted-foreground line-clamp-1`
- 호버: `hover:-translate-y-0.5 hover:border-primary/20`

### 8.3 CompactPostItem (최신글 리스트 아이템)

```
┌────────────────────────────────────┐
│ │ [자유]  게시글 제목이 여기에...   │
│ │ 👤 작성자 · 2시간 전             │
│ │         💬3  ❤️12  👁️234        │
└────────────────────────────────────┘
```

**스타일 스펙**:
- 컨테이너: `px-4 py-3.5 hover:bg-accent/30 transition-colors border-b border-border last:border-0`
- 좌측 보더: hover 시 `border-l-2 border-l-primary` 표시 (게시판 유형 색상)
- 게시판 뱃지: `text-[10px] font-bold px-2 py-0.5 rounded-md` (유형별 bg 색상)
- 제목: `text-sm font-bold text-foreground line-clamp-1`
- 작성자: `text-xs text-muted-foreground` 아바타(w-5 h-5) + 이름 + 시간
- engagement: `text-[11px] text-muted-foreground` 아이콘 + 숫자

### 8.4 CategoryTab

**스타일 스펙**:
- 컨테이너: `flex gap-1 p-1 bg-muted/50 rounded-xl overflow-x-auto scrollbar-hide`
- 탭 아이템: `px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all`
- 활성: `bg-background text-foreground shadow-sm`
- 비활성: `text-muted-foreground hover:text-foreground`
- 모바일: `snap-x snap-mandatory`

---

## 9. 접근성 설계

### 9.1 ARIA 마크업

```tsx
<section aria-labelledby="community-heading">
  <h2 id="community-heading">크리에이터 라운지</h2>

  <div role="tablist" aria-label="게시판 카테고리">
    <button role="tab" aria-selected={isActive} aria-controls="community-panel">
      {label}
    </button>
  </div>

  <div role="tabpanel" id="community-panel" aria-labelledby="active-tab-id">
    {/* 콘텐츠 */}
  </div>
</section>
```

### 9.2 키보드 내비게이션

- Tab 키: 섹션 → 탭 → 피처드 카드 → 리스트 아이템 → 글쓰기 버튼
- 화살표 키: 탭 간 이동 (좌/우)
- Enter/Space: 탭 선택, 카드 클릭

### 9.3 스크린 리더

- 게시판 유형 뱃지: aria-label="게시판: 자유"
- engagement 지표: aria-label="댓글 15개, 좋아요 42개, 조회 1,234회"
- HOT 뱃지: aria-label="인기 게시글"

---

## 10. 구현 계획

### 10.1 변경 파일 목록

| 파일 | 변경 유형 | 설명 |
|------|-----------|------|
| `src/components/home/community-preview.tsx` | **완전 재작성** | 기존 115줄 → 약 350-400줄 |

**API 변경 없음** — 기존 `/api/board/posts` 엔드포인트의 응답에 이미 모든 필요 필드 포함

### 10.2 구현 상세

단일 파일 내 모든 서브 컴포넌트 인라인 정의 (기존 프로젝트 패턴 준수 — 별도 파일 분리 불필요):

1. **타입 확장**: PostPreview → CommunityPost로 확장 (content, viewCount, tags, thumbnailUrl, author.avatarUrl 등 추가)
2. **탭 상태 관리**: useState로 activeTab 관리, queryKey에 포함
3. **쿼리 분기**: 탭에 따라 boardType/sort 파라미터 동적 변경
4. **레이아웃 분할**: 데스크탑 md:grid-cols-12, 좌 col-span-7, 우 col-span-5
5. **애니메이션**: motion.div + staggerChildren + AnimatePresence (탭 전환)
6. **스켈레톤 로딩**: isLoading 시 피처드 카드 + 리스트 스켈레톤 표시
7. **빈 상태**: 게시글 없을 때 카테고리 칩 소개 + 글쓰기 CTA

### 10.3 의존성

기존 프로젝트 의존성만 사용 (추가 설치 없음):
- `framer-motion` ✅ 이미 설치됨
- `@tanstack/react-query` ✅ 이미 설치됨
- `lucide-react` ✅ 이미 설치됨
- `next/link` ✅ 내장

### 10.4 테스트 전략

- LSP 진단 (타입 에러 확인)
- 빌드 검증 (`pnpm build`)
- 기존 테스트 실행 (`pnpm test`)

---

## 부록: 마이그레이션 가이드

### Before → After 비교

| 항목 | Before | After |
|------|--------|-------|
| 시각 요소 | 텍스트 only | 카드 + 아바타 + 뱃지 + engagement 바 |
| 정보 밀도 | 제목 + 댓글/좋아요 | 제목 + 본문 미리보기 + 작성자(아바타) + 댓글/좋아요/조회수 |
| 레이아웃 | 단일 리스트 | 2열 분할 (피처드 + 최신) |
| 필터 | 없음 | 6종 탭 필터 |
| CTA | 빈 상태에서만 | 상시 글쓰기 버튼 |
| 반응형 | 동일 | 모바일/데스크탑 별도 최적화 |
| 애니메이션 | fadeIn only | staggered entry + hover lift + tab slide |
| 높이 | ~200px | ~450px (데스크탑) |
| 게시글 수 | 5개 | 8개 (피처드 3 + 최신 5, 또는 탭에 따라) |

### 리스크 및 대응

| 리스크 | 확률 | 대응 |
|--------|------|------|
| content 필드 길이 제한 없음 | 중 | line-clamp + CSS 말줄임 처리 |
| 아바타 URL null 빈도 높음 | 높 | 이니셜 fallback (기존 패턴) |
| 게시글 0개 빈 상태 | 높 | 매력적인 empty state 디자인 |
| 모바일 탭 overflow | 중 | 수평 스크롤 + scrollbar-hide |
| 탭 전환 시 깜빡임 | 낮 | staleTime + placeholder data |
