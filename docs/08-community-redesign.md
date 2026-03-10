# 함께봄스타 커뮤니티 허브 리디자인 명세서

## Part 1: Executive Summary

### 리디자인 목표 및 비전
단순한 영상 시청 및 크리에이터 검색 플랫폼에서 벗어나, 영상 제작자와 시청자가 활발히 소통하는 통합 커뮤니티 허브로 진화합니다. 영상, 게시판, 크리에이터 프로필을 유기적으로 연결하여 체류 시간을 늘리고 사용자 참여를 극대화합니다. 모바일 환경에서 네이티브 앱 수준의 스와이프 제스처와 바텀 시트 UX를 제공하여 접근성을 높입니다.

### 현재 vs 리디자인 비교표

| 구분 | 현재 (Before) | 리디자인 (After) |
| :--- | :--- | :--- |
| **구조** | 영상, 크리에이터 페이지가 분리됨 | 영상, 게시판, 크리에이터가 상호 연결된 허브 |
| **모바일 UX** | 데스크톱 레이아웃의 단순 축소판 | 바텀 탭바, 스와이프 제스처, 바텀 시트 중심의 네이티브 경험 |
| **소통 채널** | 영상 댓글에 국한됨 | 자유게시판, QnA, 팁, 쇼케이스 등 다목적 커뮤니티 게시판 도입 |
| **검색** | 개별 페이지 내 단순 검색 | 영상, 게시글, 크리에이터를 한 번에 찾는 통합 검색 (Explore) |
| **네비게이션** | 상단 헤더 햄버거 메뉴 의존 | 모바일 하단 탭바 도입으로 주요 메뉴 접근성 강화 |

### 핵심 변경 사항 요약
1. **커뮤니티 게시판 신설**: `/community` 라우트를 추가하고 기존 API를 활용하여 다목적 게시판 구현.
2. **통합 검색 도입**: `/explore` 페이지를 신설하여 영상, 게시글, 크리에이터 통합 검색 제공.
3. **모바일 네비게이션 개편**: 모바일 환경에서 상단 헤더를 간소화하고 하단 탭바(Bottom Tab Bar) 도입.
4. **스와이프 제스처 적용**: 영상 넘기기, 뒤로 가기, 탭 전환 등에 Framer Motion 기반 스와이프 제스처 적용.
5. **바텀 시트 활용**: 댓글, 필터, 공유 등 부가 기능을 모바일에서 바텀 시트로 제공.

### 구현 범위
*   **In-Scope**: `(videos)` 라우트 그룹 내 모든 공개 페이지, `/` (홈), 신규 `/community`, `/explore` 페이지, 관련 공통 컴포넌트 및 모바일 UX 개선.
*   **Out-of-Scope**: `(admin)` 관리자 페이지, `(dashboard)` 스타 대시보드, 인증 플로우(`/auth`), 정산 시스템, 기존 API 엔드포인트 수정.

---

## Part 2: Information Architecture

### 새로운 사이트맵
*   **홈 (`/`)**: 큐레이션된 콘텐츠 및 커뮤니티 하이라이트
*   **영상 (`/videos`)**: 전체 영상 탐색 및 필터링
    *   영상 상세 (`/videos/[id]`)
*   **커뮤니티 (`/community`)**: 다목적 게시판
    *   게시글 상세 (`/community/[id]`)
    *   글쓰기 (`/community/write`)
*   **크리에이터 (`/stars`)**: 스타 디렉토리
    *   스타 프로필 (`/stars/profile/[id]`)
    *   포트폴리오 (`/portfolio/[userId]`)
*   **탐색 (`/explore`)**: 통합 검색
*   **더보기 (모바일 전용)**: 공지사항, FAQ, 가이드, 마이페이지 진입점

### 네비게이션 구조 변경
*   **데스크톱 (PublicHeader)**: 좌측 로고, 중앙 메인 네비게이션(홈, 영상, 커뮤니티, 크리에이터), 우측 액션(통합 검색 아이콘, 테마 토글, 로그인/마이페이지).
*   **모바일 (BottomTabBar 신설)**: 화면 하단에 고정된 탭바 제공. 탭 구성은 홈, 영상, 커뮤니티, 탐색, 더보기. 상단 헤더는 로고와 알림 아이콘만 유지하여 공간 확보.

### 라우팅 변경 목록
*   **신규 페이지**: `/community`, `/community/[id]`, `/community/write`, `/explore`
*   **수정 페이지**: `/`, `/videos`, `/videos/[id]`, `/stars`, `/stars/profile/[id]`, `/portfolio/[userId]`
*   **삭제 페이지**: 없음

### URL 구조 표
| URL 경로 | 목적 | 접근 권한 |
| :--- | :--- | :--- |
| `/` | 메인 홈 화면 | 공개 |
| `/videos` | 영상 탐색 | 공개 |
| `/videos/[id]` | 영상 상세 및 재생 | 공개 |
| `/community` | 커뮤니티 게시판 목록 | 공개 |
| `/community/[id]` | 커뮤니티 게시글 상세 | 공개 |
| `/community/write` | 커뮤니티 게시글 작성 | 인증 필요 |
| `/stars` | 크리에이터 목록 | 공개 |
| `/stars/profile/[id]` | 크리에이터 상세 프로필 | 공개 |
| `/portfolio/[userId]` | 크리에이터 포트폴리오 | 공개 |
| `/explore` | 통합 검색 | 공개 |

### 사용자 플로우 다이어그램
1. 사용자가 홈(`/`)에 접속하여 주간 인기 영상과 커뮤니티 최신 글을 확인합니다.
2. 커뮤니티 최신 글을 클릭하여 게시글 상세(`/community/[id]`)로 이동합니다.
3. 게시글에 첨부된 영상 링크를 클릭하여 영상 상세(`/videos/[id]`)로 이동합니다.
4. 영상 하단의 크리에이터 프로필을 클릭하여 스타 프로필(`/stars/profile/[id]`)을 확인합니다.
5. 하단 탭바의 탐색 아이콘을 눌러 통합 검색(`/explore`)에서 다른 관심사를 검색합니다.

---

## Part 3: Page-by-Page Detailed Specs

### 1. `/` (홈)
*   **페이지 목적**: 플랫폼의 핵심 콘텐츠(영상, 크리에이터, 커뮤니티)를 한눈에 보여주는 큐레이션 허브.
*   **URL 및 라우트 파일 경로**: `src/app/page.tsx`
*   **데이터 요구사항**:
    *   `GET /api/announcements/public` (공지사항)
    *   `GET /api/videos?sort=popular&limit=5` (히어로 배너용)
    *   `GET /api/videos?sort=popular&limit=10` (주간 차트용)
    *   `GET /api/stars?sort=popular&limit=10` (인기 스타용)
    *   `GET /api/board/posts?sort=latest&limit=5` (커뮤니티 프리뷰용)
*   **데스크톱 레이아웃**:
    *   최상단: AnnouncementBanner (슬라이딩)
    *   섹션 1: HeroBanner (풀 와이드 캐러셀, 16:9 비율)
    *   섹션 2: WeeklyChart (좌측 TOP 3 큰 카드, 우측 4-10위 리스트)
    *   섹션 3: PopularStars (가로 스크롤 캐러셀)
    *   섹션 4: CommunityPreview (2단 그리드, 좌측 최신글, 우측 인기글)
*   **모바일 레이아웃**:
    *   HeroBanner: 화면 너비에 맞춘 1:1 또는 4:5 비율 캐러셀. 스와이프 지원.
    *   WeeklyChart: 세로 스크롤 리스트로 단일화.
    *   PopularStars: 가로 스와이프 스냅 스크롤.
    *   CommunityPreview: 단일 컬럼 리스트.
*   **컴포넌트 트리**:
    *   `HomeClient`
        *   `AnnouncementBanner`
        *   `HeroBanner`
        *   `WeeklyChart`
        *   `PopularStars`
        *   `CommunityPreview`
*   **인터랙션**: HeroBanner 스와이프 시 다음 영상으로 전환. PopularStars 가로 스크롤 시 스냅 효과.
*   **상태 관리**: TanStack Query (`useQuery` 키: `['home', 'hero']`, `['home', 'weekly']` 등).
*   **애니메이션**: 스크롤 시 각 섹션 페이드 인 (`framer-motion` `whileInView`).
*   **접근성**: 캐러셀 컨트롤에 `aria-label` 제공. 키보드 방향키로 캐러셀 탐색 지원.
*   **상태별 UI**: 로딩 시 각 섹션별 Skeleton 렌더링. 에러 시 해당 섹션만 에러 메시지와 재시도 버튼 표시.

### 2. `/videos` (영상 탐색)
*   **페이지 목적**: 다양한 필터와 정렬 옵션을 통해 원하는 영상을 찾는 탐색 공간.
*   **URL 및 라우트 파일 경로**: `src/app/(videos)/videos/page.tsx`
*   **데이터 요구사항**:
    *   `GET /api/videos` (필터 및 페이지네이션 파라미터 포함)
    *   `GET /api/categories`
*   **데스크톱 레이아웃**:
    *   상단: 카테고리 칩 리스트 및 정렬 드롭다운.
    *   좌측: 상세 필터 사이드바 (크리에이터, 길이 등).
    *   우측: 4열 비디오 카드 그리드.
*   **모바일 레이아웃**:
    *   상단: 가로 스크롤 가능한 카테고리 칩.
    *   필터: '필터' 버튼 클릭 시 바텀 시트로 상세 필터 제공.
    *   본문: 2열 비디오 카드 그리드. 무한 스크롤 적용.
*   **컴포넌트 트리**:
    *   `VideosBrowser`
        *   `CategoryChips`
        *   `FilterSidebar` (데스크톱) / `FilterBottomSheet` (모바일)
        *   `VideoGrid`
            *   `VideoCard` (반복)
*   **인터랙션**: 카테고리 칩 클릭 시 즉시 필터링. 비디오 카드 호버 시 GIF 프리뷰 재생.
*   **상태 관리**: URL Search Params로 필터 상태 동기화. `useInfiniteQuery`로 무한 스크롤 데이터 관리.
*   **애니메이션**: 비디오 카드 호버 시 3D 틸트 효과. 리스트 업데이트 시 `layout` 애니메이션.
*   **접근성**: 필터 바텀 시트 열림/닫힘 상태 스크린 리더 알림.
*   **상태별 UI**: 검색 결과 없음 시 빈 상태 일러스트와 검색어 초기화 버튼 표시.

### 3. `/videos/[id]` (영상 상세)
*   **페이지 목적**: 영상 시청 및 댓글, 좋아요, 공유 등 상호작용을 수행하는 핵심 페이지.
*   **URL 및 라우트 파일 경로**: `src/app/(videos)/videos/[id]/page.tsx`
*   **데이터 요구사항**:
    *   `GET /api/videos/[id]`
    *   `GET /api/videos/[id]/comments`
    *   `POST /api/videos/[id]/view` (진입 시 호출)
*   **데스크톱 레이아웃**:
    *   좌측 (메인): Cloudflare Stream 플레이어, 영상 제목, 설명, 기술 스펙, 댓글 리스트.
    *   우측 (사이드바): 크리에이터 프로필 카드, 관련 영상 추천 리스트.
*   **모바일 레이아웃**:
    *   상단: 고정된 영상 플레이어 (스크롤 시 축소되어 상단 고정).
    *   본문: 제목, 설명, 크리에이터 정보, 댓글 리스트 순차 배치.
    *   하단: 고정된 액션 바 (좋아요, 북마크, 댓글 쓰기, 공유).
*   **컴포넌트 트리**:
    *   `VideoDetailClient`
        *   `VideoPlayer`
        *   `VideoInfo`
        *   `CreatorCard`
        *   `VideoComments`
        *   `MobileActionBar` (모바일 전용)
*   **인터랙션**: 모바일 액션 바에서 댓글 버튼 클릭 시 댓글 입력 바텀 시트 호출. 좋아요 클릭 시 하트 바운스 애니메이션.
*   **상태 관리**: `useQuery`로 영상 데이터 관리. 좋아요/북마크 상태는 Zustand 스토어와 낙관적 업데이트(Optimistic Update) 결합.
*   **애니메이션**: 좋아요 아이콘 클릭 시 스케일 업/다운. 모바일 플레이어 스크롤 시 크기 전환 애니메이션.
*   **접근성**: 비디오 플레이어 컨트롤 키보드 접근성 확보.
*   **상태별 UI**: 영상 로딩 중 플레이어 영역 Skeleton. 삭제된 영상 접근 시 404 에러 컴포넌트 표시.

### 4. `/community` (커뮤니티 게시판)
*   **페이지 목적**: 사용자들이 자유롭게 의견을 나누고 정보를 공유하는 다목적 게시판.
*   **URL 및 라우트 파일 경로**: `src/app/(videos)/community/page.tsx`
*   **데이터 요구사항**:
    *   `GET /api/board/posts` (boardType, sort, page 파라미터)
*   **데스크톱 레이아웃**:
    *   상단: 게시판 탭 (전체, 자유, QnA, 팁, 쇼케이스, 구인). 우측에 '글쓰기' 버튼.
    *   본문: 리스트 형태의 게시글 목록 (제목, 작성자, 작성일, 조회수, 좋아요 수). 공지사항은 상단 고정.
*   **모바일 레이아웃**:
    *   상단: 가로 스크롤 가능한 게시판 탭. 하단 우측에 플로팅 액션 버튼(FAB)으로 '글쓰기' 제공.
    *   본문: 카드 형태의 게시글 목록. 무한 스크롤.
*   **컴포넌트 트리**:
    *   `CommunityBoard`
        *   `BoardTabs`
        *   `PostList`
            *   `PostListItem` (반복)
        *   `WriteFAB` (모바일 전용)
*   **인터랙션**: 탭 클릭 시 부드러운 슬라이드 전환. 게시글 클릭 시 상세 페이지로 이동.
*   **상태 관리**: URL Search Params로 현재 탭 및 정렬 상태 관리. `useInfiniteQuery` 사용.
*   **애니메이션**: 리스트 아이템 렌더링 시 순차적 페이드 인 (`staggerChildren`).
*   **접근성**: 탭 메뉴에 `role="tablist"` 및 `aria-selected` 적용.
*   **상태별 UI**: 게시글 없음 시 안내 메시지. 로딩 중 리스트 Skeleton.

### 5. `/community/[id]` (게시글 상세)
*   **페이지 목적**: 게시글 본문 확인 및 댓글을 통한 소통.
*   **URL 및 라우트 파일 경로**: `src/app/(videos)/community/[id]/page.tsx`
*   **데이터 요구사항**:
    *   `GET /api/board/posts/[id]`
    *   `GET /api/board/posts/[id]/comments`
*   **데스크톱 레이아웃**:
    *   상단: 게시판 카테고리 배지, 제목, 작성자 정보, 작성일, 조회수.
    *   본문: 마크다운 렌더링된 내용. 첨부된 영상이 있을 경우 VideoCard 형태로 표시.
    *   하단: 좋아요 버튼, 공유 버튼, 댓글 리스트 및 입력 폼.
*   **모바일 레이아웃**:
    *   데스크톱과 유사하나 여백을 줄이고 텍스트 크기 최적화.
    *   하단에 고정된 댓글 입력 바 제공.
*   **컴포넌트 트리**:
    *   `PostDetailClient`
        *   `PostHeader`
        *   `PostContent`
        *   `AttachedVideo` (선택적)
        *   `PostActions`
        *   `BoardComments`
*   **인터랙션**: 첨부 영상 클릭 시 영상 상세로 이동. 댓글 작성 시 즉시 리스트 하단에 추가.
*   **상태 관리**: `useQuery`로 데이터 관리. 댓글 작성 시 `useMutation` 후 쿼리 무효화.
*   **애니메이션**: 좋아요 클릭 시 파티클 효과.
*   **접근성**: 본문 내 이미지에 `alt` 속성 강제.
*   **상태별 UI**: 존재하지 않는 글 접근 시 404 컴포넌트.

### 6. `/community/write` (글쓰기)
*   **페이지 목적**: 새로운 커뮤니티 게시글 작성.
*   **URL 및 라우트 파일 경로**: `src/app/(videos)/community/write/page.tsx`
*   **데이터 요구사항**:
    *   `POST /api/board/posts`
    *   `GET /api/videos/search` (영상 첨부 모달용)
*   **데스크톱 레이아웃**:
    *   단일 컬럼 폼. 게시판 선택 드롭다운, 제목 입력란, 마크다운 에디터, 태그 입력란, 영상 첨부 버튼.
    *   하단에 취소 및 등록 버튼.
*   **모바일 레이아웃**:
    *   전체 화면 폼. 상단 헤더에 '취소' 및 '등록' 텍스트 버튼 배치.
*   **컴포넌트 트리**:
    *   `WritePostForm`
        *   `BoardSelect`
        *   `TitleInput`
        *   `MarkdownEditor`
        *   `TagInput`
        *   `VideoAttachModal`
*   **인터랙션**: 영상 첨부 버튼 클릭 시 검색 모달 오픈. 태그 입력 후 엔터 시 칩 형태로 변환.
*   **상태 관리**: `react-hook-form`과 `zod`를 이용한 폼 상태 및 유효성 검사.
*   **애니메이션**: 에러 메시지 발생 시 쉐이크 애니메이션.
*   **접근성**: 모든 입력 필드에 명확한 `label` 제공.
*   **상태별 UI**: 제출 중 버튼 로딩 스피너 및 비활성화.

### 7. `/explore` (통합 검색)
*   **페이지 목적**: 영상, 게시글, 크리에이터를 한 번에 검색하고 결과를 분류하여 제공.
*   **URL 및 라우트 파일 경로**: `src/app/(videos)/explore/page.tsx`
*   **데이터 요구사항**:
    *   `GET /api/search?q={query}`
*   **데스크톱 레이아웃**:
    *   상단: 대형 검색창 및 인기 검색어 태그.
    *   본문: 검색 결과가 있을 경우 영상, 크리에이터, 커뮤니티 섹션으로 나누어 가로 스크롤 리스트 제공.
*   **모바일 레이아웃**:
    *   상단: 검색창 고정.
    *   본문: 세로 스크롤 중심. 각 섹션별 최대 3개 항목 표시 후 '더보기' 버튼 제공.
*   **컴포넌트 트리**:
    *   `ExploreClient`
        *   `SearchInput`
        *   `PopularSearches`
        *   `SearchResultSection` (영상)
        *   `SearchResultSection` (크리에이터)
        *   `SearchResultSection` (커뮤니티)
*   **인터랙션**: 검색어 입력 시 디바운스(350ms) 적용하여 자동 검색.
*   **상태 관리**: URL Search Params `q`로 검색어 상태 관리.
*   **애니메이션**: 검색 결과 등장 시 스르륵 나타나는 효과.
*   **접근성**: 검색창에 `autoFocus` 적용 (데스크톱 한정).
*   **상태별 UI**: 검색 전에는 인기 검색어 표시. 결과 없음 시 안내 메시지.

### 8. `/stars` (크리에이터 목록)
*   **페이지 목적**: 플랫폼에서 활동하는 크리에이터(STAR) 탐색.
*   **URL 및 라우트 파일 경로**: `src/app/(videos)/stars/page.tsx`
*   **데이터 요구사항**:
    *   `GET /api/stars`
*   **데스크톱 레이아웃**:
    *   상단: 히어로 섹션 및 검색창.
    *   본문: 3열 또는 4열 스타 카드 그리드. 카드 호버 시 상세 바이오 및 대표 영상 프리뷰 표시.
*   **모바일 레이아웃**:
    *   본문: 2열 그리드. 호버 대신 탭 시 간략한 정보 오버레이.
*   **컴포넌트 트리**:
    *   `StarsDirectory`
        *   `StarSearch`
        *   `StarGrid`
            *   `StarCard` (반복)
*   **인터랙션**: 카드 클릭 시 프로필 페이지로 이동.
*   **상태 관리**: `useInfiniteQuery`로 무한 스크롤.
*   **애니메이션**: 카드 호버 시 정보 오버레이 슬라이드 업.
*   **접근성**: 카드 전체를 클릭 가능한 링크로 처리.
*   **상태별 UI**: 로딩 중 카드 Skeleton.

### 9. `/stars/profile/[id]` (스타 프로필)
*   **페이지 목적**: 특정 크리에이터의 상세 정보, 포트폴리오, 작업물을 모아보는 공간.
*   **URL 및 라우트 파일 경로**: `src/app/(videos)/stars/profile/[id]/page.tsx`
*   **데이터 요구사항**:
    *   `GET /api/stars/[id]`
    *   `GET /api/users/[id]/follow`
*   **데스크톱 레이아웃**:
    *   상단: 대형 커버 이미지, 아바타, 이름, 바이오, 팔로우 버튼, 소셜 링크.
    *   본문: 탭 구조 (대표 작업물, 포트폴리오, 전체 영상).
*   **모바일 레이아웃**:
    *   상단: 커버 이미지 축소, 아바타 중앙 정렬. 팔로우 버튼 전체 너비.
    *   본문: 가로 스크롤 탭.
*   **컴포넌트 트리**:
    *   `StarProfileClient`
        *   `ProfileHeader`
        *   `FollowButton`
        *   `ProfileTabs`
        *   `FeaturedWorks`
        *   `PortfolioGrid`
*   **인터랙션**: 팔로우 버튼 클릭 시 즉각적인 상태 변경 및 토스트 알림.
*   **상태 관리**: `useQuery`로 프로필 데이터 관리. 팔로우 상태는 낙관적 업데이트.
*   **애니메이션**: 탭 전환 시 콘텐츠 영역 크로스페이드.
*   **접근성**: 소셜 링크 아이콘에 명확한 `aria-label` 제공.
*   **상태별 UI**: 데이터 없음 시 빈 상태 메시지.

### 10. `/portfolio/[userId]` (공개 포트폴리오)
*   **페이지 목적**: 외부 공유를 위한 깔끔한 포트폴리오 뷰.
*   **URL 및 라우트 파일 경로**: `src/app/(videos)/portfolio/[userId]/page.tsx`
*   **데이터 요구사항**:
    *   `GET /api/portfolio/[userId]`
*   **데스크톱/모바일 레이아웃**:
    *   스타 프로필과 유사하나, 플랫폼 네비게이션을 최소화하고 콘텐츠에 집중.
    *   상단 프로필 요약, 하단 핀셋된 포트폴리오 아이템 그리드.
*   **컴포넌트 트리**:
    *   `PublicPortfolioClient`
        *   `PortfolioHeader`
        *   `PortfolioItems`
*   **인터랙션**: 아이템 클릭 시 원본 영상 또는 외부 링크로 이동.
*   **상태 관리**: `useQuery` 사용.
*   **애니메이션**: 스크롤 시 아이템 순차적 등장.
*   **접근성**: 고대비 텍스트 유지.
*   **상태별 UI**: 비공개 설정 시 접근 제한 메시지.

---

## Part 4: Component Architecture

### 새로운 컴포넌트 목록
| 컴포넌트 경로 | Props 인터페이스 | 용도 |
| :--- | :--- | :--- |
| `src/components/layout/bottom-tab-bar.tsx` | 없음 | 모바일 하단 네비게이션 |
| `src/components/community/board-tabs.tsx` | `{ activeTab: string, onChange: (tab: string) => void }` | 게시판 카테고리 전환 |
| `src/components/community/post-list-item.tsx` | `{ post: BoardPost }` | 게시글 목록의 단일 항목 |
| `src/components/community/write-fab.tsx` | `{ onClick: () => void }` | 모바일 글쓰기 플로팅 버튼 |
| `src/components/explore/search-input.tsx` | `{ value: string, onChange: (val: string) => void }` | 통합 검색창 |
| `src/components/ui/bottom-sheet.tsx` | `{ isOpen: boolean, onClose: () => void, children: ReactNode }` | 공통 바텀 시트 래퍼 |

### 수정 컴포넌트 목록
| 컴포넌트 경로 | 변경 사항 상세 |
| :--- | :--- |
| `src/components/layout/public-header.tsx` | 모바일 뷰포트에서 햄버거 메뉴 제거, 로고와 검색/알림 아이콘만 남김. 데스크톱 네비게이션에 '커뮤니티' 추가. |
| `src/components/video/video-card.tsx` | 모바일 환경을 위해 터치 타겟 크기 확대. 컴팩트 모드 스타일 개선. |
| `src/components/video/video-comments.tsx` | 모바일에서 바텀 시트 형태로 열릴 수 있도록 래퍼 로직 추가. |

### 공유 컴포넌트
*   **`BottomSheet`**: 모바일 환경에서 필터, 댓글, 공유 메뉴 등을 표시하기 위한 공통 컨테이너. Framer Motion의 `drag="y"`를 활용하여 아래로 스와이프하여 닫기 기능 구현.
*   **`EmptyState`**: 데이터가 없을 때 표시하는 공통 컴포넌트. 아이콘, 제목, 설명, 액션 버튼으로 구성.
*   **`OptimisticLikeButton`**: 영상, 게시글, 댓글 등에서 공통으로 사용하는 좋아요 버튼. 클릭 즉시 UI를 업데이트하고 백그라운드에서 API 호출.

### 모바일 전용 컴포넌트 상세
*   **`BottomTabBar`**:
    *   상태 관리: `usePathname`을 통해 현재 활성화된 탭 하이라이트.
    *   반응형: `md` 브레이크포인트 이상에서는 `hidden` 처리.
    *   스타일: 하단 고정(`fixed bottom-0`), 배경 블러(`backdrop-blur`), 상단 테두리.
*   **`SwipeableCard`**:
    *   Framer Motion의 `useDragControls`와 `drag="x"`를 사용하여 좌우 스와이프 구현.
    *   관리자 페이지의 `SwipeReviewSheet` 패턴을 차용하여 스와이프 임계치 도달 시 액션 트리거.

---

## Part 5: Mobile UX Strategy

### 모바일 네비게이션: 바텀 탭바 도입
기존의 상단 햄버거 메뉴는 한 손 조작이 어렵고 메뉴 탐색 깊이가 깊어지는 단점이 있습니다. 이를 해결하기 위해 화면 하단에 고정되는 **바텀 탭바(Bottom Tab Bar)**를 도입합니다.
*   **구성**: 홈, 영상, 커뮤니티, 탐색, 더보기 (5개 탭).
*   **장점**: 핵심 기능에 원탭으로 접근 가능, 한 손 조작 용이, 현재 위치 파악 직관적.

### 스와이프 패턴 적용
관리자 페이지의 `SwipeReviewSheet`에서 검증된 스와이프 패턴을 퍼블릭 페이지로 확장합니다.
*   **영상 탐색**: 영상 상세 페이지에서 좌우 스와이프로 이전/다음 영상으로 이동.
*   **바텀 시트 닫기**: 댓글 창이나 필터 창을 아래로 스와이프하여 닫기.
*   **게시글 목록**: 게시글 아이템을 왼쪽으로 스와이프하여 북마크 또는 공유 액션 노출.

### 터치 최적화
*   **터치 타겟**: 모든 버튼과 링크의 최소 터치 영역을 44x44px로 보장.
*   **제스처 영역**: 스와이프가 발생하는 영역은 스크롤과 충돌하지 않도록 `touch-action: pan-y` 등을 적절히 설정.

### 바텀 시트 (Bottom Sheet) 적극 활용
모바일 화면에서 모달(Modal) 대신 화면 하단에서 올라오는 바텀 시트를 기본 UI 패턴으로 사용합니다.
*   **적용 대상**: 영상 상세의 댓글 창, 영상 목록의 상세 필터, 공유 메뉴, 글쓰기 시 영상 첨부 모달.
*   **동작**: 배경 딤(Dim) 처리, 상단 핸들러 제공, 드래그하여 닫기 지원.

### 무한 스크롤 vs 페이지네이션
*   **무한 스크롤 적용**: 모바일 환경의 영상 목록(`/videos`), 커뮤니티 게시글 목록(`/community`), 통합 검색 결과(`/explore`). 스크롤이 끊기지 않는 탐색 경험 제공.
*   **페이지네이션 유지**: 데스크톱 환경의 일부 관리형 리스트나 명확한 위치 파악이 필요한 경우.

---

## Part 6: API Integration Plan

### 기존 API 재사용 목록
본 리디자인은 백엔드 수정 없이 기존 구현된 API를 100% 활용합니다.
*   `GET /api/board/posts`: 커뮤니티 목록 렌더링.
*   `GET /api/board/posts/[id]`: 커뮤니티 상세 렌더링.
*   `POST /api/board/posts`: 글쓰기 기능.
*   `GET /api/search`: 통합 검색 페이지 데이터 소스.
*   `GET /api/videos`, `GET /api/stars`: 기존 탐색 페이지 데이터 소스.

### API 호출 최적화 및 캐싱 전략
*   **TanStack Query 활용**: 모든 GET 요청은 `useQuery` 또는 `useInfiniteQuery`로 감싸 캐싱 처리.
*   **Stale Time 설정**:
    *   게시글 목록, 영상 목록: `staleTime: 60000` (1분).
    *   공지사항, 카테고리 등 정적 데이터: `staleTime: 300000` (5분).
*   **Prefetching**:
    *   게시글 목록에서 아이템 호버 시 (데스크톱) 상세 데이터 프리패치.
    *   바텀 탭바 아이콘 호버 시 해당 페이지 데이터 프리패치.

### Query Keys 구조
일관된 캐시 관리를 위해 다음과 같은 쿼리 키 구조를 사용합니다.
*   `['videos', 'list', { filters }]`
*   `['videos', 'detail', id]`
*   `['board', 'list', { boardType, sort }]`
*   `['board', 'detail', id]`
*   `['board', 'comments', postId]`
*   `['search', 'unified', query]`
*   `['stars', 'list', { sort }]`

---

## Part 7: Implementation Roadmap

### Phase 1: 기반 작업 (예상: 2일)
*   **목표**: 공통 레이아웃 변경 및 모바일 네비게이션 구축.
*   **작업 내용**:
    *   `BottomTabBar` 컴포넌트 개발 및 레이아웃 적용.
    *   `PublicHeader` 모바일 뷰 간소화.
    *   공통 `BottomSheet` 컴포넌트 개발.
*   **의존성**: 없음.

### Phase 2: 기존 페이지 리디자인 (예상: 3일)
*   **목표**: 홈, 영상 탐색, 영상 상세 페이지의 UI/UX 개선.
*   **작업 내용**:
    *   `/` 홈 페이지 섹션 재배치 및 모바일 스와이프 캐러셀 적용.
    *   `/videos` 모바일 2열 그리드 및 바텀 시트 필터 적용.
    *   `/videos/[id]` 모바일 고정 액션 바 및 바텀 시트 댓글 적용.
*   **의존성**: Phase 1 완료.

### Phase 3: 신규 페이지 구현 (예상: 4일)
*   **목표**: 커뮤니티 게시판 및 통합 검색 페이지 구축.
*   **작업 내용**:
    *   `/community` 목록 페이지 및 무한 스크롤 구현.
    *   `/community/[id]` 상세 페이지 및 댓글 기능 연동.
    *   `/community/write` 글쓰기 폼 및 영상 첨부 기능 구현.
    *   `/explore` 통합 검색 UI 및 디바운스 검색 연동.
*   **의존성**: 기존 API 정상 동작 확인.

### Phase 4: 모바일 UX 최적화 (예상: 2일)
*   **목표**: 네이티브 앱 수준의 제스처 및 애니메이션 적용.
*   **작업 내용**:
    *   Framer Motion을 활용한 페이지 전환 애니메이션 추가.
    *   스와이프 제스처(`drag="x"`, `drag="y"`) 세밀 조정.
    *   터치 타겟 크기 검수 및 조정.
*   **의존성**: Phase 2, 3 완료.

### Phase 5: 검증 및 폴리시 (예상: 1일)
*   **목표**: 버그 수정 및 최종 품질 확보.
*   **작업 내용**:
    *   반응형 브레이크포인트 테스트.
    *   접근성(A11y) 검수.
    *   빈 상태, 에러 상태 UI 점검.

---

## Part 8: File Change Matrix

| 파일 경로 | 변경 유형 | 변경 내용 요약 | Phase |
| :--- | :--- | :--- | :--- |
| `src/app/layout.tsx` | MODIFY | BottomTabBar 렌더링 로직 추가 | 1 |
| `src/components/layout/bottom-tab-bar.tsx` | NEW | 모바일 하단 탭바 컴포넌트 생성 | 1 |
| `src/components/layout/public-header.tsx` | MODIFY | 모바일 햄버거 메뉴 제거, 데스크톱 메뉴 수정 | 1 |
| `src/components/ui/bottom-sheet.tsx` | NEW | 공통 바텀 시트 래퍼 컴포넌트 생성 | 1 |
| `src/app/page.tsx` | MODIFY | 홈 레이아웃 재배치 및 모바일 최적화 | 2 |
| `src/app/(videos)/videos/page.tsx` | MODIFY | 모바일 필터 바텀 시트 연동, 무한 스크롤 적용 | 2 |
| `src/app/(videos)/videos/[id]/page.tsx` | MODIFY | 모바일 액션 바 추가, 댓글 바텀 시트 연동 | 2 |
| `src/app/(videos)/community/page.tsx` | NEW | 커뮤니티 게시판 목록 페이지 생성 | 3 |
| `src/app/(videos)/community/[id]/page.tsx` | NEW | 커뮤니티 게시글 상세 페이지 생성 | 3 |
| `src/app/(videos)/community/write/page.tsx` | NEW | 커뮤니티 글쓰기 페이지 생성 | 3 |
| `src/app/(videos)/explore/page.tsx` | NEW | 통합 검색 페이지 생성 | 3 |
| `src/components/community/board-tabs.tsx` | NEW | 게시판 탭 컴포넌트 생성 | 3 |
| `src/components/community/post-list-item.tsx` | NEW | 게시글 리스트 아이템 컴포넌트 생성 | 3 |
| `src/components/explore/search-input.tsx` | NEW | 통합 검색창 컴포넌트 생성 | 3 |
| `src/components/video/video-card.tsx` | MODIFY | 터치 타겟 확대, 컴팩트 모드 스타일 개선 | 4 |
| `src/components/video/video-comments.tsx` | MODIFY | 바텀 시트 렌더링 지원 로직 추가 | 4 |
| `src/lib/utils.ts` | MODIFY | 스와이프 제스처 관련 유틸리티 함수 추가 | 4 |