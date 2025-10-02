import { logger } from '../shared/utils/logger.js';
import {
  MatrixFactorizationData,
  MatrixFactorizationResult,
  NoteParameters,
  UserParameters,
  ScoringConfig
} from './types.js';
import { MATRIX_FACTORIZATION_CONSTANTS } from './config.js';

/**
 * Matrix Factorization implementation for Community Notes scoring
 * Ported from Twitter's Python implementation
 */
export class MatrixFactorization {
  private config: ScoringConfig;
  private userFactors: number[][];
  private noteFactors: number[][];
  private userIntercepts: number[];
  private noteIntercepts: number[];
  private globalIntercept: number;
  private numUsers: number;
  private numNotes: number;

  constructor(config: ScoringConfig) {
    this.config = config;
    this.globalIntercept = 0.0;
    this.numUsers = 0;
    this.numNotes = 0;
    this.userFactors = [];
    this.noteFactors = [];
    this.userIntercepts = [];
    this.noteIntercepts = [];
  }

  /**
   * Run matrix factorization on the provided data
   */
  async runMatrixFactorization(data: MatrixFactorizationData): Promise<MatrixFactorizationResult> {
    logger.info('Starting matrix factorization', {
      numRatings: data.ratingLabels.length,
      numUsers: data.userIdMap.size,
      numNotes: data.noteIdMap.size,
    });

    this.numUsers = data.userIdMap.size;
    this.numNotes = data.noteIdMap.size;

    // Initialize parameters
    this.initializeParameters();

    // Run gradient descent
    const { iterations, finalLoss, convergenceReached } = await this.fitModel(data);

    // Extract parameters
    const noteParams = this.extractNoteParameters(data.noteIdMap);
    const userParams = this.extractUserParameters(data.userIdMap);

    logger.info('Matrix factorization completed', {
      iterations,
      finalLoss,
      convergenceReached,
      globalIntercept: this.globalIntercept,
    });

    return {
      noteParams,
      userParams,
      globalIntercept: this.globalIntercept,
      convergenceReached,
      iterations,
      finalLoss,
    };
  }

  /**
   * Initialize model parameters with small random values
   */
  private initializeParameters(): void {
    // Initialize user parameters
    this.userFactors = Array(this.numUsers).fill(0).map(() =>
      Array(this.config.numFactors).fill(0).map(() => (Math.random() - 0.5) * 0.1)
    );
    this.userIntercepts = Array(this.numUsers).fill(0).map(() => (Math.random() - 0.5) * 0.1);

    // Initialize note parameters
    this.noteFactors = Array(this.numNotes).fill(0).map(() =>
      Array(this.config.numFactors).fill(0).map(() => (Math.random() - 0.5) * 0.1)
    );
    this.noteIntercepts = Array(this.numNotes).fill(0).map(() => (Math.random() - 0.5) * 0.1);

    // Initialize global intercept
    if (this.config.useGlobalIntercept) {
      this.globalIntercept = 0.0;
    }
  }

  /**
   * Fit the model using gradient descent
   */
  private async fitModel(data: MatrixFactorizationData): Promise<{
    iterations: number;
    finalLoss: number;
    convergenceReached: boolean;
  }> {
    let prevLoss = Infinity;
    let currentLoss = this.computeLoss(data);
    let iterations = 0;
    let convergenceReached = false;

    const learningRate = this.config.initLearningRate;

    while (
      iterations < MATRIX_FACTORIZATION_CONSTANTS.MAX_ITERATIONS &&
      Math.abs(currentLoss - prevLoss) > this.config.convergence &&
      !(iterations > 100 && currentLoss > prevLoss)
    ) {
      prevLoss = currentLoss;

      // Compute gradients and update parameters
      this.gradientDescentStep(data, learningRate);

      // Compute new loss
      currentLoss = this.computeLoss(data);

      if (iterations % 20 === 0) {
        logger.debug('Matrix factorization progress', {
          iteration: iterations,
          loss: currentLoss,
          improvement: prevLoss - currentLoss,
        });
      }

      iterations++;
    }

    convergenceReached = Math.abs(currentLoss - prevLoss) <= this.config.convergence;

    return {
      iterations,
      finalLoss: currentLoss,
      convergenceReached,
    };
  }

  /**
   * Perform one gradient descent step
   */
  private gradientDescentStep(data: MatrixFactorizationData, learningRate: number): void {
    const { userIndexes, noteIndexes, ratingLabels } = data;

    // Compute gradients for all ratings
    for (let i = 0; i < ratingLabels.length; i++) {
      const userIdx = userIndexes[i];
      const noteIdx = noteIndexes[i];
      const rating = ratingLabels[i];

      // Predict rating
      const prediction = this.predict(userIdx, noteIdx);
      const error = rating - prediction;

      // Update user parameters
      const userFactorGrad = error * this.noteFactors[noteIdx][0] -
                            this.config.userFactorLambda * this.userFactors[userIdx][0];
      const userInterceptGrad = error - this.config.userInterceptLambda * this.userIntercepts[userIdx];

      this.userFactors[userIdx][0] += learningRate * userFactorGrad;
      this.userIntercepts[userIdx] += learningRate * userInterceptGrad;

      // Update note parameters
      const noteFactorGrad = error * this.userFactors[userIdx][0] -
                            this.config.noteFactorLambda * this.noteFactors[noteIdx][0];
      const noteInterceptGrad = error - this.config.noteInterceptLambda * this.noteIntercepts[noteIdx];

      this.noteFactors[noteIdx][0] += learningRate * noteFactorGrad;
      this.noteIntercepts[noteIdx] += learningRate * noteInterceptGrad;

      // Update global intercept
      if (this.config.useGlobalIntercept) {
        const globalInterceptGrad = error - this.config.globalInterceptLambda * this.globalIntercept;
        this.globalIntercept += learningRate * globalInterceptGrad;
      }
    }
  }

  /**
   * Predict a rating for a user-note pair
   */
  private predict(userIdx: number, noteIdx: number): number {
    let prediction = this.userIntercepts[userIdx] + this.noteIntercepts[noteIdx];

    if (this.config.useGlobalIntercept) {
      prediction += this.globalIntercept;
    }

    // Add factor interactions
    for (let f = 0; f < this.config.numFactors; f++) {
      prediction += this.userFactors[userIdx][f] * this.noteFactors[noteIdx][f];
    }

    return prediction;
  }

  /**
   * Compute the total loss (including regularization)
   */
  private computeLoss(data: MatrixFactorizationData): number {
    const { userIndexes, noteIndexes, ratingLabels } = data;

    // Prediction loss
    let predictionLoss = 0;
    for (let i = 0; i < ratingLabels.length; i++) {
      const userIdx = userIndexes[i];
      const noteIdx = noteIndexes[i];
      const rating = ratingLabels[i];
      const prediction = this.predict(userIdx, noteIdx);
      const error = rating - prediction;
      predictionLoss += error * error;
    }
    predictionLoss /= ratingLabels.length;

    // Regularization loss
    let regularizationLoss = 0;

    // User regularization
    for (let u = 0; u < this.numUsers; u++) {
      regularizationLoss += this.config.userInterceptLambda *
                           this.userIntercepts[u] * this.userIntercepts[u];
      for (let f = 0; f < this.config.numFactors; f++) {
        regularizationLoss += this.config.userFactorLambda *
                             this.userFactors[u][f] * this.userFactors[u][f];
      }
    }

    // Note regularization
    for (let n = 0; n < this.numNotes; n++) {
      regularizationLoss += this.config.noteInterceptLambda *
                           this.noteIntercepts[n] * this.noteIntercepts[n];
      for (let f = 0; f < this.config.numFactors; f++) {
        regularizationLoss += this.config.noteFactorLambda *
                             this.noteFactors[n][f] * this.noteFactors[n][f];
      }
    }

    // Global intercept regularization
    if (this.config.useGlobalIntercept) {
      regularizationLoss += this.config.globalInterceptLambda *
                           this.globalIntercept * this.globalIntercept;
    }

    return predictionLoss + regularizationLoss;
  }

  /**
   * Extract note parameters with factor identification
   */
  private extractNoteParameters(noteIdMap: Map<string, number>): Map<string, NoteParameters> {
    const noteParams = new Map<string, NoteParameters>();

    for (const [noteId, noteIdx] of noteIdMap) {
      noteParams.set(noteId, {
        noteId,
        noteIntercept: this.noteIntercepts[noteIdx],
        noteFactor1: this.noteFactors[noteIdx][0],
        noteIndex: noteIdx,
      });
    }

    return noteParams;
  }

  /**
   * Extract user parameters with factor identification
   */
  private extractUserParameters(userIdMap: Map<string, number>): Map<string, UserParameters> {
    const userParams = new Map<string, UserParameters>();

    for (const [userId, userIdx] of userIdMap) {
      userParams.set(userId, {
        userId,
        userIntercept: this.userIntercepts[userIdx],
        userFactor1: this.userFactors[userIdx][0],
        userIndex: userIdx,
      });
    }

    return userParams;
  }

  /**
   * Flip factors for identification if needed
   * Ensures the larger group of raters gets negative factors
   */
  private flipFactorsForIdentification(userParams: Map<string, UserParameters>): void {
    const userFactors = Array.from(userParams.values()).map(p => p.userFactor1);
    const negativeFactors = userFactors.filter(f => f < 0).length;
    const totalFactors = userFactors.filter(f => f !== 0).length;
    const propNegative = negativeFactors / totalFactors;

    if (propNegative < 0.5) {
      // Flip all factors
      for (const params of userParams.values()) {
        params.userFactor1 *= -1;
      }

      for (let n = 0; n < this.numNotes; n++) {
        this.noteFactors[n][0] *= -1;
      }
    }
  }
}