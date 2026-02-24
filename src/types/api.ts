// Common API response types

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: ApiErrorDetail;
  message?: string;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

// Notification badge types (role-specific)

export interface StarNotificationBadge {
  unreadFeedbacks: number;
}

export interface AdminNotificationBadge {
  unreviewedSubmissions: number;
  pendingSettlements: number;
  pendingApprovals: number;
}

export type NotificationBadge = StarNotificationBadge | AdminNotificationBadge;
