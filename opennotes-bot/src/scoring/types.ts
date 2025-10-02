/**
 * Type definitions for the Community Notes scoring system
 */

export interface ScoringConfig {
  // Matrix factorization parameters
  initLearningRate: number;
  noInitLearningRate: number;
  convergence: number;
  numFactors: number;
  useGlobalIntercept: boolean;

  // Regularization parameters
  userFactorLambda: number;
  noteFactorLambda: number;
  userInterceptLambda: number;
  noteInterceptLambda: number;
  globalInterceptLambda: number;
  diamondLambda: number;

  // Scoring thresholds
  crhThreshold: number;
  nrhThreshold: number;

  // Time and volume thresholds
  minRatingsForStatus: number;
  maxDaysForScoring: number;
  minRatingsForHelpfulness: number;

  // Background job settings
  scoringIntervalMinutes: number;
  batchSize: number;
}

export interface NoteData {
  noteId: string;
  messageId: string;
  authorId: string;
  content: string;
  classification: string;
  submittedAt: Date;
  status: NoteStatus;
  helpfulCount: number;
  notHelpfulCount: number;
  totalRatings: number;
  helpfulnessRatio: number;
  visibilityScore: number;
  isVisible: boolean;
}

export interface RatingData {
  ratingId: string;
  noteId: string;
  raterId: string;
  helpful: boolean;
  reason?: string;
  timestamp: Date;
  weight: number;
}

export interface UserScoringData {
  userId: string;
  discordId: string;
  helpfulnessScore: number;
  trustLevel: string;
  totalNotes: number;
  totalRatings: number;

  // Matrix factorization parameters
  raterIntercept?: number;
  raterFactor1?: number;

  // Contribution metrics
  successfulRatings: number;
  unsuccessfulRatings: number;
  agreementRatio: number;
}

export interface MatrixFactorizationData {
  userIndexes: number[];
  noteIndexes: number[];
  ratingLabels: number[];
  userIdMap: Map<string, number>;
  noteIdMap: Map<string, number>;
}

export interface MatrixFactorizationResult {
  noteParams: Map<string, NoteParameters>;
  userParams: Map<string, UserParameters>;
  globalIntercept: number;
  convergenceReached: boolean;
  iterations: number;
  finalLoss: number;
}

export interface NoteParameters {
  noteId: string;
  noteIntercept: number;
  noteFactor1: number;
  noteIndex: number;
}

export interface UserParameters {
  userId: string;
  userIntercept: number;
  userFactor1: number;
  userIndex: number;
}

export interface ScoringResult {
  noteScores: Map<string, NoteScore>;
  userScores: Map<string, UserScore>;
  timestamp: Date;
  algorithmVersion: string;
}

export interface NoteScore {
  noteId: string;
  score: number;
  status: NoteStatus;
  confidence: number;

  // Matrix factorization outputs
  noteIntercept: number;
  noteFactor1: number;

  // Aggregated metrics
  helpfulRatings: number;
  notHelpfulRatings: number;
  totalRatings: number;
  helpfulnessRatio: number;

  // Decision factors
  decidedBy: string;
  activeRules: string[];
}

export interface UserScore {
  userId: string;
  helpfulnessScore: number;
  trustLevel: string;

  // Matrix factorization outputs
  userIntercept: number;
  userFactor1: number;

  // Performance metrics
  successfulRatings: number;
  unsuccessfulRatings: number;
  agreementRatio: number;
  meanNoteScore: number;

  // Reputation indicators
  aboveHelpfulnessThreshold: boolean;
  isEmergingContributor: boolean;
}

export enum NoteStatus {
  PENDING = 'pending',
  CURRENTLY_RATED_HELPFUL = 'crh',
  CURRENTLY_RATED_NOT_HELPFUL = 'nrh',
  NEEDS_MORE_RATINGS = 'needs-more-ratings'
}

export enum TrustLevel {
  NEWCOMER = 'newcomer',
  CONTRIBUTOR = 'contributor',
  TRUSTED = 'trusted'
}

export interface HelpfulnessMetrics {
  totalHelpfulRatings: number;
  totalNotHelpfulRatings: number;
  successfulHelpfulRatings: number;
  successfulNotHelpfulRatings: number;
  unsuccessfulHelpfulRatings: number;
  unsuccessfulNotHelpfulRatings: number;
  averageNoteScore: number;
  agreementRatio: number;
}

export interface ScoringJobResult {
  processedNotes: number;
  processedUsers: number;
  statusChanges: number;
  helpfulnessUpdates: number;
  errors: string[];
  processingTimeMs: number;
}

export interface BackgroundJobConfig {
  enabled: boolean;
  intervalMinutes: number;
  batchSize: number;
  maxRetries: number;
  retryDelayMs: number;
  timeoutMs: number;
}