/** Standard API response envelope used by all @ellixr/api endpoints. */

export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
}

export interface ApiSuccess<T> {
  data: T;
  meta?: ApiMeta;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
}

/** JWT access-token payload. collegeId is null only for PLATFORM_ADMIN. */
export interface JwtPayload {
  sub: string; // userId
  collegeId: string | null;
  role: import('./enums').UserRole;
}
