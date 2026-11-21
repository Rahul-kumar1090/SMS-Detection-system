import { preprocessText } from './nlp';
import {
  MODEL_LABELS,
  type ConfusionMatrixData,
  type DatasetRecord,
  type EvaluatedTestSample,
  type FeatureVectorEntry,
  type MessageLabel,
  type ModelEvaluationResult,
  type ModelType,
  type PipelineConfig,
  type PredictionResult,
  type TokenContribution,
  type TrainedSuite,
} from '../types';

/**
 * Deterministic PRNG (Mulberry32) so train/test splits and optimization are reproducible
 */
function createSeededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWithSeed<T>(items: T[], rand: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Stratified Train-Test Split preserving Spam/Ham class balance
 */
function stratifiedSplit(
  records: DatasetRecord[],
  testSize: number,
  seed: number
): { train: DatasetRecord[]; test: DatasetRecord[] } {
  const rand = createSeededRandom(seed);
  const spam = shuffleWithSeed(
    records.filter((r) => r.label === 'Spam'),
    rand
  );
  const ham = shuffleWithSeed(
    records.filter((r) => r.label === 'Ham'),
    rand
  );

  const spamTestCount = Math.max(1, Math.min(spam.length - 1, Math.round(spam.length * testSize)));
  const hamTestCount = Math.max(1, Math.min(ham.length - 1, Math.round(ham.length * testSize)));

  const test = shuffleWithSeed(
    [...spam.slice(0, spamTestCount), ...ham.slice(0, hamTestCount)],
    rand
  );
  const train = shuffleWithSeed(
    [...spam.slice(spamTestCount), ...ham.slice(hamTestCount)],
    rand
  );

  return { train, test };
}

interface SparseVector {
  indices: number[];
  values: number[];
  tfs: number[];
}

interface FittedVectorizer {
  vocab: string[];
  vocabIndex: Map<string, number>;
  idf: Float64Array;
  transform: (features: string[]) => SparseVector;
}

/**
 * Fits a Bag-of-Words or TF-IDF Vectorizer strictly on the training corpus
 * to avoid data leakage into the test split.
 */
function fitVectorizer(
  trainFeatureLists: string[][],
  type: 'tfidf' | 'bow'
): FittedVectorizer {
  const docFreq = new Map<string, number>();

  for (const feats of trainFeatureLists) {
    const unique = new Set(feats);
    for (const term of unique) {
      docFreq.set(term, (docFreq.get(term) ?? 0) + 1);
    }
  }

  // Keep terms appearing in at least 1 document; prioritize informative vocabulary
  const vocab: string[] = [];
  const vocabIndex = new Map<string, number>();

  for (const [term, df] of docFreq.entries()) {
    // Exclude singleton bigrams to avoid overfitting on tiny splits while keeping unigrams
    if (term.includes('_') && df < 2) continue;
    vocabIndex.set(term, vocab.length);
    vocab.push(term);
  }

  const N = trainFeatureLists.length;
  const idf = new Float64Array(vocab.length);
  for (let i = 0; i < vocab.length; i++) {
    const df = docFreq.get(vocab[i]) ?? 1;
    // Smooth IDF matching scikit-learn TfidfVectorizer: log((1 + N) / (1 + df)) + 1
    idf[i] = type === 'tfidf' ? Math.log((1 + N) / (1 + df)) + 1 : 1;
  }

  const transform = (features: string[]): SparseVector => {
    const counts = new Map<number, number>();
    for (const term of features) {
      const idx = vocabIndex.get(term);
      if (idx !== undefined) {
        counts.set(idx, (counts.get(idx) ?? 0) + 1);
      }
    }

    const indices: number[] = [];
    const values: number[] = [];
    const tfs: number[] = [];
    let normSq = 0;

    for (const [idx, count] of counts.entries()) {
      const tf = type === 'tfidf' ? 1 + Math.log(count) : count;
      const val = tf * idf[idx];
      indices.push(idx);
      values.push(val);
      tfs.push(count);
      normSq += val * val;
    }

    // L2 normalization
    const norm = Math.sqrt(normSq);
    if (norm > 0) {
      for (let i = 0; i < values.length; i++) {
        values[i] /= norm;
      }
    }

    return { indices, values, tfs };
  };

  return { vocab, vocabIndex, idf, transform };
}

function sigmoid(z: number): number {
  if (z >= 0) {
    const ez = Math.exp(-z);
    return 1 / (1 + ez);
  }
  const ez = Math.exp(z);
  return ez / (1 + ez);
}

interface TrainedLinearClassifier {
  weights: Float64Array;
  bias: number;
  predictProba: (vec: SparseVector) => number;
  getTokenWeight: (idx: number) => number;
}

/**
 * 1. Multinomial Naive Bayes (with Laplace smoothing alpha = 1.0)
 * Uses log-likelihood ratio w_j = log P(j|Spam) - log P(j|Ham) so it cleanly
 * supports both calibrated probability output and per-token contribution inspection.
 */
function trainNaiveBayes(
  vectors: SparseVector[],
  labels: number[],
  vocabSize: number
): TrainedLinearClassifier {
  const alpha = 1.0;
  const spamCounts = new Float64Array(vocabSize);
  const hamCounts = new Float64Array(vocabSize);
  let spamTotal = 0;
  let hamTotal = 0;
  let spamDocs = 0;
  let hamDocs = 0;

  for (let i = 0; i < vectors.length; i++) {
    const vec = vectors[i];
    const isSpam = labels[i] === 1;
    if (isSpam) spamDocs++;
    else hamDocs++;

    for (let k = 0; k < vec.indices.length; k++) {
      const idx = vec.indices[k];
      // Use positive feature magnitude scaled slightly so TF-IDF / BoW weights carry cleanly
      const weight = vec.values[k] * 4.0;
      if (isSpam) {
        spamCounts[idx] += weight;
        spamTotal += weight;
      } else {
        hamCounts[idx] += weight;
        hamTotal += weight;
      }
    }
  }

  const logPriorSpam = Math.log((spamDocs + 1) / (vectors.length + 2));
  const logPriorHam = Math.log((hamDocs + 1) / (vectors.length + 2));
  const bias = logPriorSpam - logPriorHam;

  const weights = new Float64Array(vocabSize);
  const spamDenom = spamTotal + alpha * vocabSize;
  const hamDenom = hamTotal + alpha * vocabSize;

  for (let j = 0; j < vocabSize; j++) {
    const logPWordSpam = Math.log((spamCounts[j] + alpha) / spamDenom);
    const logPWordHam = Math.log((hamCounts[j] + alpha) / hamDenom);
    weights[j] = logPWordSpam - logPWordHam;
  }

  const predictProba = (vec: SparseVector): number => {
    let logOdds = bias;
    for (let k = 0; k < vec.indices.length; k++) {
      logOdds += weights[vec.indices[k]] * (vec.values[k] * 4.0);
    }
    return sigmoid(logOdds);
  };

  return {
    weights,
    bias,
    predictProba,
    getTokenWeight: (idx) => weights[idx],
  };
}

/**
 * 2. L2-Regularized Logistic Regression (Batch Gradient Descent)
 */
function trainLogisticRegression(
  vectors: SparseVector[],
  labels: number[],
  vocabSize: number
): TrainedLinearClassifier {
  const weights = new Float64Array(vocabSize);
  let bias = 0;

  const epochs = 180;
  const lr = 2.2;
  const lambda = 0.0015;
  const n = vectors.length;
  const gradW = new Float64Array(vocabSize);

  for (let epoch = 0; epoch < epochs; epoch++) {
    gradW.fill(0);
    let gradB = 0;

    for (let i = 0; i < n; i++) {
      const vec = vectors[i];
      let z = bias;
      for (let k = 0; k < vec.indices.length; k++) {
        z += weights[vec.indices[k]] * vec.values[k];
      }
      const err = sigmoid(z) - labels[i];
      gradB += err;
      for (let k = 0; k < vec.indices.length; k++) {
        gradW[vec.indices[k]] += err * vec.values[k];
      }
    }

    const step = lr / (1 + epoch * 0.005);
    bias -= (step * gradB) / n;
    for (let j = 0; j < vocabSize; j++) {
      weights[j] -= step * (gradW[j] / n + lambda * weights[j]);
    }
  }

  const predictProba = (vec: SparseVector): number => {
    let z = bias;
    for (let k = 0; k < vec.indices.length; k++) {
      z += weights[vec.indices[k]] * vec.values[k];
    }
    return sigmoid(z);
  };

  return {
    weights,
    bias,
    predictProba,
    getTokenWeight: (idx) => weights[idx],
  };
}

/**
 * 3. Linear Support Vector Machine (L2-Regularized Hinge Loss + Platt-style sigmoid scaling)
 */
function trainLinearSVM(
  vectors: SparseVector[],
  labels: number[],
  vocabSize: number
): TrainedLinearClassifier {
  const weights = new Float64Array(vocabSize);
  let bias = 0;

  const epochs = 180;
  const lr = 1.6;
  const lambda = 0.002;
  const n = vectors.length;
  const gradW = new Float64Array(vocabSize);

  for (let epoch = 0; epoch < epochs; epoch++) {
    gradW.fill(0);
    let gradB = 0;

    for (let i = 0; i < n; i++) {
      const vec = vectors[i];
      const y = labels[i] === 1 ? 1 : -1;
      let margin = bias;
      for (let k = 0; k < vec.indices.length; k++) {
        margin += weights[vec.indices[k]] * vec.values[k];
      }
      // Hinge loss subgradient when y * margin < 1
      if (y * margin < 1) {
        gradB -= y;
        for (let k = 0; k < vec.indices.length; k++) {
          gradW[vec.indices[k]] -= y * vec.values[k];
        }
      }
    }

    const step = lr / (1 + epoch * 0.01);
    bias -= (step * gradB) / n;
    for (let j = 0; j < vocabSize; j++) {
      weights[j] -= step * (gradW[j] / n + lambda * weights[j]);
    }
  }

  const predictProba = (vec: SparseVector): number => {
    let margin = bias;
    for (let k = 0; k < vec.indices.length; k++) {
      margin += weights[vec.indices[k]] * vec.values[k];
    }
    // Scale SVM signed margin into calibrated probability (0..1)
    return sigmoid(margin * 2.2);
  };

  return {
    weights,
    bias,
    predictProba,
    getTokenWeight: (idx) => weights[idx],
  };
}

function extractTopFeatures(
  weights: Float64Array,
  vocab: string[],
  limit = 12
): {
  topSpamFeatures: { term: string; weight: number }[];
  topHamFeatures: { term: string; weight: number }[];
} {
  const pairs: { term: string; weight: number }[] = [];
  for (let i = 0; i < vocab.length; i++) {
    pairs.push({ term: vocab[i], weight: weights[i] });
  }

  const sortedDesc = [...pairs].sort((a, b) => b.weight - a.weight);
  const topSpamFeatures = sortedDesc.filter((p) => p.weight > 0).slice(0, limit);

  const sortedAsc = [...pairs].sort((a, b) => a.weight - b.weight);
  const topHamFeatures = sortedAsc
    .filter((p) => p.weight < 0)
    .slice(0, limit)
    .map((p) => ({ term: p.term, weight: Math.abs(p.weight) }));

  return { topSpamFeatures, topHamFeatures };
}

function evaluateClassifier(
  modelType: ModelType,
  model: TrainedLinearClassifier,
  testRecords: DatasetRecord[],
  testVectors: SparseVector[],
  vocab: string[],
  threshold: number,
  trainingTimeMs: number
): ModelEvaluationResult {
  const samples: ConfusionMatrixData['samples'] = {
    tp: [],
    fp: [],
    fn: [],
    tn: [],
  };

  for (let i = 0; i < testRecords.length; i++) {
    const rec = testRecords[i];
    const prob = model.predictProba(testVectors[i]);
    const predicted: MessageLabel = prob >= threshold ? 'Spam' : 'Ham';
    const actual = rec.label;

    let quadrant: EvaluatedTestSample['quadrant'];
    if (actual === 'Spam' && predicted === 'Spam') quadrant = 'tp';
    else if (actual === 'Ham' && predicted === 'Spam') quadrant = 'fp';
    else if (actual === 'Spam' && predicted === 'Ham') quadrant = 'fn';
    else quadrant = 'tn';

    samples[quadrant].push({
      record: rec,
      predicted,
      spamProbability: prob,
      quadrant,
    });
  }

  const tp = samples.tp.length;
  const fp = samples.fp.length;
  const fn = samples.fn.length;
  const tn = samples.tn.length;
  const total = tp + fp + fn + tn;

  const accuracy = total > 0 ? (tp + tn) / total : 0;
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1Score =
    precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  const falsePositiveRate = fp + tn > 0 ? fp / (fp + tn) : 0;
  const specificity = tn + fp > 0 ? tn / (tn + fp) : 0;

  const { topSpamFeatures, topHamFeatures } = extractTopFeatures(
    model.weights,
    vocab,
    10
  );

  return {
    modelType,
    displayName: MODEL_LABELS[modelType],
    accuracy,
    precision,
    recall,
    f1Score,
    falsePositiveRate,
    specificity,
    confusionMatrix: { tp, fp, fn, tn, samples },
    topSpamFeatures,
    topHamFeatures,
    trainingTimeMs,
  };
}

/**
 * Trains the complete 3-model ML suite (Naive Bayes, Logistic Regression, Linear SVM)
 * following the exact Basic Working Flow in Section 1.3 & DFD Level 2:
 * Dataset -> Text Preprocessing -> Feature Extraction (TF-IDF/BoW) ->
 * Train-Test Split -> Model Training -> Model Testing -> Evaluation -> Prediction
 */
export function trainModelSuite(
  dataset: DatasetRecord[],
  config: PipelineConfig
): TrainedSuite {
  const { train, test } = stratifiedSplit(dataset, config.testSize, config.seed);

  const preprocessOpts = {
    removeStopwords: config.removeStopwords,
    applyStemming: config.applyStemming,
    useBigrams: config.useBigrams,
  };

  const trainFeatures = train.map((r) => preprocessText(r.text, preprocessOpts).finalFeatures);
  const testFeatures = test.map((r) => preprocessText(r.text, preprocessOpts).finalFeatures);

  const vectorizer = fitVectorizer(trainFeatures, config.vectorizer);

  const trainVectors = trainFeatures.map((f) => vectorizer.transform(f));
  const testVectors = testFeatures.map((f) => vectorizer.transform(f));
  const trainLabels = train.map((r) => (r.label === 'Spam' ? 1 : 0));

  const t0 = performance.now();
  const nbModel = trainNaiveBayes(trainVectors, trainLabels, vectorizer.vocab.length);
  const t1 = performance.now();
  const lrModel = trainLogisticRegression(trainVectors, trainLabels, vectorizer.vocab.length);
  const t2 = performance.now();
  const svmModel = trainLinearSVM(trainVectors, trainLabels, vectorizer.vocab.length);
  const t3 = performance.now();

  const models: Record<ModelType, TrainedLinearClassifier> = {
    naive_bayes: nbModel,
    logistic_regression: lrModel,
    svm: svmModel,
  };

  const evaluations: Record<ModelType, ModelEvaluationResult> = {
    naive_bayes: evaluateClassifier(
      'naive_bayes',
      nbModel,
      test,
      testVectors,
      vectorizer.vocab,
      config.decisionThreshold,
      Math.max(1, Math.round(t1 - t0))
    ),
    logistic_regression: evaluateClassifier(
      'logistic_regression',
      lrModel,
      test,
      testVectors,
      vectorizer.vocab,
      config.decisionThreshold,
      Math.max(1, Math.round(t2 - t1))
    ),
    svm: evaluateClassifier(
      'svm',
      svmModel,
      test,
      testVectors,
      vectorizer.vocab,
      config.decisionThreshold,
      Math.max(1, Math.round(t3 - t2))
    ),
  };

  const predict = (
    text: string,
    modelType: ModelType,
    overrideThreshold?: number
  ): PredictionResult => {
    const threshold = overrideThreshold ?? config.decisionThreshold;
    const steps = preprocessText(text, preprocessOpts);
    const vec = vectorizer.transform(steps.finalFeatures);
    const model = models[modelType];

    const spamProbability = model.predictProba(vec);
    const hamProbability = 1 - spamProbability;
    const label: MessageLabel = spamProbability >= threshold ? 'Spam' : 'Ham';
    const confidence =
      Math.round((label === 'Spam' ? spamProbability : hamProbability) * 1000) / 10;

    const vectorEntries: FeatureVectorEntry[] = vec.indices
      .map((idx, pos) => ({
        term: vectorizer.vocab[idx],
        value: vec.values[pos],
        tf: vec.tfs[pos],
        idf: vectorizer.idf[idx],
      }))
      .sort((a, b) => b.value - a.value);

    const contributions: TokenContribution[] = vec.indices
      .map((idx, pos) => {
        const w = model.getTokenWeight(idx);
        const fv = vec.values[pos];
        const scale = modelType === 'naive_bayes' ? 4.0 : 1.0;
        return {
          term: vectorizer.vocab[idx],
          weight: w,
          featureValue: fv,
          contribution: w * fv * scale,
        };
      })
      .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

    return {
      label,
      spamProbability,
      hamProbability,
      confidence,
      modelType,
      vectorizer: config.vectorizer,
      threshold,
      steps,
      vectorEntries,
      contributions,
    };
  };

  return {
    config,
    vocabularySize: vectorizer.vocab.length,
    trainCount: train.length,
    testCount: test.length,
    trainSpamCount: train.filter((r) => r.label === 'Spam').length,
    trainHamCount: train.filter((r) => r.label === 'Ham').length,
    testSpamCount: test.filter((r) => r.label === 'Spam').length,
    testHamCount: test.filter((r) => r.label === 'Ham').length,
    trainedAt: new Date().toISOString(),
    evaluations,
    predict,
  };
}
