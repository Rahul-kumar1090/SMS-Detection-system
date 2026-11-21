import React, { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { RefreshCw } from 'lucide-react';
import {
  MODEL_LABELS,
  MODEL_SHORT_LABELS,
  type ModelType,
  type PipelineConfig,
  type TrainedSuite,
  type VectorizerType,
} from '../types';

interface ModelEvaluationViewProps {
  suite: TrainedSuite;
  config: PipelineConfig;
  activeModel: ModelType;
  onSelectModel: (model: ModelType) => void;
  onUpdateConfig: (next: PipelineConfig) => void;
}

type QuadrantKey = 'tp' | 'fp' | 'fn' | 'tn';

const QUADRANT_INFO: Record<QuadrantKey, { title: string; subtitle: string; tone: string }> = {
  tp: {
    title: 'True Positives (TP)',
    subtitle: 'Actual Spam correctly predicted as Spam',
    tone: 'text-emerald-800 bg-emerald-50 border-emerald-200',
  },
  fp: {
    title: 'False Positives (FP)',
    subtitle: 'Legitimate Ham wrongly flagged as Spam',
    tone: 'text-red-800 bg-red-50 border-red-200',
  },
  fn: {
    title: 'False Negatives (FN)',
    subtitle: 'Actual Spam missed and marked as Ham',
    tone: 'text-amber-800 bg-amber-50 border-amber-200',
  },
  tn: {
    title: 'True Negatives (TN)',
    subtitle: 'Legitimate Ham correctly predicted as Ham',
    tone: 'text-emerald-800 bg-emerald-50 border-emerald-200',
  },
};

export const ModelEvaluationView: React.FC<ModelEvaluationViewProps> = ({
  suite,
  config,
  activeModel,
  onSelectModel,
  onUpdateConfig,
}) => {
  const [selectedQuadrant, setSelectedQuadrant] = useState<QuadrantKey>('tp');

  const activeEval = suite.evaluations[activeModel];
  const cm = activeEval.confusionMatrix;
  const inspectedSamples = cm.samples[selectedQuadrant];

  const comparisonChartData = (
    ['naive_bayes', 'logistic_regression', 'svm'] as ModelType[]
  ).map((m) => {
    const ev = suite.evaluations[m];
    return {
      model: MODEL_SHORT_LABELS[m],
      Accuracy: Number((ev.accuracy * 100).toFixed(1)),
      Precision: Number((ev.precision * 100).toFixed(1)),
      Recall: Number((ev.recall * 100).toFixed(1)),
      'F1-Score': Number((ev.f1Score * 100).toFixed(1)),
    };
  });

  const handleSplitChange = (testSize: number) => {
    onUpdateConfig({ ...config, testSize });
  };

  const handleVectorizerChange = (vectorizer: VectorizerType) => {
    onUpdateConfig({ ...config, vectorizer });
  };

  const handleThresholdChange = (decisionThreshold: number) => {
    onUpdateConfig({ ...config, decisionThreshold });
  };

  const handleReshuffleSeed = () => {
    onUpdateConfig({ ...config, seed: config.seed + 17 });
  };

  return (
    <div className="space-y-8">
      {/* Training & Hyperparameter Controls */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Pipeline Configuration & Train-Test Split
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Adjust feature extraction, preprocessing, split ratio, and decision threshold to retrain and evaluate all three algorithms live.
            </p>
          </div>
          <button
            type="button"
            onClick={handleReshuffleSeed}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reshuffle Split (Seed {config.seed})
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {/* Vectorizer */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-600">Feature Extraction</p>
            <div className="inline-flex items-center p-1 bg-slate-100 rounded-md w-full">
              {(
                [
                  { id: 'tfidf', label: 'TF-IDF' },
                  { id: 'bow', label: 'Bag of Words' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleVectorizerChange(opt.id)}
                  className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                    config.vectorizer === opt.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 font-mono tabular-nums">
              Vocabulary: {suite.vocabularySize} features
            </p>
          </div>

          {/* Train / Test Split */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-600">Train / Test Split</p>
            <div className="inline-flex items-center p-1 bg-slate-100 rounded-md w-full">
              {[
                { label: '70 / 30', val: 0.3 },
                { label: '80 / 20', val: 0.2 },
                { label: '85 / 15', val: 0.15 },
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => handleSplitChange(opt.val)}
                  className={`flex-1 px-2.5 py-1.5 text-xs font-medium font-mono tabular-nums rounded transition-colors whitespace-nowrap ${
                    config.testSize === opt.val
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 font-mono tabular-nums">
              {suite.trainCount} train · {suite.testCount} test (stratified)
            </p>
          </div>

          {/* Decision Threshold (False Positive Control) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="threshold-slider" className="text-xs font-medium text-slate-600">
                Spam Threshold
              </label>
              <span className="text-xs font-mono tabular-nums font-semibold text-blue-700">
                {(config.decisionThreshold * 100).toFixed(0)}%
              </span>
            </div>
            <input
              id="threshold-slider"
              type="range"
              min={0.25}
              max={0.85}
              step={0.05}
              value={config.decisionThreshold}
              onChange={(e) => handleThresholdChange(Number(e.target.value))}
              className="w-full accent-blue-700 cursor-pointer"
            />
            <p className="text-xs text-slate-500">
              Raise threshold to minimize False Positives on genuine messages.
            </p>
          </div>

          {/* NLP Preprocessing Options */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-600">NLP Preprocessing</p>
            <div className="space-y-1.5 text-xs text-slate-700">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.removeStopwords}
                  onChange={(e) =>
                    onUpdateConfig({ ...config, removeStopwords: e.target.checked })
                  }
                  className="rounded border-slate-300 accent-blue-700"
                />
                <span>Remove Stop Words</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.applyStemming}
                  onChange={(e) =>
                    onUpdateConfig({ ...config, applyStemming: e.target.checked })
                  }
                  className="rounded border-slate-300 accent-blue-700"
                />
                <span>Apply Stemming</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.useBigrams}
                  onChange={(e) =>
                    onUpdateConfig({ ...config, useBigrams: e.target.checked })
                  }
                  className="rounded border-slate-300 accent-blue-700"
                />
                <span>Include Word Bigrams</span>
              </label>
            </div>
          </div>
        </div>
      </section>

      {/* Model Comparison Table & Bar Chart */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        <section className="xl:col-span-7 bg-white border border-slate-200 rounded-lg p-6 flex flex-col">
          <div className="pb-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">
              Classification Performance Metrics
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Click any algorithm row to set it as the active model and inspect its confusion matrix.
            </p>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
                  <th className="py-3 pr-4">Algorithm</th>
                  <th className="py-3 px-3 text-right">Accuracy</th>
                  <th className="py-3 px-3 text-right">Precision</th>
                  <th className="py-3 px-3 text-right">Recall</th>
                  <th className="py-3 px-3 text-right">F1-Score</th>
                  <th className="py-3 pl-3 text-right">FPR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {(['naive_bayes', 'logistic_regression', 'svm'] as ModelType[]).map((m) => {
                  const ev = suite.evaluations[m];
                  const isActive = m === activeModel;
                  return (
                    <tr
                      key={m}
                      onClick={() => onSelectModel(m)}
                      className={`cursor-pointer transition-colors ${
                        isActive ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3.5 pr-4">
                        <div className="font-semibold text-slate-900">{ev.displayName}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {isActive ? 'Active model' : 'Click to inspect'}
                          <span aria-hidden="true"> · </span>
                          <span className="font-mono tabular-nums">{ev.trainingTimeMs}ms train</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                        {(ev.accuracy * 100).toFixed(1)}%
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono tabular-nums text-slate-800">
                        {(ev.precision * 100).toFixed(1)}%
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono tabular-nums text-slate-800">
                        {(ev.recall * 100).toFixed(1)}%
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono tabular-nums font-semibold text-blue-700">
                        {(ev.f1Score * 100).toFixed(1)}%
                      </td>
                      <td
                        className={`py-3.5 pl-3 text-right font-mono tabular-nums ${
                          ev.falsePositiveRate > 0.08 ? 'text-red-700 font-semibold' : 'text-emerald-700'
                        }`}
                      >
                        {(ev.falsePositiveRate * 100).toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Metric Formula Reference */}
          <div className="mt-auto pt-5 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-500">
            <div>
              <span className="font-semibold text-slate-700">Accuracy</span>
              <p className="font-mono mt-0.5">(TP+TN) / Total</p>
            </div>
            <div>
              <span className="font-semibold text-slate-700">Precision</span>
              <p className="font-mono mt-0.5">TP / (TP+FP)</p>
            </div>
            <div>
              <span className="font-semibold text-slate-700">Recall</span>
              <p className="font-mono mt-0.5">TP / (TP+FN)</p>
            </div>
            <div>
              <span className="font-semibold text-slate-700">F1-Score</span>
              <p className="font-mono mt-0.5">2·P·R / (P+R)</p>
            </div>
          </div>
        </section>

        <section className="xl:col-span-5 bg-white border border-slate-200 rounded-lg p-6">
          <div className="pb-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">
              Algorithm Comparison Chart
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Percentage comparison on held-out test set ({suite.testCount} messages).
            </p>
          </div>
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonChartData} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="model" tick={{ fontSize: 12, fill: '#475569' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748B' }} unit="%" />
                <Tooltip
                  formatter={(value) => [`${value}%`, '']}
                  contentStyle={{
                    borderRadius: '6px',
                    borderColor: '#CBD5E1',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="Accuracy" fill="#1D4ED8" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Precision" fill="#0F766E" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Recall" fill="#475569" radius={[3, 3, 0, 0]} />
                <Bar dataKey="F1-Score" fill="#2563EB" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Interactive Confusion Matrix & Sample Inspector */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Confusion Matrix — {MODEL_LABELS[activeModel]}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Select any quadrant below to inspect the exact held-out test messages that fell into that outcome.
            </p>
          </div>
          <div className="text-xs text-slate-500 font-mono tabular-nums">
            Test Spam: {suite.testSpamCount} · Test Ham: {suite.testHamCount}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* 2x2 Matrix Grid */}
          <div className="lg:col-span-5">
            <div className="grid grid-cols-[88px_1fr_1fr] gap-2.5 items-center text-xs">
              <div />
              <div className="text-center font-semibold text-slate-700 pb-1">
                Predicted Spam
              </div>
              <div className="text-center font-semibold text-slate-700 pb-1">
                Predicted Ham
              </div>

              <div className="font-semibold text-slate-700 text-right pr-2">
                Actual Spam
              </div>
              <button
                type="button"
                onClick={() => setSelectedQuadrant('tp')}
                className={`p-5 rounded-md border text-left transition-all ${
                  selectedQuadrant === 'tp'
                    ? 'border-emerald-600 ring-2 ring-emerald-600/20 bg-emerald-50'
                    : 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50'
                }`}
              >
                <div className="text-xs font-medium text-emerald-800">True Positive</div>
                <div className="mt-1 text-3xl font-bold font-mono tabular-nums text-emerald-900">
                  {cm.tp}
                </div>
                <div className="mt-1 text-xs font-mono tabular-nums text-emerald-700">
                  {suite.testCount > 0 ? ((cm.tp / suite.testCount) * 100).toFixed(1) : '0.0'}% of test
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedQuadrant('fn')}
                className={`p-5 rounded-md border text-left transition-all ${
                  selectedQuadrant === 'fn'
                    ? 'border-amber-600 ring-2 ring-amber-600/20 bg-amber-50'
                    : 'border-amber-200 bg-amber-50/50 hover:bg-amber-50'
                }`}
              >
                <div className="text-xs font-medium text-amber-800">False Negative</div>
                <div className="mt-1 text-3xl font-bold font-mono tabular-nums text-amber-900">
                  {cm.fn}
                </div>
                <div className="mt-1 text-xs font-mono tabular-nums text-amber-700">
                  {suite.testCount > 0 ? ((cm.fn / suite.testCount) * 100).toFixed(1) : '0.0'}% of test
                </div>
              </button>

              <div className="font-semibold text-slate-700 text-right pr-2">
                Actual Ham
              </div>
              <button
                type="button"
                onClick={() => setSelectedQuadrant('fp')}
                className={`p-5 rounded-md border text-left transition-all ${
                  selectedQuadrant === 'fp'
                    ? 'border-red-600 ring-2 ring-red-600/20 bg-red-50'
                    : 'border-red-200 bg-red-50/50 hover:bg-red-50'
                }`}
              >
                <div className="text-xs font-medium text-red-800">False Positive</div>
                <div className="mt-1 text-3xl font-bold font-mono tabular-nums text-red-900">
                  {cm.fp}
                </div>
                <div className="mt-1 text-xs font-mono tabular-nums text-red-700">
                  {suite.testCount > 0 ? ((cm.fp / suite.testCount) * 100).toFixed(1) : '0.0'}% of test
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedQuadrant('tn')}
                className={`p-5 rounded-md border text-left transition-all ${
                  selectedQuadrant === 'tn'
                    ? 'border-emerald-600 ring-2 ring-emerald-600/20 bg-emerald-50'
                    : 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50'
                }`}
              >
                <div className="text-xs font-medium text-emerald-800">True Negative</div>
                <div className="mt-1 text-3xl font-bold font-mono tabular-nums text-emerald-900">
                  {cm.tn}
                </div>
                <div className="mt-1 text-xs font-mono tabular-nums text-emerald-700">
                  {suite.testCount > 0 ? ((cm.tn / suite.testCount) * 100).toFixed(1) : '0.0'}% of test
                </div>
              </button>
            </div>
          </div>

          {/* Selected Quadrant Inspector */}
          <div className="lg:col-span-7">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  {QUADRANT_INFO[selectedQuadrant].title}
                </h3>
                <p className="text-xs text-slate-500">
                  {QUADRANT_INFO[selectedQuadrant].subtitle}
                </p>
              </div>
              <span className="text-xs font-mono tabular-nums text-slate-600">
                {inspectedSamples.length} {inspectedSamples.length === 1 ? 'message' : 'messages'}
              </span>
            </div>

            {inspectedSamples.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500">
                Zero test messages fell into {QUADRANT_INFO[selectedQuadrant].title} under the current split and threshold.
              </div>
            ) : (
              <div className="mt-3 max-h-72 overflow-y-auto divide-y divide-slate-100">
                {inspectedSamples.map((item) => (
                  <div key={item.record.id} className="py-3 space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                      <span className="font-mono">
                        {item.record.id} · {item.record.source} · Actual: {item.record.label}
                      </span>
                      <span className="font-mono tabular-nums font-medium text-slate-800">
                        P(Spam) = {(item.spamProbability * 100).toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-sm text-slate-800 leading-snug">{item.record.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Learned Model Feature Weights */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="pb-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">
            Top Learned Discriminative Features — {MODEL_SHORT_LABELS[activeModel]}
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Highest positive (Spam-indicative) and negative (Ham-indicative) feature weights learned from the training split.
          </p>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-sm font-semibold text-red-800 mb-3">
              Strongest Spam Indicators
            </h3>
            <div className="divide-y divide-slate-100">
              {activeEval.topSpamFeatures.map((feat, idx) => (
                <div key={feat.term} className="py-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-mono tabular-nums text-slate-400 w-5">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className="font-mono font-medium text-slate-900">{feat.term}</span>
                  </div>
                  <span className="font-mono tabular-nums font-semibold text-red-700">
                    +{feat.weight.toFixed(3)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-emerald-800 mb-3">
              Strongest Ham Indicators
            </h3>
            <div className="divide-y divide-slate-100">
              {activeEval.topHamFeatures.map((feat, idx) => (
                <div key={feat.term} className="py-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-mono tabular-nums text-slate-400 w-5">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className="font-mono font-medium text-slate-900">{feat.term}</span>
                  </div>
                  <span className="font-mono tabular-nums font-semibold text-emerald-700">
                    -{feat.weight.toFixed(3)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
