import { ScoringConfig, BackgroundJobConfig } from './types.js';

/**
 * Default configuration for the Community Notes scoring algorithm
 * Based on Twitter's Community Notes implementation
 */
export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  // Matrix factorization learning parameters
  initLearningRate: 0.2,
  noInitLearningRate: 1.0,
  convergence: 1e-7,
  numFactors: 1,
  useGlobalIntercept: true,

  // Regularization parameters (from Twitter's implementation)
  userFactorLambda: 0.03,
  noteFactorLambda: 0.03,
  userInterceptLambda: 0.03 * 5, // 0.15
  noteInterceptLambda: 0.03 * 5, // 0.15
  globalInterceptLambda: 0.03 * 5, // 0.15
  diamondLambda: 0,

  // Note status thresholds
  crhThreshold: 0.40, // Currently Rated Helpful threshold
  nrhThreshold: -0.05, // Not Rated Helpful threshold

  // Volume and time requirements
  minRatingsForStatus: 5, // Minimum ratings before note can get status
  maxDaysForScoring: 30, // Only score notes from last 30 days
  minRatingsForHelpfulness: 3, // Minimum ratings for helpfulness calculation

  // Background job configuration
  scoringIntervalMinutes: 60, // Run scoring every hour
  batchSize: 1000, // Process notes in batches of 1000
};

export const BACKGROUND_JOB_CONFIG: BackgroundJobConfig = {
  enabled: true,
  intervalMinutes: DEFAULT_SCORING_CONFIG.scoringIntervalMinutes,
  batchSize: DEFAULT_SCORING_CONFIG.batchSize,
  maxRetries: 3,
  retryDelayMs: 5000, // 5 second delay between retries
  timeoutMs: 300000, // 5 minute timeout for scoring jobs
};

/**
 * Helpfulness score thresholds for different trust levels
 */
export const HELPFULNESS_THRESHOLDS = {
  NEWCOMER_TO_CONTRIBUTOR: 10.0,
  CONTRIBUTOR_TO_TRUSTED: 50.0,
  POOR_PERFORMANCE: -5.0, // Below this, user may lose trust level
} as const;

/**
 * Constants for matrix factorization algorithm
 */
export const MATRIX_FACTORIZATION_CONSTANTS = {
  MAX_ITERATIONS: 1000,
  EARLY_STOPPING_PATIENCE: 10,
  MIN_IMPROVEMENT: 1e-6,
  WEIGHT_DECAY: 0.0001,
  GRADIENT_CLIP_VALUE: 5.0,
} as const;

/**
 * Note status decision rules
 */
export const NOTE_STATUS_RULES = {
  // Minimum time before a note can be locked (14 days in milliseconds)
  NOTE_LOCK_TIME_MS: 14 * 24 * 60 * 60 * 1000,

  // Minimum stable time for CRH status (48 hours)
  MIN_STABLE_CRH_TIME_MS: 48 * 60 * 60 * 1000,

  // Maximum churn rates for different scenarios
  MAX_CRH_CHURN_RATE: 0.3,
  MAX_NEW_NOTES_CHURN_RATE: 0.15,
  MAX_OLD_NOTES_CHURN_RATE: 0.12,
} as const;

/**
 * User contribution scoring weights
 */
export const CONTRIBUTION_WEIGHTS = {
  SUCCESSFUL_HELPFUL_RATING: 1.0,
  SUCCESSFUL_NOT_HELPFUL_RATING: 1.0,
  UNSUCCESSFUL_RATING: -0.5,
  NOTE_AUTHOR_BONUS: 2.0, // Extra points for authoring helpful notes
  EARLY_RATER_BONUS: 1.5, // Bonus for rating notes early
} as const;

/**
 * Classification types for community notes
 */
export const NOTE_CLASSIFICATIONS = {
  MISLEADING: 'misleading',
  LACKING_CONTEXT: 'lacking-context',
  DISPUTED: 'disputed',
  UNSUBSTANTIATED: 'unsubstantiated',
} as const;

/**
 * Environment-specific overrides
 */
export function getScoringConfig(): ScoringConfig {
  const config = { ...DEFAULT_SCORING_CONFIG };

  // Override with environment variables if present
  if (process.env.SCORING_CRH_THRESHOLD) {
    config.crhThreshold = parseFloat(process.env.SCORING_CRH_THRESHOLD);
  }

  if (process.env.SCORING_NRH_THRESHOLD) {
    config.nrhThreshold = parseFloat(process.env.SCORING_NRH_THRESHOLD);
  }

  if (process.env.SCORING_MIN_RATINGS) {
    config.minRatingsForStatus = parseInt(process.env.SCORING_MIN_RATINGS, 10);
  }

  if (process.env.SCORING_INTERVAL_MINUTES) {
    config.scoringIntervalMinutes = parseInt(process.env.SCORING_INTERVAL_MINUTES, 10);
  }

  return config;
}

export function getBackgroundJobConfig(): BackgroundJobConfig {
  const config = { ...BACKGROUND_JOB_CONFIG };

  // Override with environment variables
  if (process.env.SCORING_JOB_ENABLED) {
    config.enabled = process.env.SCORING_JOB_ENABLED === 'true';
  }

  if (process.env.SCORING_JOB_INTERVAL) {
    config.intervalMinutes = parseInt(process.env.SCORING_JOB_INTERVAL, 10);
  }

  if (process.env.SCORING_BATCH_SIZE) {
    config.batchSize = parseInt(process.env.SCORING_BATCH_SIZE, 10);
  }

  return config;
}