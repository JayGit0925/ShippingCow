export type Tier = 'calf' | 'cow' | 'bull';

export type Capability =
  | 'mooovy_turns'
  | 'csv_parses'
  | 'forecasting_horizon_days'
  | 'watchlist_topics'
  | 'workspace_editing'
  | 'health_score_detail'
  | 'seats'
  | 'history_depth_months'
  | 'export_formats'
  | 'file_upload_size_mb'
  | 'file_uploads_per_month'
  | 'storage_retention_days'
  | 'silo_file_parses_per_month';

export type QuotaValue = number | 'unlimited';

export type TierLimits = Record<Capability, Record<Tier, QuotaValue>>;

export interface CapabilityCheckResult {
  allowed: boolean;
  limit: QuotaValue;
  used?: number;
  remaining?: number | 'unlimited';
}

export class TierViolationError extends Error {
  constructor(
    message: string,
    public readonly capability: Capability,
    public readonly tier: Tier,
    public readonly limit: QuotaValue
  ) {
    super(message);
    this.name = 'TierViolationError';
  }
}
