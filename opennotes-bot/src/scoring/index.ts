/**
 * Community Notes Scoring System
 *
 * This module implements the Community Notes scoring algorithm adapted for Discord,
 * including matrix factorization, contributor helpfulness scoring, and automated
 * background processing.
 */

export { ScoringService } from './scoringService.js';
export { MatrixFactorization } from './matrixFactorization.js';
export { HelpfulnessCalculator } from './helpfulnessCalculator.js';
export { ScoringBackgroundJob, getScoringJob, initializeScoringJob } from './backgroundJob.js';
export { RequestorScoringService } from './requestorScoringService.js';

export {
  getScoringConfig,
  getBackgroundJobConfig,
  DEFAULT_SCORING_CONFIG,
  BACKGROUND_JOB_CONFIG,
  HELPFULNESS_THRESHOLDS,
  MATRIX_FACTORIZATION_CONSTANTS,
  NOTE_STATUS_RULES,
  CONTRIBUTION_WEIGHTS,
  NOTE_CLASSIFICATIONS,
} from './config.js';

export type {
  ScoringConfig,
  BackgroundJobConfig,
  NoteData,
  RatingData,
  UserScoringData,
  MatrixFactorizationData,
  MatrixFactorizationResult,
  NoteParameters,
  UserParameters,
  ScoringResult,
  NoteScore,
  UserScore,
  HelpfulnessMetrics,
  ScoringJobResult,
} from './types.js';

export type {
  RequestorMetrics,
  RequestorScoringConfig,
} from './requestorScoringService.js';

export { RequestorHelpfulnessLevel } from './requestorScoringService.js';

export { NoteStatus, TrustLevel } from './types.js';

// Create service instances
import { ScoringService } from './scoringService.js';
import { RequestorScoringService } from './requestorScoringService.js';
import { getScoringConfig } from './config.js';

export const scoringService = new ScoringService(getScoringConfig());
export const requestorScoringService = new RequestorScoringService();