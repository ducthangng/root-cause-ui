import { useCallback, useRef, useState } from "react";
import { requestPresignedUrl, uploadFileToS3 } from "./api/api";
import type { UploadState } from "./types/types";

const initialState: UploadState = {
  status: "idle",
  progress: 0,
  s3Key: null,
  error: null,
};

export function UploadPage() {
  const [state, setState] = useState<UploadState>(initialState);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelected = useCallback(async (file: File) => {
    setState({ status: "requesting-url", progress: 0, s3Key: null, error: null });

    try {
      const { uploadUrl, s3Key } = await requestPresignedUrl({
        filename: file.name,
        contentType: file.type || "application/octet-stream",
      });

      setState((prev) => ({ ...prev, status: "uploading", s3Key }));

      await uploadFileToS3(file, uploadUrl, (percent) => {
        setState((prev) => ({ ...prev, progress: percent }));
      });

      setState((prev) => ({ ...prev, status: "uploaded", progress: 100 }));
    } catch (err) {
      setState({
        status: "error",
        progress: 0,
        s3Key: null,
        error: err instanceof Error ? err.message : "Unknown upload error",
      });
    }
  }, []);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelected(file);
  };

  const reset = () => {
    setState(initialState);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const busy = state.status === "requesting-url" || state.status === "uploading";

  return (
    <div className="upload-page">
      <h2>RootCause AI — Upload NHTSA Complaint Data</h2>

      <div className="upload-card">
        <input
          ref={fileInputRef}
          type="file"
          onChange={onInputChange}
          disabled={busy}
        />

        {state.status === "idle" && (
          <p className="hint">Select a file to begin upload.</p>
        )}

        {state.status === "requesting-url" && (
          <p className="status status-pending">Requesting upload URL…</p>
        )}

        {state.status === "uploading" && (
          <div className="progress-wrap">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${state.progress}%` }}
              />
            </div>
            <span>{state.progress}%</span>
          </div>
        )}

        {state.status === "uploaded" && (
          <div className="status status-success">
            <p>✔ Uploaded successfully.</p>
            <p className="s3-key">key: {state.s3Key}</p>
            <p className="hint">
              Processing status tracking coming soon — the ingestion
              pipeline (cleaning, embedding, RAG indexing) runs separately.
            </p>
            <button onClick={reset}>Upload another file</button>
          </div>
        )}

        {state.status === "error" && (
          <div className="status status-error">
            <p>✘ {state.error}</p>
            <button onClick={reset}>Try again</button>
          </div>
        )}
      </div>
    </div>
  );
}
