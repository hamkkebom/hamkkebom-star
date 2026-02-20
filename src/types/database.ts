// Re-export all Prisma generated types for convenience
export type {
  User,
  ProjectRequest,
  ProjectAssignment,
  Submission,
  AiAnalysis,
  Feedback,
  Video,
  VideoTechnicalSpec,
  VideoEventLog,
  Settlement,
  SettlementItem,
  SystemSettings,
  Portfolio,
  PortfolioItem,
  Category,
  Counselor,
  MediaPlacement,
} from "@/generated/prisma/client";

export {
  Role,
  RequestStatus,
  AssignmentType,
  AssignmentStatus,
  SubmissionStatus,
  FeedbackType,
  FeedbackPriority,
  FeedbackStatus,
  VideoStatus,
  SettlementStatus,
} from "@/generated/prisma/client";
