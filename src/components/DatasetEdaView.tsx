import React, { useMemo, useState } from 'react';
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
import { Download, Plus, RotateCcw, Search, Trash2, Upload } from 'lucide-react';
import { analyzeSignals, preprocessText } from '../ml/nlp';
import { exportDatasetCsv, parseLabeledDatasetCsv } from '../utils/csv';
import type { DatasetRecord, MessageLabel, MessageSource } from '../types';

interface DatasetEdaViewProps {
  dataset: DatasetRecord[];
  onAddRecord: (record: Omit<DatasetRecord, 'id'>) => void;
  onImportRecords: (records: DatasetRecord[], replace: boolean) => void;
  onDeleteRecord: (id: string) => void;
  onResetDataset: () => void;
}

export const DatasetEdaView: React.FC<DatasetEdaViewProps> = ({
  dataset,
  onAddRecord,
  onImportRecords,
  onDeleteRecord,
  onResetDataset,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [labelFilter, setLabelFilter] = useState<'All' | MessageLabel>('All');
  const [sourceFilter, setSourceFilter] = useState<'All' | MessageSource>('All');

  const [newText, setNewText] = useState('');
  const [newSource, setNewSource] = useState<MessageSource>('SMS');
  const [newLabel, setNewLabel] = useState<MessageLabel>('Spam');
  const [importReplace, setImportReplace] = useState(false);
  const [importNotice, setImportNotice] = useState<string | null>(null);

  const eda = useMemo(() => {
    const spam = dataset.filter((d) => d.label === 'Spam');
    const ham = dataset.filter((d) => d.label === 'Ham');

    const spamEmail = spam.filter((d) => d.source === 'Email').length;
    const spamSms = spam.filter((d) => d.source === 'SMS').length;
    const hamEmail = ham.filter((d) => d.source === 'Email').length;
    const hamSms = ham.filter((d) => d.source === 'SMS').length;

    // Length distribution bins
    const bins = [
      { range: '0–60', min: 0, max: 60, Spam: 0, Ham: 0 },
      { range: '61–110', min: 61, max: 110, Spam: 0, Ham: 0 },
      { range: '111–160', min: 111, max: 160, Spam: 0, Ham: 0 },
      { range: '161–220', min: 161, max: 220, Spam: 0, Ham: 0 },
      { range: '221+', min: 221, max: Infinity, Spam: 0, Ham: 0 },
    ];

    const spamWordCounts = new Map<string, number>();
    const hamWordCounts = new Map<string, number>();

    let spamCharSum = 0;
    let hamCharSum = 0;
    let spamUpperSum = 0;
    let hamUpperSum = 0;
    let spamUrlDocs = 0;
    let hamUrlDocs = 0;
    let spamExclaimSum = 0;
    let hamExclaimSum = 0;

    for (const rec of dataset) {
      const sig = analyzeSignals(rec.text);
      const bin = bins.find((b) => sig.charCount >= b.min && sig.charCount <= b.max);
      if (bin) {
        if (rec.label === 'Spam') bin.Spam++;
        else bin.Ham++;
      }

      const steps = preprocessText(rec.text, {
        removeStopwords: true,
        applyStemming: false,
        useBigrams: false,
      });

      const targetMap = rec.label === 'Spam' ? spamWordCounts : hamWordCounts;
      for (const tok of steps.withoutStopwords) {
        if (tok === 'subject' || tok.length < 3) continue;
        targetMap.set(tok, (targetMap.get(tok) ?? 0) + 1);
      }

      if (rec.label === 'Spam') {
        spamCharSum += sig.charCount;
        spamUpperSum += sig.uppercaseRatio;
        if (sig.urlCount > 0) spamUrlDocs++;
        spamExclaimSum += sig.exclamationCount;
      } else {
        hamCharSum += sig.charCount;
        hamUpperSum += sig.uppercaseRatio;
        if (sig.urlCount > 0) hamUrlDocs++;
        hamExclaimSum += sig.exclamationCount;
      }
    }

    const topSpamWords = [...spamWordCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([word, count]) => ({ word, count }));

    const topHamWords = [...hamWordCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([word, count]) => ({ word, count }));

    const channelData = [
      { channel: 'SMS', Spam: spamSms, Ham: hamSms },
      { channel: 'Email', Spam: spamEmail, Ham: hamEmail },
    ];

    return {
      total: dataset.length,
      spamCount: spam.length,
      hamCount: ham.length,
      channelData,
      lengthBins: bins.map(({ range, Spam, Ham }) => ({ range, Spam, Ham })),
      topSpamWords,
      topHamWords,
      avgSpamLen: spam.length ? Math.round(spamCharSum / spam.length) : 0,
      avgHamLen: ham.length ? Math.round(hamCharSum / ham.length) : 0,
      avgSpamUpper: spam.length ? (spamUpperSum / spam.length) * 100 : 0,
      avgHamUpper: ham.length ? (hamUpperSum / ham.length) * 100 : 0,
      spamUrlRate: spam.length ? (spamUrlDocs / spam.length) * 100 : 0,
      hamUrlRate: ham.length ? (hamUrlDocs / ham.length) * 100 : 0,
      avgSpamExclaim: spam.length ? spamExclaimSum / spam.length : 0,
      avgHamExclaim: ham.length ? hamExclaimSum / ham.length : 0,
    };
  }, [dataset]);

  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return dataset.filter((rec) => {
      if (labelFilter !== 'All' && rec.label !== labelFilter) return false;
      if (sourceFilter !== 'All' && rec.source !== sourceFilter) return false;
      if (q && !rec.text.toLowerCase().includes(q) && !rec.id.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [dataset, searchQuery, labelFilter, sourceFilter]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newText.trim();
    if (trimmed.length < 3) return;
    onAddRecord({ text: trimmed, source: newSource, label: newLabel });
    setNewText('');
    setImportNotice(`Added 1 labeled ${newLabel} (${newSource}) message and retrained models.`);
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result ?? '');
      const { records, skipped } = parseLabeledDatasetCsv(
        content,
        importReplace ? 0 : dataset.length
      );
      if (records.length === 0) {
        setImportNotice(
          'Could not parse valid labeled rows. Expected columns like label,text or source,label,text.'
        );
        return;
      }
      onImportRecords(records, importReplace);
      setImportNotice(
        `${importReplace ? 'Replaced dataset with' : 'Imported'} ${records.length} labeled messages${
          skipped > 0 ? ` (${skipped} invalid rows skipped)` : ''
        } and retrained all models.`
      );
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-8">
      {/* Dataset Overview Strip */}
      <section className="bg-white border border-slate-200 rounded-lg">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          <div className="p-5">
            <p className="text-xs font-medium text-slate-500">Total Labeled Messages</p>
            <p className="mt-1.5 text-2xl font-semibold font-mono tabular-nums text-slate-900">
              {eda.total}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Email & SMS training corpus
            </p>
          </div>
          <div className="p-5">
            <p className="text-xs font-medium text-slate-500">Spam vs. Ham Balance</p>
            <p className="mt-1.5 text-2xl font-semibold font-mono tabular-nums text-slate-900">
              <span className="text-red-700">{eda.spamCount}</span>
              <span className="text-slate-300 mx-1.5">/</span>
              <span className="text-emerald-700">{eda.hamCount}</span>
            </p>
            <p className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
              {eda.total ? ((eda.spamCount / eda.total) * 100).toFixed(1) : '0.0'}% Spam ·{' '}
              {eda.total ? ((eda.hamCount / eda.total) * 100).toFixed(1) : '0.0'}% Ham
            </p>
          </div>
          <div className="p-5">
            <p className="text-xs font-medium text-slate-500">Avg. Character Length</p>
            <p className="mt-1.5 text-2xl font-semibold font-mono tabular-nums text-slate-900">
              {eda.avgSpamLen}
              <span className="text-slate-300 mx-1.5">/</span>
              {eda.avgHamLen}
            </p>
            <p className="mt-1 text-xs text-slate-500">Spam chars vs. Ham chars</p>
          </div>
          <div className="p-5">
            <p className="text-xs font-medium text-slate-500">Messages Containing URLs</p>
            <p className="mt-1.5 text-2xl font-semibold font-mono tabular-nums text-slate-900">
              {eda.spamUrlRate.toFixed(0)}%
              <span className="text-slate-300 mx-1.5">/</span>
              {eda.hamUrlRate.toFixed(0)}%
            </p>
            <p className="mt-1 text-xs text-slate-500">Spam URL rate vs. Ham URL rate</p>
          </div>
        </div>
      </section>

      {/* EDA Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <section className="xl:col-span-5 bg-white border border-slate-200 rounded-lg p-6">
          <div className="pb-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">
              Class Distribution by Channel
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Count of labeled Spam and Ham records across SMS and Email sources.
            </p>
          </div>
          <div className="mt-4 h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={eda.channelData} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="channel" tick={{ fontSize: 12, fill: '#475569' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '6px', borderColor: '#CBD5E1', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="Spam" fill="#DC2626" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Ham" fill="#15803D" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="xl:col-span-7 bg-white border border-slate-200 rounded-lg p-6">
          <div className="pb-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">
              Message Length Distribution (Characters)
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Exploratory comparison of text length profiles between Spam and Ham messages.
            </p>
          </div>
          <div className="mt-4 h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={eda.lengthBins} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="range" tick={{ fontSize: 12, fill: '#475569' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '6px', borderColor: '#CBD5E1', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="Spam" fill="#DC2626" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Ham" fill="#15803D" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Top Frequent Terms + Structural Signal Table */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <section className="xl:col-span-4 bg-white border border-slate-200 rounded-lg p-6">
          <h3 className="text-base font-semibold text-slate-900">
            Most Frequent Spam Keywords
          </h3>
          <p className="mt-0.5 text-xs text-slate-500 pb-4 border-b border-slate-200">
            Post stop-word removal term frequency
          </p>
          <div className="mt-4 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={eda.topSpamWords}
                layout="vertical"
                margin={{ top: 0, right: 16, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis
                  dataKey="word"
                  type="category"
                  width={76}
                  tick={{ fontSize: 11, fill: '#334155', fontFamily: 'JetBrains Mono' }}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '6px', borderColor: '#CBD5E1', fontSize: '12px' }}
                />
                <Bar dataKey="count" name="Occurrences" fill="#DC2626" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="xl:col-span-4 bg-white border border-slate-200 rounded-lg p-6">
          <h3 className="text-base font-semibold text-slate-900">
            Most Frequent Ham Keywords
          </h3>
          <p className="mt-0.5 text-xs text-slate-500 pb-4 border-b border-slate-200">
            Post stop-word removal term frequency
          </p>
          <div className="mt-4 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={eda.topHamWords}
                layout="vertical"
                margin={{ top: 0, right: 16, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis
                  dataKey="word"
                  type="category"
                  width={76}
                  tick={{ fontSize: 11, fill: '#334155', fontFamily: 'JetBrains Mono' }}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '6px', borderColor: '#CBD5E1', fontSize: '12px' }}
                />
                <Bar dataKey="count" name="Occurrences" fill="#15803D" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="xl:col-span-4 bg-white border border-slate-200 rounded-lg p-6">
          <h3 className="text-base font-semibold text-slate-900">
            Structural Signal Summary
          </h3>
          <p className="mt-0.5 text-xs text-slate-500 pb-4 border-b border-slate-200">
            Lexical pattern contrast across corpus
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 font-medium">Signal</th>
                  <th className="py-2 text-right font-medium text-red-700">Spam</th>
                  <th className="py-2 text-right font-medium text-emerald-700">Ham</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                <tr>
                  <td className="py-3 font-sans text-slate-700">Avg. Length (chars)</td>
                  <td className="py-3 text-right text-slate-900">{eda.avgSpamLen}</td>
                  <td className="py-3 text-right text-slate-900">{eda.avgHamLen}</td>
                </tr>
                <tr>
                  <td className="py-3 font-sans text-slate-700">Avg. Uppercase Ratio</td>
                  <td className="py-3 text-right text-slate-900">{eda.avgSpamUpper.toFixed(1)}%</td>
                  <td className="py-3 text-right text-slate-900">{eda.avgHamUpper.toFixed(1)}%</td>
                </tr>
                <tr>
                  <td className="py-3 font-sans text-slate-700">URL Presence Rate</td>
                  <td className="py-3 text-right text-slate-900">{eda.spamUrlRate.toFixed(1)}%</td>
                  <td className="py-3 text-right text-slate-900">{eda.hamUrlRate.toFixed(1)}%</td>
                </tr>
                <tr>
                  <td className="py-3 font-sans text-slate-700">Avg. Exclamations</td>
                  <td className="py-3 text-right text-slate-900">{eda.avgSpamExclaim.toFixed(2)}</td>
                  <td className="py-3 text-right text-slate-900">{eda.avgHamExclaim.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Add Sample & CSV Import Controls */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Dataset Management & CSV Import
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Add labeled training examples or import an external CSV file (supports <code className="font-mono text-slate-700">label,text</code>, UCI <code className="font-mono text-slate-700">v1,v2</code>, or <code className="font-mono text-slate-700">source,label,text</code>).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <label className="inline-flex items-center gap-2 text-xs text-slate-600 mr-2 cursor-pointer">
              <input
                type="checkbox"
                checked={importReplace}
                onChange={(e) => setImportReplace(e.target.checked)}
                className="rounded border-slate-300 accent-blue-700"
              />
              <span>Replace existing on upload</span>
            </label>

            <label className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 transition-colors cursor-pointer whitespace-nowrap shrink-0">
              <Upload className="w-3.5 h-3.5" />
              Import CSV
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleCsvUpload}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={() => exportDatasetCsv(dataset)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>

            <button
              type="button"
              onClick={() => {
                onResetDataset();
                setImportNotice('Restored default 200-message Email/SMS dataset and retrained models.');
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Default
            </button>
          </div>
        </div>

        {importNotice && (
          <p className="text-xs font-medium text-blue-800 bg-blue-50 border border-blue-200 rounded-md px-3.5 py-2.5">
            {importNotice}
          </p>
        )}

        {/* Single Record Quick Add */}
        <form onSubmit={handleAddSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
          <div className="lg:col-span-6">
            <label htmlFor="new-sample-text" className="block text-xs font-medium text-slate-600 mb-1.5">
              Add Single Labeled Training Message
            </label>
            <input
              id="new-sample-text"
              type="text"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Enter message text to add to the labeled dataset..."
              className="w-full rounded-md border border-slate-300 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </div>

          <div className="lg:col-span-2">
            <label htmlFor="new-sample-source" className="block text-xs font-medium text-slate-600 mb-1.5">
              Source
            </label>
            <select
              id="new-sample-source"
              value={newSource}
              onChange={(e) => setNewSource(e.target.value as MessageSource)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            >
              <option value="SMS">SMS</option>
              <option value="Email">Email</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <label htmlFor="new-sample-label" className="block text-xs font-medium text-slate-600 mb-1.5">
              Label
            </label>
            <select
              id="new-sample-label"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value as MessageLabel)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            >
              <option value="Spam">Spam</option>
              <option value="Ham">Ham</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <button
              type="submit"
              disabled={newText.trim().length < 3}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Add & Retrain
            </button>
          </div>
        </form>
      </section>

      {/* Corpus Browser Table */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Labeled Corpus Browser
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 font-mono tabular-nums">
              Showing {filteredRecords.length} of {dataset.length} records
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search corpus text or ID..."
                className="pl-9 pr-3 py-1.5 text-xs rounded-md border border-slate-300 w-56 focus:border-blue-600 focus:outline-none"
              />
            </div>

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

        <div className="mt-4 max-h-96 overflow-y-auto overflow-x-auto">
          {filteredRecords.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              No dataset records match your current search and filter criteria.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500">
                <tr>
                  <th className="py-2.5 px-3 w-24">ID</th>
                  <th className="py-2.5 px-3 w-20">Source</th>
                  <th className="py-2.5 px-3 w-20">Label</th>
                  <th className="py-2.5 px-3">Message Text</th>
                  <th className="py-2.5 px-3 w-16 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                      {rec.id}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{rec.source}</td>
                    <td
                      className={`py-2.5 px-3 font-semibold whitespace-nowrap ${
                        rec.label === 'Spam' ? 'text-red-700' : 'text-emerald-700'
                      }`}
                    >
                      {rec.label}
                    </td>
                    <td className="py-2.5 px-3 text-slate-800 max-w-2xl">
                      <p className="line-clamp-2">{rec.text}</p>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => onDeleteRecord(rec.id)}
                        disabled={dataset.length <= 20}
                        title={
                          dataset.length <= 20
                            ? 'Keep at least 20 records for train/test split'
                            : 'Delete record'
                        }
                        className="p-1.5 text-slate-400 hover:text-red-700 disabled:opacity-30 transition-colors"
                        aria-label={`Delete ${rec.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
};
