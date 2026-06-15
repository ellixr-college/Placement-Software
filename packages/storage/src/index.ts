/**
 * Cloudflare R2 storage helpers — DORMANT (not used in V1).
 *
 * Interface placeholder only. V1 needs no object storage: résumés store JSON in
 * Postgres and report exports stream directly in the HTTP response. Kept so the
 * workspace graph stays complete and to mark the seam where a real presigned-URL
 * client (@aws-sdk/client-s3 + s3-request-presigner) would slot in if a future
 * feature ever needs async/large file storage.
 */

export interface PresignUploadParams {
  collegeId: string;
  key: string;
  contentType: string;
  maxBytes: number;
  expiresInSeconds?: number;
}

export interface StorageClient {
  presignUpload(params: PresignUploadParams): Promise<{ url: string; key: string }>;
  presignDownload(key: string, expiresInSeconds?: number): Promise<string>;
}

export const STORAGE_NOT_IMPLEMENTED = 'R2 storage client is implemented in Phase 2';
