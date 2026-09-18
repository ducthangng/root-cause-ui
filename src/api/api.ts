import type { PresignRequest, PresignResponse } from "../types/types";

const PRESIGN_ENDPOINT = import.meta.env.VITE_PRESIGN_ENDPOINT as string;

if (!PRESIGN_ENDPOINT) {
  // Fail loud at startup, not silently at upload time.
  // eslint-disable-next-line no-console
  console.error(
    "VITE_PRESIGN_ENDPOINT is not set. Create a .env file (see .env.example)."
  );
}

/**
 * Requests a presigned S3 PUT URL from the backend.
 * This is a plain fetch — it's a small JSON round trip, no progress needed.
 */
export async function requestPresignedUrl(
  req: PresignRequest
): Promise<PresignResponse> {
  const res = await fetch(PRESIGN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Presign request failed: ${res.status} ${res.statusText} ${body}`
    );
  }

  return res.json() as Promise<PresignResponse>;
}

/**
 * PUTs the file directly to S3 using the presigned URL.
 * Uses XHR (not fetch) because we need upload-progress events —
 * fetch has no reliable cross-browser upload progress API.
 */
export function uploadFileToS3(
  file: File,
  uploadUrl: string,
  onProgress: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open("PUT", uploadUrl, true);
    // Content-Type must match exactly what was signed server-side,
    // or S3 responds with a SignatureDoesNotMatch error.
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`S3 upload failed: ${xhr.status} ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => reject(new Error("S3 upload failed: network error"));
    xhr.onabort = () => reject(new Error("S3 upload aborted"));

    xhr.send(file);
  });
}