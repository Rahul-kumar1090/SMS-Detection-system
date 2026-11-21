import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { QUICK_SAMPLES } from '../data/defaultDataset';
import { parseCsvRows } from '../utils/csv';
import {
  MODEL_LABELS,
  MODEL_SHORT_LABELS,
  type MessageLabel,
  type MessageSource,
  type ModelType,
  type PredictionResult,
  type TrainedSuite,
} from '../types';

interface ClassifierViewProps {
  suite: TrainedSuite;
  activeModel: ModelType;
  onChangeModel: (model: ModelType) => void;
  onLogPrediction: (
    text: string,
    source: MessageSource,
    result: PredictionResult
  ) => void;
  onAddFeedbackToDataset: (
    text: string,
    source: MessageSource,
    correctLabel: MessageLabel
  ) => void;
}

interface BatchPredictionItem {
  text: string;
  source: MessageSource;
  result: PredictionResult;
}

export const ClassifierView: React.FC<ClassifierViewProps> = ({
  suite,
  activeModel,
  onChangeModel,
  onLogPrediction,
  onAddFeedbackToDataset,
}) => {
  const [inputText, setInputText] = useState<string>(QUICK_SAMPLES[0].text);
  const [source, setSource] = useState<MessageSource>(QUICK_SAMPLES[0].source);
  const [result, setResult] = useState<PredictionResult>(() =>
    suite.predict(QUICK_SAMPLES[0].text, activeModel)
  );
  const [feedbackSaved, setFeedbackSaved] = useState<string | null>(null);
  const [batchResults, setBatchResults] = useState<BatchPredictionItem[] | null>(null);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [showBatchPanel, setShowBatchPanel] = useState<boolean>(false);

  useEffect(() => {
    const trimmed = inputText.trim();
    if (trimmed) {
      setResult(suite.predict(trimmed, activeModel));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suite, activeModel]);

  const handleClassify = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;

    const prediction = suite.predict(trimmed, activeModel);
    setResult(prediction);
    setFeedbackSaved(null);
    onLogPrediction(trimmed, source, prediction);
  };

  const handleSelectModel = (model: ModelType) => {
    onChangeModel(model);
    if (inputText.trim()) {
      setResult(suite.predict(inputText.trim(), model));
      setFeedbackSaved(null);
    }
  };

  const handleLoadSample = (sample: (typeof QUICK_SAMPLES)[number]) => {
    setInputText(sample.text);
    setSource(sample.source);
    const prediction = suite.predict(sample.text, activeModel);
    setResult(prediction);
    setFeedbackSaved(null);
  };

  const handleClear = () => {
    setInputText('');
    setFeedbackSaved(null);
  };

  const handleFeedback = (correctLabel: MessageLabel) => {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    onAddFeedbackToDataset(trimmed, source, correctLabel);
    setFeedbackSaved(
      `Saved as ${correctLabel} in training corpus and retrained models.`
    );
  };

  const handleBatchCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBatchError(null);

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      const rows = parseCsvRows(text);
      if (rows.length === 0) {
        setBatchError('Uploaded CSV file is empty.');
        return;
      }

      const firstLower = rows[0].map((c) => c.toLowerCase());
      const hasHeader = firstLower.some((c) =>
        ['message', 'text', 'message_text', 'content', 'body', 'sms', 'email'].includes(c)
      );
      const startIdx = hasHeader ? 1 : 0;
      const textColIdx = hasHeader
        ? Math.max(
            0,
            firstLower.findIndex((c) =>
              ['message', 'text', 'message_text', 'content', 'body', 'sms', 'email'].includes(c)
            )
          )
        : 0;
      const sourceColIdx = hasHeader
        ? firstLower.findIndex((c) => ['source', 'channel', 'type'].includes(c))
        : -1;

      const items: BatchPredictionItem[] = [];
      for (let i = startIdx; i < rows.length && items.length < 100; i++) {
        const msg = (rows[i][textColIdx] ?? '').trim();
        if (!msg) continue;
        const rawSrc = sourceColIdx >= 0 ? rows[i][sourceColIdx]?.toLowerCase() : '';
        const inferredSource: MessageSource =
          rawSrc === 'email'
            ? 'Email'
            : rawSrc === 'sms'
            ? 'SMS'
            : msg.toLowerCase().startsWith('subject:') || msg.length > 180
            ? 'Email'
            : 'SMS';
        const pred = suite.predict(msg, activeModel);
        items.push({ text: msg, source: inferredSource, result: pred });
        onLogPrediction(msg, inferredSource, pred);
      }

      if (items.length === 0) {
        setBatchError('No readable message rows were found in the CSV.');
        return;
      }
      setBatchResults(items);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const activeEval = suite.evaluations[activeModel];
  const isSpam = result.label === 'Spam';

  return (
    <div className="space-y-8">
      {/* Top KPI summary bar - clean flat single-row divider strip */}
      <section className="bg-white border border-slate-200 rounded-lg">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          <div className="p-5">
            <p className="text-xs font-medium text-slate-500">Active Classifier</p>
            <p className="mt-1.5 text-base font-semibold text-slate-900">
              {MODEL_SHORT_LABELS[activeModel]}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {suite.config.vectorizer === 'tfidf' ? 'TF-IDF Vectorizer' : 'Bag of Words'}
              <span aria-hidden="true"> · </span>
              <span className="font-mono tabular-nums">{suite.vocabularySize}</span> features
            </p>
          </div>
          <div className="p-5">
            <p className="text-xs font-medium text-slate-500">Test Accuracy</p>
            <p className="mt-1.5 text-2xl font-semibold font-mono tabular-nums text-slate-900">
              {(activeEval.accuracy * 100).toFixed(1)}%
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Evaluated on <span className="font-mono tabular-nums">{suite.testCount}</span> held-out messages
            </p>
          </div>
          <div className="p-5">
            <p className="text-xs font-medium text-slate-500">Precision / Recall</p>
            <p className="mt-1.5 text-2xl font-semibold font-mono tabular-nums text-slate-900">
              {(activeEval.precision * 100).toFixed(1)}%
              <span className="text-slate-300 mx-1.5">/</span>
              {(activeEval.recall * 100).toFixed(1)}%
            </p>
            <p className="mt-1 text-xs text-slate-500">
              F1-Score <span className="font-mono tabular-nums">{(activeEval.f1Score * 100).toFixed(1)}%</span>
            </p>
          </div>
          <div className="p-5">
            <p className="text-xs font-medium text-slate-500">False Positive Rate</p>
            <p className="mt-1.5 text-2xl font-semibold font-mono tabular-nums text-slate-900">
              {(activeEval.falsePositiveRate * 100).toFixed(1)}%
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Decision threshold <span className="font-mono tabular-nums">{(suite.config.decisionThreshold * 100).toFixed(0)}%</span>
            </p>
          </div>
        </div>
      </section>

      {/* Main 2-column Classification Workbench */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left: Message Input Form */}
        <section className="xl:col-span-7 bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Message Classification Input
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">
                Enter an Email or SMS message to run preprocessing, feature extraction, and spam prediction.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowBatchPanel((v) => !v)}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              {showBatchPanel ? 'Hide Batch CSV' : 'Batch CSV Test'}
            </button>
          </div>

          {showBatchPanel && (
            <div className="mt-5 p-4 bg-slate-50 border border-slate-200 rounded-md space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    Batch Classify Unseen CSV Messages
                  </p>
                  <p className="text-xs text-slate-500">
                    Upload a CSV with a <code className="font-mono text-slate-700">text</code> or{' '}
                    <code className="font-mono text-slate-700">message</code> column (up to 100 rows logged automatically).
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 transition-colors cursor-pointer whitespace-nowrap shrink-0">
                  <Upload className="w-3.5 h-3.5" />
                  Upload CSV
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleBatchCsvUpload}
                    className="hidden"
                  />
                </label>
              </div>
              {batchError && (
                <p className="text-xs font-medium text-red-700">{batchError}</p>
              )}
              {batchResults && (
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-xs text-slate-600 mb-2">
                    Classified <span className="font-mono font-semibold tabular-nums">{batchResults.length}</span> messages:{' '}
                    <span className="text-red-700 font-medium font-mono tabular-nums">
                      {batchResults.filter((b) => b.result.label === 'Spam').length} Spam
                    </span>
                    <span aria-hidden="true"> · </span>
                    <span className="text-emerald-700 font-medium font-mono tabular-nums">
                      {batchResults.filter((b) => b.result.label === 'Ham').length} Ham
                    </span>
                  </p>
                  <div className="max-h-44 overflow-y-auto border border-slate-200 rounded bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                        <tr>
                          <th className="py-2 px-3 font-medium">Source</th>
                          <th className="py-2 px-3 font-medium">Message</th>
                          <th className="py-2 px-3 font-medium text-right">Prediction</th>
                          <th className="py-2 px-3 font-medium text-right">Confidence</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {batchResults.map((item, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="py-2 px-3 text-slate-600 whitespace-nowrap">{item.source}</td>
                            <td className="py-2 px-3 text-slate-800 max-w-xs truncate">{item.text}</td>
                            <td
                              className={`py-2 px-3 text-right font-semibold whitespace-nowrap ${
                                item.result.label === 'Spam' ? 'text-red-700' : 'text-emerald-700'
                              }`}
                            >
                              {item.result.label}
                            </td>
                            <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                              {item.result.confidence.toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleClassify} className="mt-5 space-y-5">
            {/* Source & Model Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-slate-600">Message Source</span>
                <div className="inline-flex items-center p-1 bg-slate-100 rounded-md">
                  {(['SMS', 'Email'] as MessageSource[]).map((src) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => setSource(src)}
                      className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                        source === src
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {src}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-slate-600">Algorithm</span>
                <div className="inline-flex items-center p-1 bg-slate-100 rounded-md">
                  {(['naive_bayes', 'logistic_regression', 'svm'] as ModelType[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleSelectModel(m)}
                      className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                        activeModel === m
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {MODEL_SHORT_LABELS[m]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Textarea */}
            <div>
              <label htmlFor="message-input" className="sr-only">
                Email or SMS Message Content
              </label>
              <textarea
                id="message-input"
                rows={5}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste or type an email or SMS message here to classify it as Spam or Ham..."
                className="w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 leading-relaxed"
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span className="font-mono tabular-nums">
                  {inputText.length} characters · {inputText.trim() ? inputText.trim().split(/\s+/).length : 0} words
                </span>
                <span>Logged automatically to Table 2.1 (Message Table) on classify</span>
              </div>
            </div>

            {/* Action row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Clear Text
              </button>
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
              >
                Classify Message
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Quick sample messages */}
          <div className="mt-6 pt-5 border-t border-slate-200">
            <p className="text-xs font-medium text-slate-600 mb-3">
              Load Test Examples
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {QUICK_SAMPLES.map((sample) => (
                <button
                  key={sample.title}
                  type="button"
                  onClick={() => handleLoadSample(sample)}
                  className="text-left p-3 rounded-md border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors"
                >
                  <div className="text-xs font-semibold text-slate-900 truncate">
                    {sample.title}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {sample.source}
                    <span aria-hidden="true"> · </span>
                    <span className={sample.expected === 'Spam' ? 'text-red-700 font-medium' : 'text-emerald-700 font-medium'}>
                      {sample.expected}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Right: Prediction Result & Feature Weights */}
        <section className="xl:col-span-5 bg-white border border-slate-200 rounded-lg p-6 space-y-6">
          <div className="flex items-start justify-between gap-4 pb-5 border-b border-slate-200">
            <div>
              <p className="text-xs font-medium text-slate-500">
                Classification Verdict
              </p>
              <div className="mt-2 flex items-center gap-2.5">
                {isSpam ? (
                  <ShieldAlert className="w-7 h-7 text-red-600 shrink-0" />
                ) : (
                  <ShieldCheck className="w-7 h-7 text-emerald-700 shrink-0" />
                )}
                <h3
                  className={`text-2xl font-bold tracking-tight ${
                    isSpam ? 'text-red-700' : 'text-emerald-800'
                  }`}
                >
                  {isSpam ? 'Spam Detected' : 'Ham (Legitimate)'}
                </h3>
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                {MODEL_LABELS[result.modelType]}
                <span aria-hidden="true"> · </span>
                {result.vectorizer === 'tfidf' ? 'TF-IDF' : 'Bag of Words'}
                <span aria-hidden="true"> · </span>
                {source}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-medium text-slate-500">Confidence</p>
              <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900">
                {result.confidence.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Probability Breakdown Bars */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-medium text-slate-700">Spam Probability</span>
                <span className="font-mono tabular-nums font-semibold text-red-700">
                  {(result.spamProbability * 100).toFixed(1)}%
                </span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-sm overflow-hidden">
                <div
                  className="h-full bg-red-600 transition-all duration-200"
                  style={{ width: `${Math.min(100, Math.max(1, result.spamProbability * 100))}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-medium text-slate-700">Ham (Legitimate) Probability</span>
                <span className="font-mono tabular-nums font-semibold text-emerald-700">
                  {(result.hamProbability * 100).toFixed(1)}%
                </span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-sm overflow-hidden">
                <div
                  className="h-full bg-emerald-600 transition-all duration-200"
                  style={{ width: `${Math.min(100, Math.max(1, result.hamProbability * 100))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Extracted Text Signals (Chapter 1 patterns) */}
          <div className="pt-5 border-t border-slate-200">
            <h4 className="text-sm font-semibold text-slate-900 mb-3">
              Extracted Structural Signals
            </h4>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Uppercase Ratio</span>
                <span className="font-mono tabular-nums font-medium text-slate-900">
                  {(result.steps.signals.uppercaseRatio * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Suspicious URLs</span>
                <span className="font-mono tabular-nums font-medium text-slate-900">
                  {result.steps.signals.urlCount}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Currency / Offer Triggers</span>
                <span className="font-mono tabular-nums font-medium text-slate-900">
                  {result.steps.signals.currencyCount}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Exclamation Marks</span>
                <span className="font-mono tabular-nums font-medium text-slate-900">
                  {result.steps.signals.exclamationCount}
                </span>
              </div>
            </div>
          </div>

          {/* Top Feature Contributions */}
          <div className="pt-5 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-slate-900">
                Feature Influence Breakdown
              </h4>
              <span className="text-xs text-slate-500">Top matched terms</span>
            </div>

            {result.contributions.length === 0 ? (
              <p className="text-xs text-slate-500">
                No vocabulary features matched this message. Classification relies on class prior probability.
              </p>
            ) : (
              <div className="space-y-2">
                {result.contributions.slice(0, 7).map((item) => {
                  const pushesSpam = item.contribution >= 0;
                  return (
                    <div
                      key={item.term}
                      className="flex items-center justify-between gap-3 text-xs py-1.5 border-b border-slate-100 last:border-b-0"
                    >
                      <span className="font-mono text-slate-800 truncate">{item.term}</span>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-slate-500 font-mono tabular-nums">
                          {result.vectorizer === 'tfidf' ? 'tfidf' : 'bow'} {item.featureValue.toFixed(2)}
                        </span>
                        <span
                          className={`font-mono tabular-nums font-semibold w-20 text-right ${
                            pushesSpam ? 'text-red-700' : 'text-emerald-700'
                          }`}
                        >
                          {pushesSpam ? '+' : ''}
                          {item.contribution.toFixed(2)} {pushesSpam ? 'Spam' : 'Ham'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* False Positive / Ground-Truth Feedback Loop */}
          <div className="pt-5 border-t border-slate-200">
            <p className="text-xs font-medium text-slate-700">
              False Positive Control & Active Learning
            </p>
            <p className="mt-1 text-xs text-slate-500">
              If this prediction is incorrect, label the true class below to append it to the dataset and immediately retrain all classifiers.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => handleFeedback('Ham')}
                className="px-3.5 py-2 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 transition-colors whitespace-nowrap shrink-0"
              >
                Mark as Ham (Not Spam)
              </button>
              <button
                type="button"
                onClick={() => handleFeedback('Spam')}
                className="px-3.5 py-2 text-xs font-medium text-red-800 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors whitespace-nowrap shrink-0"
              >
                Confirm as Spam
              </button>
            </div>
            {feedbackSaved && (
              <div className="mt-3 flex items-center gap-2 text-xs font-medium text-emerald-700">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{feedbackSaved}</span>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Step-by-Step Live NLP Pipeline Inspector (Section 1.3 & Process 2-3 in DFD Level 1) */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="pb-5 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">
            Live NLP Preprocessing & Feature Extraction Trace
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Exact transformation of the current message through Process 2 (Text Preprocessing) and Process 3 (Feature Extraction).
          </p>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-slate-700">01. Lowercasing</p>
            <p className="text-xs font-mono text-slate-600 bg-slate-50 border border-slate-200 rounded p-3 break-words leading-relaxed min-h-[76px]">
              {result.steps.lowercased || '—'}
            </p>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-slate-700">
              02. Punctuation & Noise Removal
            </p>
            <p className="text-xs font-mono text-slate-600 bg-slate-50 border border-slate-200 rounded p-3 break-words leading-relaxed min-h-[76px]">
              {result.steps.cleaned || '—'}
            </p>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-slate-700">
              03. Tokenization{' '}
              <span className="font-mono font-normal text-slate-500">
                ({result.steps.tokens.length} tokens)
              </span>
            </p>
            <p className="text-xs font-mono text-slate-600 bg-slate-50 border border-slate-200 rounded p-3 break-words leading-relaxed min-h-[76px]">
              {result.steps.tokens.length > 0 ? result.steps.tokens.join(' · ') : '—'}
            </p>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-slate-700">
              04. Stop Word Removal{' '}
              <span className="font-mono font-normal text-slate-500">
                ({result.steps.withoutStopwords.length} kept)
              </span>
            </p>
            <p className="text-xs font-mono text-slate-600 bg-slate-50 border border-slate-200 rounded p-3 break-words leading-relaxed min-h-[76px]">
              {result.steps.withoutStopwords.length > 0
                ? result.steps.withoutStopwords.join(' · ')
                : '—'}
            </p>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-slate-700">
              05. Stemming & Structural Features{' '}
              <span className="font-mono font-normal text-slate-500">
                ({result.steps.finalFeatures.length} features)
              </span>
            </p>
            <p className="text-xs font-mono text-slate-600 bg-slate-50 border border-slate-200 rounded p-3 break-words leading-relaxed min-h-[76px]">
              {result.steps.finalFeatures.length > 0
                ? result.steps.finalFeatures.join(' · ')
                : '—'}
            </p>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-slate-700">
              06. {result.vectorizer === 'tfidf' ? 'TF-IDF' : 'Bag of Words'} Vector{' '}
              <span className="font-mono font-normal text-slate-500">
                ({result.vectorEntries.length} non-zero)
              </span>
            </p>
            <div className="text-xs font-mono text-slate-600 bg-slate-50 border border-slate-200 rounded p-3 leading-relaxed min-h-[76px] max-h-32 overflow-y-auto">
              {result.vectorEntries.length > 0 ? (
                result.vectorEntries.slice(0, 10).map((entry) => (
                  <div key={entry.term} className="flex items-center justify-between gap-2">
                    <span className="truncate">{entry.term}</span>
                    <span className="tabular-nums text-slate-900 font-medium shrink-0">
                      {entry.value.toFixed(3)}
                    </span>
                  </div>
                ))
              ) : (
                <span>No known vocabulary terms</span>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
