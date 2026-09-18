export type StepState = "pending" | "in-progress" | "done" | "error";

export interface PipelineStep {
  id: string;
  label: string;
  state: StepState;
}

// Static definition of the 7 pipeline stages. Only step 1 (upload) is
// wired to real state today. Steps 2-7 run in AWS infra that isn't built
// yet, so their state here is a placeholder until an orchestrator
// (proposed: Step Functions) exposes real execution status via an API
// this UI can poll.
export const PIPELINE_STEPS: PipelineStep[] = [
  { id: "upload", label: "Upload file", state: "pending" },
  { id: "clean", label: "Lambda: clean raw data", state: "pending" },
  { id: "clean-to-s3", label: "Write cleaned data to S3", state: "pending" },
  { id: "sagemaker", label: "SageMaker Processing Job", state: "pending" },
  { id: "embed", label: "EC2: embed vectors", state: "pending" },
  { id: "result-to-s3", label: "Write result CSV to S3", state: "pending" },
  { id: "db-load", label: "Backend: queue S3 -> DB load", state: "pending" },
];

function marker(state: StepState): string {
  switch (state) {
    case "done":
      return "x";
    case "in-progress":
      return "o";
    case "error":
      return "!";
    default:
      return "-";
  }
}

interface PipelineStatusProps {
  steps: PipelineStep[];
}

export function PipelineStatus({ steps }: PipelineStatusProps) {
  return (
    <div className="pipeline-status">
      <div className="pipeline-header">pipeline</div>
      <ol className="pipeline-list">
        {steps.map((step, i) => (
          <li key={step.id} className={`pipeline-item pipeline-${step.state}`}>
            <span className="pipeline-marker-col">
              <span className="pipeline-marker">[{marker(step.state)}]</span>
              {i < steps.length - 1 && <span className="pipeline-connector" />}
            </span>
            <span className="pipeline-label">{step.label}</span>
          </li>
        ))}
      </ol>
      <p className="pipeline-note">
        steps 2-7 are not wired to real status yet — no orchestrator
        deployed
      </p>
    </div>
  );
}