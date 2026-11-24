import type { ErrorCode } from '../common/error-codes';

/**
 * Har endpoint uchun BIZNES xatolari (umumiy 400/401/403/404/429 avtomatik qo'shiladi).
 * Kalit: `METHOD /yo'l` (marshrutdagi shaklda).
 */
export const routeErrors: Record<string, readonly ErrorCode[]> = {
  'POST /auth/login': ['INVALID_CREDENTIALS', 'TEMP_PASSWORD_EXPIRED', 'FORBIDDEN', 'TOO_MANY_ATTEMPTS'],
  'POST /auth/change-password': ['VALIDATION_ERROR'],
  'POST /issues': ['VALIDATION_ERROR', 'CONFLICT'],
  'PATCH /issues/:id': ['CONFLICT'],
  'POST /issues/:id/resubmit': ['INVALID_STATUS_TRANSITION'],
  'DELETE /issues/:id': ['CONFLICT'],
  'POST /issues/:id/feedback': ['CONFLICT', 'FORBIDDEN'],
  'POST /issues/:id/comments': ['CONFLICT'],
  'PUT /issues/:id/vote': ['ROUND_CLOSED', 'ISSUE_NOT_VOTABLE', 'VOTE_LIMIT_REACHED'],
  'DELETE /issues/:id/vote': ['ROUND_CLOSED'],
  'POST /media': ['FILE_TOO_LARGE', 'UNSUPPORTED_MEDIA_TYPE', 'VALIDATION_ERROR'],
  'POST /reports': ['NOT_FOUND'],
  'PUT /events/:id/rsvp': ['CONFLICT'],
  'POST /admin/issues/:id/approve': ['INVALID_STATUS_TRANSITION', 'ROUND_CLOSED'],
  'POST /admin/issues/:id/reject': ['INVALID_STATUS_TRANSITION', 'VALIDATION_ERROR'],
  'POST /admin/issues/:id/merge': ['INVALID_STATUS_TRANSITION', 'VALIDATION_ERROR'],
  'POST /admin/issues/:id/transition': ['INVALID_STATUS_TRANSITION', 'VALIDATION_ERROR'],
  'PATCH /admin/issues/:id/work': ['CONFLICT', 'VALIDATION_ERROR'],
  'POST /admin/issues/:id/carry-over': ['CONFLICT', 'ROUND_CLOSED'],
  'POST /admin/residents': ['CONFLICT', 'VALIDATION_ERROR'],
  'POST /admin/reports/:id/hide': ['CONFLICT'],
  'POST /admin/reports/:id/dismiss': ['CONFLICT'],
  'PATCH /admin/events/:id': ['CONFLICT'],
  'POST /admin/events/:id/publish': ['CONFLICT'],
  'POST /admin/events/:id/cancel': ['CONFLICT'],
  'POST /admin/events/:id/complete': ['CONFLICT'],
  'DELETE /admin/announcements/:id': ['CONFLICT'],
};
