import { useCallback, useRef, useState } from "react";
import { requestPresignedUrl, uploadFileToS3 } from "./api";
import type { UploadState } from "./types";
import { PipelineStatus, PIPELINE_STEPS } from "./PipelineStatus";
import type { PipelineStep } from "./PipelineStatus";
import { LogPanel, makeLogEntry } from "./LogPanel";
import type { LogEntry } from "./LogPanel";

const initialState: UploadState = {
  status: "idle",
  progress: 0,
  s3Key: null,
  error: null,
};

export function UploadPage() {
  const [state, setState] = useState<UploadState>(initialState);
  const [log, setLog] = useState<LogEntry[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const appendLog = useCallback(
    (message: string, level: LogEntry["level"] = "info") => {
      setLog((prev) => [...prev, makeLogEntry(message, level)]);
    },
    []
  );

  const handleFileSelected = useCallback(
    async (file: File) => {
      setState({ status: "requesting-url", progress: 0, s3Key: null, error: null });
      appendLog(`selected file: ${file.name} (${file.type || "unknown type"})`);
      appendLog("requesting presigned url...");

      try {
        const { uploadUrl, s3Key } = await requestPresignedUrl({
          filename: file.name,
          contentType: file.type || "application/octet-stream",
        });
        appendLog(`presign ok, key=${s3Key}`);

        setState((prev) => ({ ...prev, status: "uploading", s3Key }));
        appendLog("uploading to s3...");

        let lastLogged = -1;
        await uploadFileToS3(file, uploadUrl, (percent) => {
          setState((prev) => ({ ...prev, progress: percent }));
          // log every ~20% instead of every tick, keeps the panel readable
          if (percent - lastLogged >= 20 || percent === 100) {
            appendLog(`upload progress: ${percent}%`);
            lastLogged = percent;
          }
        });

        setState((prev) => ({ ...prev, status: "uploaded", progress: 100 }));
        appendLog(`upload complete, s3Key=${s3Key}`, "success");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown upload error";
        setState({ status: "error", progress: 0, s3Key: null, error: message });
        appendLog(message, "error");
      }
    },
    [appendLog]
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelected(file);
  };

  const reset = () => {
    setState(initialState);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const busy = state.status === "requesting-url" || state.status === "uploading";

  // Only "upload" is real state. The rest is a static placeholder until
  // an orchestrator exists that this UI can poll for actual progress.
  const steps: PipelineStep[] = PIPELINE_STEPS.map((step) => {
    if (step.id !== "upload") return step;
    if (state.status === "uploaded") return { ...step, state: "done" };
    if (state.status === "uploading" || state.status === "requesting-url")
      return { ...step, state: "in-progress" };
    if (state.status === "error") return { ...step, state: "error" };
    return step;
  });

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h1 className="app-title">RootCause AI</h1>
        <p className="app-subtitle">upload — phase 1</p>

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

          {state.status === "error" && (
            <div className="status status-error">
              <p>error: {state.error}</p>
            </div>
          )}

          {(state.status === "uploaded" || state.status === "error") && (
            <button onClick={reset}>reset</button>
          )}
        </div>

        <PipelineStatus steps={steps} />
      </aside>

      <main className="log-column">
        <LogPanel entries={log} />
      </main>
    </div>
  );
}