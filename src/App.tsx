import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Database,
  FileText,
  GitBranch,
  Menu,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { DEFAULT_DATASET, INITIAL_LOG_SAMPLES } from './data/defaultDataset';
import { trainModelSuite } from './ml/models';
import { ClassifierView } from './components/ClassifierView';
import { ModelEvaluationView } from './components/ModelEvaluationView';
import { DatasetEdaView } from './components/DatasetEdaView';
import { MessageTableView } from './components/MessageTableView';
import { SystemDesignView } from './components/SystemDesignView';
import {
  MODEL_SHORT_LABELS,
  type DatasetRecord,
  type MessageLabel,
  type MessageSource,
  type MessageTableRecord,
  type ModelType,
  type NavSection,
  type PipelineConfig,
  type PredictionResult,
} from './types';

const STORAGE_DATASET_KEY = 'spam_detector_dataset_v1';
const STORAGE_LOG_KEY = 'spam_detector_message_table_v1';

const DEFAULT_CONFIG: PipelineConfig = {
  vectorizer: 'tfidf',
  testSize: 0.2,
  removeStopwords: true,
  applyStemming: true,
  useBigrams: true,
  decisionThreshold: 0.5,
  seed: 42,
};

const NAV_ITEMS: {
  id: NavSection;
  label: string;
  breadcrumb: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'classifier',
    label: 'Live Classifier',
    breadcrumb: 'Live Spam / Ham Classifier',
    icon: ShieldCheck,
  },
  {
    id: 'evaluation',
    label: 'Model Evaluation',
    breadcrumb: 'Model Training & Evaluation',
    icon: SlidersHorizontal,
  },
  {
    id: 'dataset',
    label: 'Dataset & EDA',
    breadcrumb: 'Dataset & Exploratory Analysis',
    icon: BarChart3,
  },
  {
    id: 'database',
    label: 'Message Table',
    breadcrumb: 'Database Design — Table 2.1',
    icon: Database,
  },
  {
    id: 'architecture',
    label: 'System Design & DFD',
    breadcrumb: 'System Architecture & DFD Diagrams',
    icon: GitBranch,
  },
];

function formatDateTime(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

function loadInitialDataset(): DatasetRecord[] {
  try {
    const saved = localStorage.getItem(STORAGE_DATASET_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as DatasetRecord[];
      if (Array.isArray(parsed) && parsed.length >= 20) {
        return parsed;
      }
    }
  } catch {
    // Fall back to default dataset
  }
  return DEFAULT_DATASET;
}

export default function App() {
  const [activeNav, setActiveNav] = useState<NavSection>('classifier');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [dataset, setDataset] = useState<DatasetRecord[]>(() => loadInitialDataset());
  const [config, setConfig] = useState<PipelineConfig>(DEFAULT_CONFIG);
  const [activeModel, setActiveModel] = useState<ModelType>('naive_bayes');

  // Train all 3 classifiers whenever dataset or pipeline configuration changes
  const trainedSuite = useMemo(() => trainModelSuite(dataset, config), [dataset, config]);

  // Persistent Message Table (Section 2.4 Database Design)
  const [messageLog, setMessageLog] = useState<MessageTableRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_LOG_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as MessageTableRecord[];
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Seed initial records below
    }

    const baseSuite = trainModelSuite(loadInitialDataset(), DEFAULT_CONFIG);
    const now = Date.now();
    return INITIAL_LOG_SAMPLES.map((sample, idx) => {
      const pred = baseSuite.predict(sample.text, 'naive_bayes');
      const d = new Date(now - sample.daysAgo * 86400000 - idx * 1800000);
      return {
        Message_ID: `MSG-${String(1000 + INITIAL_LOG_SAMPLES.length - idx)}`,
        Message_Text: sample.text,
        Source: sample.source,
        Date_Received: formatDateTime(d),
        Label: pred.label,
        Prediction_Confidence: pred.confidence,
        Model_Used: 'naive_bayes',
        Vectorizer_Used: 'tfidf',
      };
    });
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_DATASET_KEY, JSON.stringify(dataset));
    } catch {
      // Ignore storage quota errors
    }
  }, [dataset]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_LOG_KEY, JSON.stringify(messageLog));
    } catch {
      // Ignore storage quota errors
    }
  }, [messageLog]);

  const handleLogPrediction = (
    text: string,
    source: MessageSource,
    result: PredictionResult
  ) => {
    setMessageLog((prev) => {
      const nextNum =
        prev.reduce((max, item) => {
          const n = parseInt(item.Message_ID.replace(/\D/g, ''), 10);
          return Number.isFinite(n) ? Math.max(max, n) : max;
        }, 1000) + 1;

      const entry: MessageTableRecord = {
        Message_ID: `MSG-${nextNum}`,
        Message_Text: text,
        Source: source,
        Date_Received: formatDateTime(new Date()),
        Label: result.label,
        Prediction_Confidence: result.confidence,
        Model_Used: result.modelType,
        Vectorizer_Used: result.vectorizer,
      };
      return [entry, ...prev];
    });
  };

  const handleAddRecord = (record: Omit<DatasetRecord, 'id'>) => {
    setDataset((prev) => {
      const nextNum = prev.length + 1;
      const newRecord: DatasetRecord = {
        id: `DS-${String(nextNum).padStart(3, '0')}`,
        ...record,
      };
      return [newRecord, ...prev];
    });
  };

  const handleAddFeedbackToDataset = (
    text: string,
    source: MessageSource,
    correctLabel: MessageLabel
  ) => {
    handleAddRecord({ text, source, label: correctLabel });
  };

  const handleImportRecords = (records: DatasetRecord[], replace: boolean) => {
    setDataset((prev) => (replace ? records : [...records, ...prev]));
  };

  const handleDeleteDatasetRecord = (id: string) => {
    setDataset((prev) => (prev.length > 20 ? prev.filter((r) => r.id !== id) : prev));
  };

  const handleResetDataset = () => {
    setDataset(DEFAULT_DATASET);
  };

  const handleDeleteLogRecord = (id: string) => {
    setMessageLog((prev) => prev.filter((r) => r.Message_ID !== id));
  };

  const handleClearLog = () => {
    setMessageLog([]);
  };

  const activeNavItem = NAV_ITEMS.find((n) => n.id === activeNav) ?? NAV_ITEMS[0];
  const activeEval = trainedSuite.evaluations[activeModel];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Desktop Sidebar Navigation (256px) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white border-r border-slate-200 z-20">
        <div className="h-16 px-6 flex items-center border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveNav('classifier')}
            className="text-left font-bold text-base tracking-tight text-slate-900 whitespace-nowrap"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            SpamGuard NLP
          </button>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1" aria-label="Primary Workspace Navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveNav(item.id)}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-50 text-blue-800'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-blue-700' : 'text-slate-400'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </span>
                {item.id === 'database' && (
                  <span className="text-xs font-mono tabular-nums text-slate-400">
                    {messageLog.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Quiet model summary footer in sidebar */}
        <div className="p-4 border-t border-slate-200 text-xs text-slate-500 space-y-1">
          <p className="font-semibold text-slate-800">
            {MODEL_SHORT_LABELS[activeModel]}
          </p>
          <p className="font-mono tabular-nums">
            Acc {(activeEval.accuracy * 100).toFixed(1)}% · F1 {(activeEval.f1Score * 100).toFixed(1)}%
          </p>
          <p>
            {dataset.length} records · {config.vectorizer === 'tfidf' ? 'TF-IDF' : 'BoW'}
          </p>
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-64 max-w-[80vw] bg-white h-full flex flex-col border-r border-slate-200 z-50">
            <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200">
              <span
                className="font-bold text-base tracking-tight text-slate-900"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                SpamGuard NLP
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-slate-500 hover:text-slate-900"
                aria-label="Close navigation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeNav === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveNav(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-800'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-blue-700' : 'text-slate-400'
                      }`}
                    />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Contextual Workspace Header (SaaS Dashboard Top Bar Contract) */}
        <header className="sticky top-0 z-10 h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900"
              aria-label="Open navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0 truncate">
              <span className="text-slate-500 hidden sm:inline whitespace-nowrap">
                Spam Email/SMS Detection System
              </span>
              <span className="text-slate-300 hidden sm:inline" aria-hidden="true">
                /
              </span>
              <h1 className="font-semibold text-slate-900 truncate">
                {activeNavItem.breadcrumb}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {activeNav !== 'classifier' ? (
              <button
                type="button"
                onClick={() => setActiveNav('classifier')}
                className="px-4 py-2 text-xs font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
              >
                Open Classifier
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveNav('evaluation')}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
              >
                Tune & Evaluate Models
              </button>
            )}
          </div>
        </header>

        {/* Main Viewport Container */}
        <main className="flex-1 w-full max-w-[1280px] mx-auto px-4 sm:px-8 py-8">
          {activeNav === 'classifier' && (
            <ClassifierView
              suite={trainedSuite}
              activeModel={activeModel}
              onChangeModel={setActiveModel}
              onLogPrediction={handleLogPrediction}
              onAddFeedbackToDataset={handleAddFeedbackToDataset}
            />
          )}

          {activeNav === 'evaluation' && (
            <ModelEvaluationView
              suite={trainedSuite}
              config={config}
              activeModel={activeModel}
              onSelectModel={setActiveModel}
              onUpdateConfig={setConfig}
            />
          )}

          {activeNav === 'dataset' && (
            <DatasetEdaView
              dataset={dataset}
              onAddRecord={handleAddRecord}
              onImportRecords={handleImportRecords}
              onDeleteRecord={handleDeleteDatasetRecord}
              onResetDataset={handleResetDataset}
            />
          )}

          {activeNav === 'database' && (
            <MessageTableView
              records={messageLog}
              suite={trainedSuite}
              onDeleteRecord={handleDeleteLogRecord}
              onClearAll={handleClearLog}
              onGoToClassifier={() => setActiveNav('classifier')}
            />
          )}

          {activeNav === 'architecture' && <SystemDesignView />}
        </main>

        {/* Quiet Academic Footer */}
        <footer className="border-t border-slate-200 bg-white px-4 sm:px-8 py-4">
          <div className="max-w-[1280px] mx-auto flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <p>
              Spam Email/SMS Detection System · BCA Project (2026–2027) · Rahul Kumar (MUIT Noida)
            </p>
            <button
              type="button"
              onClick={() => setActiveNav('architecture')}
              className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-900 transition-colors whitespace-nowrap"
            >
              <FileText className="w-3.5 h-3.5" />
              View Synopsis Architecture & DFDs
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
