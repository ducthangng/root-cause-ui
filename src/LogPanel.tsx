import { useEffect, useRef } from "react";

export interface LogEntry {
  timestamp: string; // HH:MM:SS
  message: string;
  level: "info" | "success" | "error";
}

export function makeLogEntry(
  message: string,
  level: LogEntry["level"] = "info"
): LogEntry {
  return {
    timestamp: new Date().toLocaleTimeString("en-GB"), // HH:MM:SS, 24h
    message,
    level,
  };
}

interface LogPanelProps {
  entries: LogEntry[];
}

export function LogPanel({ entries }: LogPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [entries.length]);

  return (
    <div className="log-panel">
      <div className="log-panel-header">log</div>
      <div className="log-panel-body">
        {entries.length === 0 && (
          <div className="log-line log-info">waiting for activity…</div>
        )}
        {entries.map((entry, i) => (
          <div key={i} className={`log-line log-${entry.level}`}>
            <span className="log-timestamp">[{entry.timestamp}]</span>{" "}
            {entry.message}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}