export type MessageSource = 'Email' | 'SMS';

export type MessageLabel = 'Spam' | 'Ham';

export type ModelType = 'naive_bayes' | 'logistic_regression' | 'svm';

export type VectorizerType = 'tfidf' | 'bow';

export type NavSection =
  | 'classifier'
  | 'evaluation'
  | 'dataset'
  | 'database'
  | 'architecture';

export interface DatasetRecord {
  id: string;
  text: string;
  source: MessageSource;
  label: MessageLabel;
}

/**
 * Matches Section 2.4 Database Design (Table 2.1 – Message Table) in the synopsis
 */
export interface MessageTableRecord {
  Message_ID: string;
  Message_Text: string;
  Source: MessageSource;
  Date_Received: string;
  Label: MessageLabel;
  Prediction_Confidence: number; // 0 to 100
  Model_Used: ModelType;
  Vectorizer_Used: VectorizerType;
  User_Verified?: MessageLabel | null;
}

export interface PipelineConfig {
  vectorizer: VectorizerType;
  testSize: number; // e.g., 0.2 for 80/20 split
  removeStopwords: boolean;
  applyStemming: boolean;
  useBigrams: boolean;
  decisionThreshold: number; // 0.25 to 0.85
  seed: number;
}

export interface TextSignals {
  charCount: number;
  wordCount: number;
  uppercaseRatio: number;
  urlCount: number;
  exclamationCount: number;
  currencyCount: number;
  digitRatio: number;
}

export interface PreprocessingSteps {
  raw: string;
  lowercased: string;
  cleaned: string;
  tokens: string[];
  withoutStopwords: string[];
  stemmed: string[];
  finalFeatures: string[];
  signals: TextSignals;
}

export interface FeatureVectorEntry {
  term: string;
  value: number;
  tf: number;
  idf: number;
}

export interface TokenContribution {
  term: string;
  weight: number; // positive => pushes toward Spam, negative => pushes toward Ham
  featureValue: number;
  contribution: number;
}

export interface PredictionResult {
  label: MessageLabel;
  spamProbability: number; // 0 to 1
  hamProbability: number; // 0 to 1
  confidence: number; // 0 to 100
  modelType: ModelType;
  vectorizer: VectorizerType;
  threshold: number;
  steps: PreprocessingSteps;
  vectorEntries: FeatureVectorEntry[];
  contributions: TokenContribution[];
}

export interface EvaluatedTestSample {
  record: DatasetRecord;
  predicted: MessageLabel;
  spamProbability: number;
  quadrant: 'tp' | 'fp' | 'fn' | 'tn';
}

export interface ConfusionMatrixData {
  tp: number; // Actual Spam, Predicted Spam
  fp: number; // Actual Ham, Predicted Spam
  fn: number; // Actual Spam, Predicted Ham
  tn: number; // Actual Ham, Predicted Ham
  samples: {
    tp: EvaluatedTestSample[];
    fp: EvaluatedTestSample[];
    fn: EvaluatedTestSample[];
    tn: EvaluatedTestSample[];
  };
}

export interface ModelEvaluationResult {
  modelType: ModelType;
  displayName: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  falsePositiveRate: number;
  specificity: number;
  confusionMatrix: ConfusionMatrixData;
  topSpamFeatures: { term: string; weight: number }[];
  topHamFeatures: { term: string; weight: number }[];
  trainingTimeMs: number;
}

export interface TrainedSuite {
  config: PipelineConfig;
  vocabularySize: number;
  trainCount: number;
  testCount: number;
  trainSpamCount: number;
  trainHamCount: number;
  testSpamCount: number;
  testHamCount: number;
  trainedAt: string;
  evaluations: Record<ModelType, ModelEvaluationResult>;
  predict: (text: string, modelType: ModelType, threshold?: number) => PredictionResult;
}

export const MODEL_LABELS: Record<ModelType, string> = {
  naive_bayes: 'Multinomial Naive Bayes',
  logistic_regression: 'Logistic Regression',
  svm: 'Support Vector Machine',
};

export const MODEL_SHORT_LABELS: Record<ModelType, string> = {
  naive_bayes: 'Naive Bayes',
  logistic_regression: 'Logistic Regression',
  svm: 'Linear SVM',
};
