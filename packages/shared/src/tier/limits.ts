import type { TierLimits } from '../types/tier';

export const TIER_LIMITS: TierLimits = {
  mooovy_turns:            { calf: 20,     cow: 200,          bull: 'unlimited' },
  csv_parses:              { calf: 5,      cow: 'unlimited',  bull: 'unlimited' },
  forecasting_horizon_days: { calf: 30,    cow: 90,           bull: 365 },
  watchlist_topics:        { calf: 5,      cow: 20,           bull: 'unlimited' },
  workspace_editing:       { calf: 0,      cow: 1,            bull: 1 },
  health_score_detail:     { calf: 0,      cow: 1,            bull: 1 },
  seats:                   { calf: 1,      cow: 5,            bull: 'unlimited' },
  history_depth_months:    { calf: 1,      cow: 12,           bull: 'unlimited' },
  export_formats:          { calf: 0,      cow: 2,            bull: 3 },
  file_upload_size_mb:     { calf: 25,     cow: 100,          bull: 500 },
  file_uploads_per_month:  { calf: 3,      cow: 'unlimited',  bull: 'unlimited' },
  storage_retention_days:  { calf: 30,     cow: 365,          bull: 'unlimited' },
  silo_file_parses_per_month: { calf: 0,   cow: 25,           bull: 'unlimited' },
};
