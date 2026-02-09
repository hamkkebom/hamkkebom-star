// Re-export all Prisma generated types for convenience
export type {
  User,
  ProjectRequest,
  ProjectAssignment,
  Submission,
  Feedback,
  Video,
  VideoTechnicalSpec,
  VideoEventLog,
  Settlement,
  SettlementItem,
  Portfolio,
  PortfolioItem,
  Category,
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
