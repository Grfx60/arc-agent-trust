CREATE TABLE IF NOT EXISTS agent_reports (
  id BIGSERIAL PRIMARY KEY,
  agent_id VARCHAR(78) NOT NULL,
  report_version TEXT NOT NULL,
  analyzed_at TIMESTAMPTZ NOT NULL,
  report JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (agent_id, report_version, analyzed_at)
);

CREATE INDEX IF NOT EXISTS agent_reports_agent_time_idx
  ON agent_reports (agent_id, analyzed_at DESC);
