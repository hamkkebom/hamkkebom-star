import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- Mocks ---

const mockGetAuthUser = vi.fn();
vi.mock("@/lib/auth-helpers", () => ({
  getAuthUser: () => mockGetAuthUser(),
}));

const mockBoardPostFindMany = vi.fn();
const mockBoardPostCount = vi.fn();
const mockBoardPostCreate = vi.fn();
const mockBoardPostFindUnique = vi.fn();
const mockBoardPostUpdate = vi.fn();
const mockBoardPostDelete = vi.fn();
const mockBoardPostLikeFindUnique = vi.fn();
const mockBoardPostLikeCreate = vi.fn();
const mockBoardPostLikeDelete = vi.fn();
const mockBoardCommentCreate = vi.fn();
const mockTransaction = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    boardPost: {
      findMany: (...args: unknown[]) => mockBoardPostFindMany(...args),
      count: (...args: unknown[]) => mockBoardPostCount(...args),
      create: (...args: unknown[]) => mockBoardPostCreate(...args),
      findUnique: (...args: unknown[]) => mockBoardPostFindUnique(...args),
      update: (...args: unknown[]) => mockBoardPostUpdate(...args),
      delete: (...args: unknown[]) => mockBoardPostDelete(...args),
    },
    boardPostLike: {
      findUnique: (...args: unknown[]) => mockBoardPostLikeFindUnique(...args),
      create: (...args: unknown[]) => mockBoardPostLikeCreate(...args),
      delete: (...args: unknown[]) => mockBoardPostLikeDelete(...args),
    },
    boardComment: {
      create: (...args: unknown[]) => mockBoardCommentCreate(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

vi.mock("@/generated/prisma/client", () => ({
  BoardType: {
    FREE: "FREE",
    QNA: "QNA",
    TIPS: "TIPS",
    SHOWCASE: "SHOWCASE",
    RECRUITMENT: "RECRUITMENT",
    NOTICE: "NOTICE",
  },
}));

// --- Helpers ---

const adminUser = { id: "admin-001", role: "ADMIN", name: "관리자" };
const starUser = { id: "star-001", role: "STAR", name: "스타" };
const otherUser = { id: "other-001", role: "STAR", name: "다른유저" };

const mockPost = {
  id: "post-001",
  title: "테스트 게시글",
  content: "테스트 내용입니다.",
  boardType: "FREE",
  tags: [],
  videoId: null,
  authorId: "star-001",
  isNotice: false,
  isPinned: false,
  isHidden: false,
  viewCount: 10,
  likeCount: 3,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
  author: { id: "star-001", name: "스타", chineseName: null, avatarUrl: null, role: "STAR" },
  _count: { comments: 2, likes: 3 },
};

function makeGetRequest(path: string, params?: Record<string, string>) {
  const url = new URL(`http://localhost${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }
  return new NextRequest(url.toString());
}

function makePostRequest(path: string, body?: unknown) {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    body: body !== undefined ? JSON.stringify(body) : undefined,
    headers: { "Content-Type": "application/json" },
  });
}

function makeDeleteRequest(path: string) {
  return new NextRequest(`http://localhost${path}`, { method: "DELETE" });
}

// --- Imports ---

import { GET as getPostsList, POST as createPost } from "@/app/api/board/posts/route";
import { GET as getPostDetail, DELETE as deletePost } from "@/app/api/board/posts/[id]/route";
import { POST as createComment } from "@/app/api/board/posts/[id]/comments/route";
import { POST as toggleLike } from "@/app/api/board/posts/[id]/like/route";

// ============================================================
// GET /api/board/posts — 게시글 목록
// ============================================================

describe("GET /api/board/posts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("200 — 기본 페이지네이션 (page=1, pageSize=20)", async () => {
    mockBoardPostFindMany.mockResolvedValue([mockPost]);
    mockBoardPostCount.mockResolvedValue(1);

    const res = await getPostsList(makeGetRequest("/api/board/posts"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toHaveLength(1);
    expect(json.page).toBe(1);
    expect(json.pageSize).toBe(20);
    expect(json.total).toBe(1);
    expect(json.totalPages).toBe(1);

    // findMany에 skip=0, take=20 전달 확인
    const findManyArgs = mockBoardPostFindMany.mock.calls[0][0];
    expect(findManyArgs.skip).toBe(0);
    expect(findManyArgs.take).toBe(20);
  });

  it("200 — boardType 필터링", async () => {
    mockBoardPostFindMany.mockResolvedValue([]);
    mockBoardPostCount.mockResolvedValue(0);

    await getPostsList(makeGetRequest("/api/board/posts", { boardType: "QNA" }));

    const findManyArgs = mockBoardPostFindMany.mock.calls[0][0];
    expect(findManyArgs.where.boardType).toBe("QNA");
  });

  it("200 — 검색어(q) 필터링", async () => {
    mockBoardPostFindMany.mockResolvedValue([]);
    mockBoardPostCount.mockResolvedValue(0);

    await getPostsList(makeGetRequest("/api/board/posts", { q: "테스트" }));

    const findManyArgs = mockBoardPostFindMany.mock.calls[0][0];
    expect(findManyArgs.where.OR).toBeDefined();
    expect(findManyArgs.where.OR).toHaveLength(2);
    expect(findManyArgs.where.OR[0].title.contains).toBe("테스트");
    expect(findManyArgs.where.OR[1].content.contains).toBe("테스트");
  });

  it("200 — sort=popular 정렬 (likeCount desc)", async () => {
    mockBoardPostFindMany.mockResolvedValue([]);
    mockBoardPostCount.mockResolvedValue(0);

    await getPostsList(makeGetRequest("/api/board/posts", { sort: "popular" }));

    const findManyArgs = mockBoardPostFindMany.mock.calls[0][0];
    expect(findManyArgs.orderBy[0]).toEqual({ likeCount: "desc" });
  });

  it("200 — sort=comments 정렬 (_count desc)", async () => {
    mockBoardPostFindMany.mockResolvedValue([]);
    mockBoardPostCount.mockResolvedValue(0);

    await getPostsList(makeGetRequest("/api/board/posts", { sort: "comments" }));

    const findManyArgs = mockBoardPostFindMany.mock.calls[0][0];
    expect(findManyArgs.orderBy[0]).toEqual({ comments: { _count: "desc" } });
  });

  it("200 — pageSize 최대 30으로 클램핑", async () => {
    mockBoardPostFindMany.mockResolvedValue([]);
    mockBoardPostCount.mockResolvedValue(0);

    await getPostsList(makeGetRequest("/api/board/posts", { pageSize: "100" }));

    const findManyArgs = mockBoardPostFindMany.mock.calls[0][0];
    expect(findManyArgs.take).toBe(30);
  });

  it("200 — 잘못된 boardType은 무시", async () => {
    mockBoardPostFindMany.mockResolvedValue([]);
    mockBoardPostCount.mockResolvedValue(0);

    await getPostsList(makeGetRequest("/api/board/posts", { boardType: "INVALID" }));

    const findManyArgs = mockBoardPostFindMany.mock.calls[0][0];
    expect(findManyArgs.where.boardType).toBeUndefined();
  });

  it("200 — isHidden: false 필터 항상 적용", async () => {
    mockBoardPostFindMany.mockResolvedValue([]);
    mockBoardPostCount.mockResolvedValue(0);

    await getPostsList(makeGetRequest("/api/board/posts"));

    const findManyArgs = mockBoardPostFindMany.mock.calls[0][0];
    expect(findManyArgs.where.isHidden).toBe(false);
  });

  it("200 — 기본 정렬은 isPinned desc + createdAt desc", async () => {
    mockBoardPostFindMany.mockResolvedValue([]);
    mockBoardPostCount.mockResolvedValue(0);

    await getPostsList(makeGetRequest("/api/board/posts"));

    const findManyArgs = mockBoardPostFindMany.mock.calls[0][0];
    expect(findManyArgs.orderBy).toEqual([
      { isPinned: "desc" },
      { createdAt: "desc" },
    ]);
  });
});

// ============================================================
// POST /api/board/posts — 게시글 작성
// ============================================================

describe("POST /api/board/posts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("401 — 비인증 사용자", async () => {
    mockGetAuthUser.mockResolvedValue(null);

    const res = await createPost(makePostRequest("/api/board/posts", { title: "제목", content: "내용" }));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Unauthorized");
  });

  it("400 — title 누락", async () => {
    mockGetAuthUser.mockResolvedValue(starUser);

    const res = await createPost(makePostRequest("/api/board/posts", { content: "내용" }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("제목과 내용을 입력해주세요.");
  });

  it("400 — content 누락", async () => {
    mockGetAuthUser.mockResolvedValue(starUser);

    const res = await createPost(makePostRequest("/api/board/posts", { title: "제목" }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("제목과 내용을 입력해주세요.");
  });

  it("400 — title 빈 문자열", async () => {
    mockGetAuthUser.mockResolvedValue(starUser);

    const res = await createPost(makePostRequest("/api/board/posts", { title: "  ", content: "내용" }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("제목과 내용을 입력해주세요.");
  });

  it("201 — 게시글 생성 성공", async () => {
    mockGetAuthUser.mockResolvedValue(starUser);
    const createdPost = {
      id: "post-new",
      title: "새 게시글",
      content: "새 내용",
      boardType: "FREE",
      tags: [],
      videoId: null,
      authorId: "star-001",
      isNotice: false,
      author: { id: "star-001", name: "스타", chineseName: null, avatarUrl: null, role: "STAR" },
    };
    mockBoardPostCreate.mockResolvedValue(createdPost);

    const res = await createPost(makePostRequest("/api/board/posts", {
      title: "새 게시글",
      content: "새 내용",
    }));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.id).toBe("post-new");
    expect(json.title).toBe("새 게시글");

    // create 호출 인자 확인
    const createArgs = mockBoardPostCreate.mock.calls[0][0];
    expect(createArgs.data.title).toBe("새 게시글");
    expect(createArgs.data.content).toBe("새 내용");
    expect(createArgs.data.authorId).toBe("star-001");
    expect(createArgs.data.boardType).toBe("FREE");
  });

  it("201 — ADMIN + NOTICE boardType → isNotice=true", async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockBoardPostCreate.mockResolvedValue({
      id: "post-notice",
      title: "공지사항",
      content: "공지 내용",
      boardType: "NOTICE",
      isNotice: true,
      authorId: "admin-001",
      author: { id: "admin-001", name: "관리자", chineseName: null, avatarUrl: null, role: "ADMIN" },
    });

    const res = await createPost(makePostRequest("/api/board/posts", {
      title: "공지사항",
      content: "공지 내용",
      boardType: "NOTICE",
    }));

    expect(res.status).toBe(201);

    const createArgs = mockBoardPostCreate.mock.calls[0][0];
    expect(createArgs.data.isNotice).toBe(true);
    expect(createArgs.data.boardType).toBe("NOTICE");
  });

  it("201 — 기본 boardType은 FREE", async () => {
    mockGetAuthUser.mockResolvedValue(starUser);
    mockBoardPostCreate.mockResolvedValue({ id: "post-free", boardType: "FREE" });

    await createPost(makePostRequest("/api/board/posts", {
      title: "제목",
      content: "내용",
    }));

    const createArgs = mockBoardPostCreate.mock.calls[0][0];
    expect(createArgs.data.boardType).toBe("FREE");
  });

  it("201 — STAR + NOTICE boardType → isNotice=false", async () => {
    mockGetAuthUser.mockResolvedValue(starUser);
    mockBoardPostCreate.mockResolvedValue({ id: "post-x", isNotice: false });

    await createPost(makePostRequest("/api/board/posts", {
      title: "제목",
      content: "내용",
      boardType: "NOTICE",
    }));

    const createArgs = mockBoardPostCreate.mock.calls[0][0];
    expect(createArgs.data.isNotice).toBe(false);
  });

  it("201 — tags와 videoId 전달", async () => {
    mockGetAuthUser.mockResolvedValue(starUser);
    mockBoardPostCreate.mockResolvedValue({ id: "post-tags" });

    await createPost(makePostRequest("/api/board/posts", {
      title: "제목",
      content: "내용",
      tags: ["태그1", "태그2"],
      videoId: "vid-001",
    }));

    const createArgs = mockBoardPostCreate.mock.calls[0][0];
    expect(createArgs.data.tags).toEqual(["태그1", "태그2"]);
    expect(createArgs.data.videoId).toBe("vid-001");
  });

  it("201 — 잘못된 boardType은 FREE로 폴백", async () => {
    mockGetAuthUser.mockResolvedValue(starUser);
    mockBoardPostCreate.mockResolvedValue({ id: "post-fallback", boardType: "FREE" });

    await createPost(makePostRequest("/api/board/posts", {
      title: "제목",
      content: "내용",
      boardType: "INVALID_TYPE",
    }));

    const createArgs = mockBoardPostCreate.mock.calls[0][0];
    expect(createArgs.data.boardType).toBe("FREE");
  });
});

// ============================================================
// GET /api/board/posts/[id] — 게시글 상세
// ============================================================

describe("GET /api/board/posts/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const paramsPromise = Promise.resolve({ id: "post-001" });

  it("200 — 게시글 상세 반환 (author, comments 포함)", async () => {
    const detailPost = {
      ...mockPost,
      comments: [
        {
          id: "comment-001",
          content: "댓글 내용",
          isHidden: false,
          parentId: null,
          author: { id: "star-001", name: "스타", chineseName: null, avatarUrl: null, role: "STAR" },
          children: [],
        },
      ],
    };
    mockBoardPostFindUnique.mockResolvedValue(detailPost);
    mockBoardPostUpdate.mockResolvedValue({});

    const res = await getPostDetail(
      makeGetRequest("/api/board/posts/post-001"),
      { params: paramsPromise },
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.id).toBe("post-001");
    expect(json.data.author.name).toBe("스타");
    expect(json.data.comments).toHaveLength(1);
  });

  it("404 — 게시글 없음", async () => {
    mockBoardPostFindUnique.mockResolvedValue(null);

    const res = await getPostDetail(
      makeGetRequest("/api/board/posts/nonexistent"),
      { params: Promise.resolve({ id: "nonexistent" }) },
    );
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBe("게시글을 찾을 수 없습니다.");
  });

  it("404 — 숨겨진 게시글", async () => {
    mockBoardPostFindUnique.mockResolvedValue({ ...mockPost, isHidden: true });

    const res = await getPostDetail(
      makeGetRequest("/api/board/posts/post-001"),
      { params: paramsPromise },
    );
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBe("게시글을 찾을 수 없습니다.");
  });

  it("200 — 조회수 증가 (viewCount + 1)", async () => {
    mockBoardPostFindUnique.mockResolvedValue({ ...mockPost, viewCount: 10 });
    mockBoardPostUpdate.mockResolvedValue({});

    const res = await getPostDetail(
      makeGetRequest("/api/board/posts/post-001"),
      { params: paramsPromise },
    );
    const json = await res.json();

    // update 호출 확인 (increment: 1)
    expect(mockBoardPostUpdate).toHaveBeenCalledWith({
      where: { id: "post-001" },
      data: { viewCount: { increment: 1 } },
    });

    // 응답에 viewCount + 1 반영
    expect(json.data.viewCount).toBe(11);
  });
});

// ============================================================
// DELETE /api/board/posts/[id] — 게시글 삭제
// ============================================================

describe("DELETE /api/board/posts/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const paramsPromise = Promise.resolve({ id: "post-001" });

  it("401 — 비인증 사용자", async () => {
    mockGetAuthUser.mockResolvedValue(null);

    const res = await deletePost(
      makeDeleteRequest("/api/board/posts/post-001"),
      { params: paramsPromise },
    );
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Unauthorized");
  });

  it("404 — 게시글 없음", async () => {
    mockGetAuthUser.mockResolvedValue(starUser);
    mockBoardPostFindUnique.mockResolvedValue(null);

    const res = await deletePost(
      makeDeleteRequest("/api/board/posts/post-001"),
      { params: paramsPromise },
    );
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBe("Not found");
  });

  it("403 — 작성자가 아닌 비관리자", async () => {
    mockGetAuthUser.mockResolvedValue(otherUser);
    mockBoardPostFindUnique.mockResolvedValue({ authorId: "star-001" });

    const res = await deletePost(
      makeDeleteRequest("/api/board/posts/post-001"),
      { params: paramsPromise },
    );
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toBe("Forbidden");
  });

  it("200 — 작성자 본인 삭제 성공", async () => {
    mockGetAuthUser.mockResolvedValue(starUser);
    mockBoardPostFindUnique.mockResolvedValue({ authorId: "star-001" });
    mockBoardPostDelete.mockResolvedValue({});

    const res = await deletePost(
      makeDeleteRequest("/api/board/posts/post-001"),
      { params: paramsPromise },
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockBoardPostDelete).toHaveBeenCalledWith({ where: { id: "post-001" } });
  });

  it("200 — ADMIN은 타인 게시글 삭제 가능", async () => {
    mockGetAuthUser.mockResolvedValue(adminUser);
    mockBoardPostFindUnique.mockResolvedValue({ authorId: "star-001" });
    mockBoardPostDelete.mockResolvedValue({});

    const res = await deletePost(
      makeDeleteRequest("/api/board/posts/post-001"),
      { params: paramsPromise },
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });
});

// ============================================================
// POST /api/board/posts/[id]/comments — 댓글 작성
// ============================================================

describe("POST /api/board/posts/[id]/comments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const paramsPromise = Promise.resolve({ id: "post-001" });

  it("401 — 비인증 사용자", async () => {
    mockGetAuthUser.mockResolvedValue(null);

    const res = await createComment(
      makePostRequest("/api/board/posts/post-001/comments", { content: "댓글" }),
      { params: paramsPromise },
    );
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Unauthorized");
  });

  it("400 — content 빈 문자열", async () => {
    mockGetAuthUser.mockResolvedValue(starUser);

    const res = await createComment(
      makePostRequest("/api/board/posts/post-001/comments", { content: "" }),
      { params: paramsPromise },
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("내용을 입력해주세요.");
  });

  it("400 — content 공백만", async () => {
    mockGetAuthUser.mockResolvedValue(starUser);

    const res = await createComment(
      makePostRequest("/api/board/posts/post-001/comments", { content: "   " }),
      { params: paramsPromise },
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("내용을 입력해주세요.");
  });

  it("201 — 댓글 생성 (parentId null)", async () => {
    mockGetAuthUser.mockResolvedValue(starUser);
    const createdComment = {
      id: "comment-001",
      postId: "post-001",
      authorId: "star-001",
      content: "좋은 글이네요!",
      parentId: null,
      author: { id: "star-001", name: "스타", chineseName: null, avatarUrl: null, role: "STAR" },
    };
    mockBoardCommentCreate.mockResolvedValue(createdComment);

    const res = await createComment(
      makePostRequest("/api/board/posts/post-001/comments", { content: "좋은 글이네요!" }),
      { params: paramsPromise },
    );
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.id).toBe("comment-001");
    expect(json.content).toBe("좋은 글이네요!");

    const createArgs = mockBoardCommentCreate.mock.calls[0][0];
    expect(createArgs.data.postId).toBe("post-001");
    expect(createArgs.data.authorId).toBe("star-001");
    expect(createArgs.data.parentId).toBeNull();
  });

  it("201 — 대댓글 생성 (parentId 지정)", async () => {
    mockGetAuthUser.mockResolvedValue(starUser);
    const createdReply = {
      id: "comment-002",
      postId: "post-001",
      authorId: "star-001",
      content: "답글입니다",
      parentId: "comment-001",
      author: { id: "star-001", name: "스타", chineseName: null, avatarUrl: null, role: "STAR" },
    };
    mockBoardCommentCreate.mockResolvedValue(createdReply);

    const res = await createComment(
      makePostRequest("/api/board/posts/post-001/comments", {
        content: "답글입니다",
        parentId: "comment-001",
      }),
      { params: paramsPromise },
    );
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.parentId).toBe("comment-001");

    const createArgs = mockBoardCommentCreate.mock.calls[0][0];
    expect(createArgs.data.parentId).toBe("comment-001");
  });
});

// ============================================================
// POST /api/board/posts/[id]/like — 좋아요 토글
// ============================================================

describe("POST /api/board/posts/[id]/like", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const paramsPromise = Promise.resolve({ id: "post-001" });

  it("401 — 비인증 사용자", async () => {
    mockGetAuthUser.mockResolvedValue(null);

    const res = await toggleLike(
      makePostRequest("/api/board/posts/post-001/like"),
      { params: paramsPromise },
    );
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Unauthorized");
  });

  it("200 — 좋아요 생성 (liked: true)", async () => {
    mockGetAuthUser.mockResolvedValue(starUser);
    mockBoardPostLikeFindUnique.mockResolvedValue(null);
    mockTransaction.mockResolvedValue([{}, {}]);

    const res = await toggleLike(
      makePostRequest("/api/board/posts/post-001/like"),
      { params: paramsPromise },
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.liked).toBe(true);

    // findUnique 호출 확인
    expect(mockBoardPostLikeFindUnique).toHaveBeenCalledWith({
      where: { userId_postId: { userId: "star-001", postId: "post-001" } },
    });

    // $transaction 호출 확인
    expect(mockTransaction).toHaveBeenCalled();
  });

  it("200 — 좋아요 취소 (liked: false)", async () => {
    mockGetAuthUser.mockResolvedValue(starUser);
    mockBoardPostLikeFindUnique.mockResolvedValue({ id: "like-001", userId: "star-001", postId: "post-001" });
    mockTransaction.mockResolvedValue([{}, {}]);

    const res = await toggleLike(
      makePostRequest("/api/board/posts/post-001/like"),
      { params: paramsPromise },
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.liked).toBe(false);

    // $transaction 호출 확인
    expect(mockTransaction).toHaveBeenCalled();
  });

  it("200 — $transaction 배열 형태로 호출", async () => {
    mockGetAuthUser.mockResolvedValue(starUser);
    mockBoardPostLikeFindUnique.mockResolvedValue(null);
    mockTransaction.mockResolvedValue([{}, {}]);

    await toggleLike(
      makePostRequest("/api/board/posts/post-001/like"),
      { params: paramsPromise },
    );

    // $transaction의 첫 번째 인자가 배열인지 확인
    const transactionArg = mockTransaction.mock.calls[0][0];
    expect(Array.isArray(transactionArg)).toBe(true);
  });
});
