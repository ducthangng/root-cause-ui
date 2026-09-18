export type UploadStatus =
  | "idle"
  | "requesting-url"
  | "uploading"
  | "uploaded"
  | "error";

export interface PresignRequest {
  filename: string;
  contentType: string;
}

export interface PresignResponse {
  uploadUrl: string;
  s3Key: string;
  expiresIn: number;
}

export interface UploadState {
  status: UploadStatus;
  progress: number; // 0-100, only meaningful during "uploading"
  s3Key: string | null;
  error: string | null;
}