import React, { useMemo, useState } from 'react';
import { Code2, Download, Search, ShieldAlert, ShieldCheck, Trash2 } from 'lucide-react';
import { exportMessageTableCsv } from '../utils/csv';
import {
  MODEL_SHORT_LABELS,
  type MessageLabel,
  type MessageSource,
  type MessageTableRecord,
  type TrainedSuite,
} from '../types';

interface MessageTableViewProps {
  records: MessageTableRecord[];
  suite: TrainedSuite;
  onDeleteRecord: (id: string) => void;
  onClearAll: () => void;
  onGoToClassifier: () => void;
}

const MYSQL_SCHEMA_SQL = `CREATE TABLE message_table (
  Message_ID            VARCHAR(20) PRIMARY KEY,
  Message_Text          TEXT NOT NULL,
  Source                ENUM('Email', 'SMS') NOT NULL,
  Date_Received         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  Label                 ENUM('Spam', 'Ham') NOT NULL,
  Prediction_Confidence DECIMAL(5, 2) NOT NULL
);`;

export const MessageTableView: React.FC<MessageTableViewProps> = ({
  records,
  suite,
  onDeleteRecord,
  onClearAll,
  onGoToClassifier,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [labelFilter, setLabelFilter] = useState<'All' | MessageLabel>('All');
  const [sourceFilter, setSourceFilter] = useState<'All' | MessageSource>('All');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [showSqlSchema, setShowSqlSchema] = useState(false);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return records.filter((r) => {
      if (labelFilter !== 'All' && r.Label !== labelFilter) return false;
      if (sourceFilter !== 'All' && r.Source !== sourceFilter) return false;
      if (
        q &&
        !r.Message_Text.toLowerCase().includes(q) &&
        !r.Message_ID.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [records, searchQuery, labelFilter, sourceFilter]);

  const selectedRecord = useMemo(
    () => records.find((r) => r.Message_ID === selectedRecordId) ?? null,
    [records, selectedRecordId]
  );

  const inspectedPrediction = useMemo(() => {
    if (!selectedRecord) return null;
    return suite.predict(selectedRecord.Message_Text, selectedRecord.Model_Used);
  }, [selectedRecord, suite]);

  const spamCount = records.filter((r) => r.Label === 'Spam').length;
  const hamCount = records.filter((r) => r.Label === 'Ham').length;
  const avgConfidence =
    records.length > 0
      ? records.reduce((acc, r) => acc + r.Prediction_Confidence, 0) / records.length
      : 0;

  return (
    <div className="space-y-8">
      {/* Database Summary Strip */}
      <section className="bg-white border border-slate-200 rounded-lg">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          <div className="p-5">
            <p className="text-xs font-medium text-slate-500">Logged Records</p>
            <p className="mt-1.5 text-2xl font-semibold font-mono tabular-nums text-slate-900">
              {records.length}
            </p>
            <p className="mt-1 text-xs text-slate-500">Table 2.1 – Message Table</p>
          </div>
          <div className="p-5">
            <p className="text-xs font-medium text-slate-500">Flagged Spam</p>
            <p className="mt-1.5 text-2xl font-semibold font-mono tabular-nums text-red-700">
              {spamCount}
            </p>
            <p className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
              {records.length ? ((spamCount / records.length) * 100).toFixed(1) : '0.0'}% of predictions
            </p>
          </div>
          <div className="p-5">
            <p className="text-xs font-medium text-slate-500">Verified Ham</p>
            <p className="mt-1.5 text-2xl font-semibold font-mono tabular-nums text-emerald-700">
              {hamCount}
            </p>
            <p className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
              {records.length ? ((hamCount / records.length) * 100).toFixed(1) : '0.0'}% of predictions
            </p>
          </div>
          <div className="p-5">
            <p className="text-xs font-medium text-slate-500">Avg. Confidence Score</p>
            <p className="mt-1.5 text-2xl font-semibold font-mono tabular-nums text-slate-900">
              {avgConfidence.toFixed(1)}%
            </p>
            <p className="mt-1 text-xs text-slate-500">Persisted locally across sessions</p>
          </div>
        </div>
      </section>

      {/* Main Message Table (Section 2.4 Database Design) */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Table 2.1 — Message Table (Classification Log)
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Structured storage schema from Section 2.4 Database Design recording every classified Email and SMS message.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowSqlSchema((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              <Code2 className="w-3.5 h-3.5" />
              {showSqlSchema ? 'Hide SQL Schema' : 'View MySQL Schema'}
            </button>
            <button
              type="button"
              onClick={() => exportMessageTableCsv(records)}
              disabled={records.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedRecordId(null);
                onClearAll();
              }}
              disabled={records.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-700 bg-white border border-red-200 rounded-md hover:bg-red-50 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Table
            </button>
          </div>
        </div>

        {showSqlSchema && (
          <div className="mt-5 p-4 bg-slate-900 text-slate-100 rounded-md overflow-x-auto">
            <p className="text-xs text-slate-400 mb-2">
              Section 2.4 Indicative MySQL Table Definition
            </p>
            <pre className="text-xs font-mono leading-relaxed">{MYSQL_SCHEMA_SQL}</pre>
          </div>
        )}

        {/* Filter Bar */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Message_ID or Message_Text..."
              className="pl-9 pr-3 py-1.5 text-xs rounded-md border border-slate-300 w-64 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-md">
              {(['All', 'Spam', 'Ham'] as const).map((lbl) => (
                <button
                  key={lbl}
                  type="button"
                  onClick={() => setLabelFilter(lbl)}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                    labelFilter === lbl
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>

            <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-md">
              {(['All', 'SMS', 'Email'] as const).map((src) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setSourceFilter(src)}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                    sourceFilter === src
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {src}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table Content / Empty State */}
        <div className="mt-4 overflow-x-auto">
          {records.length === 0 ? (
            <div className="py-14 text-center space-y-3">
              <p className="text-sm font-medium text-slate-700">
                No classified messages recorded yet
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Messages classified in the Live Classifier or Batch CSV runner are stored here automatically with their confidence scores.
              </p>
              <button
                type="button"
                onClick={onGoToClassifier}
                className="inline-flex items-center px-4 py-2 text-xs font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 transition-colors"
              >
                Classify First Message
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              No records match your active search or filter criteria.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                  <th className="py-3 px-3 whitespace-nowrap">Message_ID</th>
                  <th className="py-3 px-3">Message_Text</th>
                  <th className="py-3 px-3 whitespace-nowrap">Source</th>
                  <th className="py-3 px-3 whitespace-nowrap">Date_Received</th>
                  <th className="py-3 px-3 whitespace-nowrap">Label</th>
                  <th className="py-3 px-3 text-right whitespace-nowrap">Prediction_Confidence</th>
                  <th className="py-3 px-3 text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filtered.map((rec) => {
                  const isSelected = rec.Message_ID === selectedRecordId;
                  const isSpam = rec.Label === 'Spam';
                  return (
                    <tr
                      key={rec.Message_ID}
                      onClick={() =>
                        setSelectedRecordId(isSelected ? null : rec.Message_ID)
                      }
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3 px-3 font-mono tabular-nums font-medium text-slate-700 whitespace-nowrap">
                        {rec.Message_ID}
                      </td>
                      <td className="py-3 px-3 text-slate-800 max-w-md">
                        <p className="truncate">{rec.Message_Text}</p>
                        <p className="text-slate-400 mt-0.5">
                          {MODEL_SHORT_LABELS[rec.Model_Used]} · {rec.Vectorizer_Used.toUpperCase()}
                        </p>
                      </td>
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                        {rec.Source}
                      </td>
                      <td className="py-3 px-3 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                        {rec.Date_Received}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 font-semibold ${
                            isSpam ? 'text-red-700' : 'text-emerald-700'
                          }`}
                        >
                          {isSpam ? (
                            <ShieldAlert className="w-3.5 h-3.5" />
                          ) : (
                            <ShieldCheck className="w-3.5 h-3.5" />
                          )}
                          {rec.Label}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                        {rec.Prediction_Confidence.toFixed(1)}%
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (selectedRecordId === rec.Message_ID) {
                              setSelectedRecordId(null);
                            }
                            onDeleteRecord(rec.Message_ID);
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-700 transition-colors"
                          aria-label={`Delete ${rec.Message_ID}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Selected Record Inspector */}
        {selectedRecord && inspectedPrediction && (
          <div className="mt-6 pt-6 border-t border-slate-200 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">
                Record Audit — <span className="font-mono">{selectedRecord.Message_ID}</span>
              </h3>
              <span className="text-xs text-slate-500">
                {selectedRecord.Source} · {selectedRecord.Date_Received} · {MODEL_SHORT_LABELS[selectedRecord.Model_Used]}
              </span>
            </div>
            <p className="text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-md p-3.5 leading-relaxed">
              {selectedRecord.Message_Text}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div>
                <p className="font-semibold text-slate-700 mb-1.5">Extracted Stemmed Features</p>
                <p className="font-mono text-slate-600 leading-relaxed">
                  {inspectedPrediction.steps.finalFeatures.join(' · ') || '—'}
                </p>
              </div>
              <div>
                <p className="font-semibold text-slate-700 mb-1.5">Top Contributing Terms</p>
                <div className="space-y-1">
                  {inspectedPrediction.contributions.slice(0, 5).map((c) => (
                    <div key={c.term} className="flex items-center justify-between font-mono tabular-nums">
                      <span className="text-slate-700">{c.term}</span>
                      <span className={c.contribution >= 0 ? 'text-red-700' : 'text-emerald-700'}>
                        {c.contribution >= 0 ? '+' : ''}
                        {c.contribution.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
