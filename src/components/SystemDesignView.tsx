import React, { useState } from 'react';

type DfdTab = 'level0' | 'level1' | 'level2' | 'all';

const SOFTWARE_REQUIREMENTS = [
  { tech: 'Python / TypeScript ML Engine', purpose: 'Core NLP & Machine Learning classification implementation' },
  { tech: 'Pandas / CSV Parser', purpose: 'Dataset ingestion, cleaning, and tabular manipulation' },
  { tech: 'NumPy / Vector Math', purpose: 'Sparse TF-IDF / Bag of Words numerical vector operations' },
  { tech: 'NLTK / Stemming Pipeline', purpose: 'Lowercasing, punctuation stripping, stop word removal, stemming' },
  { tech: 'Matplotlib / Recharts', purpose: 'EDA histograms, class balance, and performance metric charts' },
  { tech: 'Scikit-learn Algorithms', purpose: 'Multinomial Naive Bayes, Logistic Regression, Linear SVM' },
  { tech: 'Excel / CSV', purpose: 'Labeled dataset storage and Message Table export' },
  { tech: 'Git / GitHub', purpose: 'Version control and academic project management' },
];

const HARDWARE_REQUIREMENTS = [
  { component: 'Processor', requirement: 'Intel Core i3 or above' },
  { component: 'RAM', requirement: '4 GB minimum, 8 GB recommended' },
  { component: 'Storage', requirement: 'At least 10 GB free space' },
  { component: 'Operating System', requirement: 'Windows / Linux / macOS' },
  { component: 'Internet', requirement: 'Required for downloading datasets and libraries' },
];

const PROJECT_TIMEFRAME = [
  { phase: 'Phase 1', work: 'Project selection and requirement analysis', duration: 'Week 1' },
  { phase: 'Phase 2', work: 'Dataset collection and understanding', duration: 'Week 2' },
  { phase: 'Phase 3', work: 'Text preprocessing', duration: 'Week 3' },
  { phase: 'Phase 4', work: 'Exploratory Data Analysis and visualization', duration: 'Week 4' },
  { phase: 'Phase 5', work: 'Feature extraction (Bag of Words / TF-IDF)', duration: 'Week 5' },
  { phase: 'Phase 6', work: 'Machine learning model development', duration: 'Week 6' },
  { phase: 'Phase 7', work: 'Model evaluation and improvement', duration: 'Week 7' },
  { phase: 'Phase 8', work: 'Prediction system development', duration: 'Week 8' },
  { phase: 'Phase 9', work: 'Testing and validation', duration: 'Week 9' },
  { phase: 'Phase 10', work: 'Documentation and final presentation', duration: 'Week 10' },
];

const SYSTEM_COMPARISON = [
  {
    aspect: 'Detection Mechanism',
    existing: 'Static blacklisted keywords, sender addresses, and manual rules',
    proposed: 'Statistical NLP preprocessing + TF-IDF/BoW + supervised ML classifiers',
  },
  {
    aspect: 'Adaptation to New Spam',
    existing: 'Cannot adapt automatically; blacklists must be updated manually',
    proposed: 'Learns evolving patterns automatically whenever retrained with new samples',
  },
  {
    aspect: 'Obfuscation Resilience',
    existing: 'Easily bypassed by altered wording, punctuation, or formatting',
    proposed: 'Handles stemming, n-grams, capitalization ratios, and URL/currency features',
  },
  {
    aspect: 'False Positive Control',
    existing: 'Binary keyword hits cause frequent false positives on legitimate messages',
    proposed: 'Calibrated probabilities with adjustable decision threshold and feedback loop',
  },
  {
    aspect: 'Performance Transparency',
    existing: 'No standardized quantitative model evaluation metrics',
    proposed: 'Live Accuracy, Precision, Recall, F1-Score, and Confusion Matrix reporting',
  },
];

const DfdLevel0Svg: React.FC = () => (
  <svg
    viewBox="0 0 860 220"
    className="w-full h-auto max-w-4xl mx-auto"
    role="img"
    aria-label="DFD Level 0 Context Diagram"
  >
    <defs>
      <marker id="arrow-l0" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M 0 1 L 10 5 L 0 9 z" fill="#334155" />
      </marker>
    </defs>

    {/* External Entity: User */}
    <rect x="28" y="70" width="150" height="76" rx="4" fill="#F8FAFC" stroke="#1E293B" strokeWidth="1.5" />
    <text x="103" y="104" textAnchor="middle" fontSize="13" fontWeight="600" fill="#0F172A">
      External Entity
    </text>
    <text x="103" y="124" textAnchor="middle" fontSize="14" fontWeight="700" fill="#1D4ED8">
      User
    </text>

    {/* Main Process 0.0 */}
    <rect x="315" y="48" width="230" height="120" rx="14" fill="#EFF6FF" stroke="#1D4ED8" strokeWidth="1.75" />
    <line x1="315" y1="80" x2="545" y2="80" stroke="#93C5FD" strokeWidth="1" />
    <text x="430" y="69" textAnchor="middle" fontSize="12" fontWeight="600" fill="#1D4ED8" fontFamily="JetBrains Mono, monospace">
      Process 0.0
    </text>
    <text x="430" y="109" textAnchor="middle" fontSize="14" fontWeight="700" fill="#0F172A">
      Spam Email / SMS
    </text>
    <text x="430" y="131" textAnchor="middle" fontSize="14" fontWeight="700" fill="#0F172A">
      Detection System
    </text>

    {/* Output Sink / Report View */}
    <rect x="678" y="70" width="156" height="76" rx="4" fill="#F8FAFC" stroke="#1E293B" strokeWidth="1.5" />
    <text x="756" y="102" textAnchor="middle" fontSize="13" fontWeight="700" fill="#0F172A">
      Classification Output
    </text>
    <text x="756" y="123" textAnchor="middle" fontSize="11.5" fill="#475569">
      Spam / Ham & Metrics
    </text>

    {/* Input Arrow */}
    <line x1="178" y1="92" x2="310" y2="92" stroke="#334155" strokeWidth="1.5" markerEnd="url(#arrow-l0)" />
    <text x="244" y="82" textAnchor="middle" fontSize="11.5" fontWeight="500" fill="#334155">
      Email / SMS Message
    </text>

    {/* Return Feedback Arrow */}
    <line x1="315" y1="130" x2="183" y2="130" stroke="#334155" strokeWidth="1.5" markerEnd="url(#arrow-l0)" />
    <text x="249" y="148" textAnchor="middle" fontSize="11.5" fontWeight="500" fill="#334155">
      Verdict & Metrics
    </text>

    {/* Output Arrow */}
    <line x1="545" y1="108" x2="673" y2="108" stroke="#334155" strokeWidth="1.5" markerEnd="url(#arrow-l0)" />
    <text x="609" y="97" textAnchor="middle" fontSize="11.5" fontWeight="500" fill="#334155">
      Prediction Report
    </text>
  </svg>
);

const DfdLevel1Svg: React.FC = () => (
  <svg
    viewBox="0 0 960 330"
    className="w-full h-auto"
    role="img"
    aria-label="DFD Level 1 System Processes Diagram"
  >
    <defs>
      <marker id="arrow-l1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
        <path d="M 0 1 L 10 5 L 0 9 z" fill="#334155" />
      </marker>
    </defs>

    {/* Process Nodes Row */}
    {[
      { x: 24, num: '1.0', title: 'Data Collection', sub: 'Email / SMS CSV' },
      { x: 210, num: '2.0', title: 'Text Preprocessing', sub: 'Clean, Stopwords, Stem' },
      { x: 396, num: '3.0', title: 'Feature Extraction', sub: 'TF-IDF / Bag of Words' },
      { x: 582, num: '4.0', title: 'Machine Learning', sub: 'Split, Train, Evaluate' },
      { x: 768, num: '5.0', title: 'Prediction & Report', sub: 'Spam/Ham + Metrics' },
    ].map((node, idx, arr) => (
      <g key={node.num}>
        <rect
          x={node.x}
          y={42}
          width={162}
          height={98}
          rx={10}
          fill="#FFFFFF"
          stroke="#1D4ED8"
          strokeWidth="1.5"
        />
        <line x1={node.x} y1={70} x2={node.x + 162} y2={70} stroke="#CBD5E1" strokeWidth="1" />
        <text
          x={node.x + 81}
          y={60}
          textAnchor="middle"
          fontSize="11.5"
          fontWeight="600"
          fill="#1D4ED8"
          fontFamily="JetBrains Mono, monospace"
        >
          Process {node.num}
        </text>
        <text
          x={node.x + 81}
          y={97}
          textAnchor="middle"
          fontSize="12.5"
          fontWeight="700"
          fill="#0F172A"
        >
          {node.title}
        </text>
        <text
          x={node.x + 81}
          y={118}
          textAnchor="middle"
          fontSize="11"
          fill="#475569"
        >
          {node.sub}
        </text>
        {idx < arr.length - 1 && (
          <line
            x1={node.x + 162}
            y1={91}
            x2={arr[idx + 1].x - 5}
            y2={91}
            stroke="#334155"
            strokeWidth="1.5"
            markerEnd="url(#arrow-l1)"
          />
        )}
      </g>
    ))}

    {/* Data Store D1: Labeled Dataset */}
    <g transform="translate(80, 224)">
      <line x1="0" y1="0" x2="240" y2="0" stroke="#0F172A" strokeWidth="1.5" />
      <line x1="0" y1="54" x2="240" y2="54" stroke="#0F172A" strokeWidth="1.5" />
      <line x1="0" y1="0" x2="0" y2="54" stroke="#0F172A" strokeWidth="1.5" />
      <line x1="46" y1="0" x2="46" y2="54" stroke="#94A3B8" strokeWidth="1" />
      <text x="23" y="32" textAnchor="middle" fontSize="12" fontWeight="700" fill="#0F172A" fontFamily="JetBrains Mono, monospace">
        D1
      </text>
      <text x="143" y="24" textAnchor="middle" fontSize="12.5" fontWeight="700" fill="#0F172A">
        Labeled Corpus Store
      </text>
      <text x="143" y="42" textAnchor="middle" fontSize="11" fill="#475569">
        Email & SMS Spam/Ham Dataset
      </text>
    </g>

    {/* Data Store D2: Message Table */}
    <g transform="translate(615, 224)">
      <line x1="0" y1="0" x2="265" y2="0" stroke="#0F172A" strokeWidth="1.5" />
      <line x1="0" y1="54" x2="265" y2="54" stroke="#0F172A" strokeWidth="1.5" />
      <line x1="0" y1="0" x2="0" y2="54" stroke="#0F172A" strokeWidth="1.5" />
      <line x1="46" y1="0" x2="46" y2="54" stroke="#94A3B8" strokeWidth="1" />
      <text x="23" y="32" textAnchor="middle" fontSize="12" fontWeight="700" fill="#0F172A" fontFamily="JetBrains Mono, monospace">
        D2
      </text>
      <text x="155" y="24" textAnchor="middle" fontSize="12.5" fontWeight="700" fill="#0F172A">
        Table 2.1 — Message Table
      </text>
      <text x="155" y="42" textAnchor="middle" fontSize="11" fill="#475569">
        ID, Text, Source, Date, Label, Conf.
      </text>
    </g>

    {/* Arrows to Data Stores */}
    <line x1="105" y1="140" x2="105" y2="219" stroke="#334155" strokeWidth="1.35" markerEnd="url(#arrow-l1)" />
    <text x="112" y="185" fontSize="11" fill="#475569">Store raw data</text>

    <line x1="250" y1="224" x2="250" y2="145" stroke="#334155" strokeWidth="1.35" markerEnd="url(#arrow-l1)" />
    <text x="258" y="185" fontSize="11" fill="#475569">Fetch messages</text>

    <line x1="849" y1="140" x2="849" y2="219" stroke="#334155" strokeWidth="1.35" markerEnd="url(#arrow-l1)" />
    <text x="745" y="185" fontSize="11" fill="#475569">Log predictions</text>
  </svg>
);

const DfdLevel2Svg: React.FC = () => (
  <svg
    viewBox="0 0 960 280"
    className="w-full h-auto"
    role="img"
    aria-label="DFD Level 2 Expanded Machine Learning Pipeline Diagram"
  >
    <defs>
      <marker id="arrow-l2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
        <path d="M 0 1 L 10 5 L 0 9 z" fill="#334155" />
      </marker>
    </defs>

    {/* Top Row (Steps 4.1 to 4.4) */}
    {[
      { x: 24, num: '4.1', title: 'Preprocessed Text', sub: 'Tokenized & Stemmed' },
      { x: 260, num: '4.2', title: 'Feature Extraction', sub: 'TF-IDF / BoW Vectors' },
      { x: 496, num: '4.3', title: 'Train-Test Split', sub: 'Stratified 80% / 20%' },
      { x: 732, num: '4.4', title: 'Model Training', sub: 'NB · LogReg · SVM' },
    ].map((node, idx, arr) => (
      <g key={node.num}>
        <rect x={node.x} y={24} width={196} height={84} rx={8} fill="#FFFFFF" stroke="#1E293B" strokeWidth="1.4" />
        <text x={node.x + 14} y={46} fontSize="11" fontWeight="600" fill="#1D4ED8" fontFamily="JetBrains Mono, monospace">
          {node.num}
        </text>
        <text x={node.x + 14} y={68} fontSize="13" fontWeight="700" fill="#0F172A">
          {node.title}
        </text>
        <text x={node.x + 14} y={88} fontSize="11" fill="#475569">
          {node.sub}
        </text>
        {idx < arr.length - 1 && (
          <line
            x1={node.x + 196}
            y1={66}
            x2={arr[idx + 1].x - 5}
            y2={66}
            stroke="#334155"
            strokeWidth="1.5"
            markerEnd="url(#arrow-l2)"
          />
        )}
      </g>
    ))}

    {/* Down connector from 4.4 to 4.5 */}
    <line x1="830" y1="108" x2="830" y2="162" stroke="#334155" strokeWidth="1.5" markerEnd="url(#arrow-l2)" />

    {/* Bottom Row (Right-to-Left: 4.5 -> 4.6 -> 4.7 -> 4.8) */}
    {[
      { x: 732, num: '4.5', title: 'Model Testing', sub: 'Predict on Held-Out Split' },
      { x: 496, num: '4.6', title: 'Evaluation Metrics', sub: 'Acc, Prec, Rec, F1, CM' },
      { x: 260, num: '4.7', title: 'Live Prediction', sub: 'Score Unseen Message' },
      { x: 24, num: '4.8', title: 'Spam / Ham Output', sub: 'Verdict & Confidence' },
    ].map((node, idx, arr) => (
      <g key={node.num}>
        <rect
          x={node.x}
          y={168}
          width={196}
          height={84}
          rx={8}
          fill={node.num === '4.8' ? '#EFF6FF' : '#FFFFFF'}
          stroke={node.num === '4.8' ? '#1D4ED8' : '#1E293B'}
          strokeWidth="1.4"
        />
        <text x={node.x + 14} y={190} fontSize="11" fontWeight="600" fill="#1D4ED8" fontFamily="JetBrains Mono, monospace">
          {node.num}
        </text>
        <text x={node.x + 14} y={212} fontSize="13" fontWeight="700" fill="#0F172A">
          {node.title}
        </text>
        <text x={node.x + 14} y={232} fontSize="11" fill="#475569">
          {node.sub}
        </text>
        {idx < arr.length - 1 && (
          <line
            x1={node.x}
            y1={210}
            x2={arr[idx + 1].x + 201}
            y2={210}
            stroke="#334155"
            strokeWidth="1.5"
            markerEnd="url(#arrow-l2)"
          />
        )}
      </g>
    ))}
  </svg>
);

export const SystemDesignView: React.FC = () => {
  const [dfdTab, setDfdTab] = useState<DfdTab>('level1');

  return (
    <div className="space-y-8">
      {/* Interactive Data Flow Diagrams (Chapter 2: Fig 2.1, 2.2, 2.3) */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Chapter 2 — Data Flow Diagrams (DFD)
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Interactive architectural diagrams illustrating data movement from raw message input to Spam/Ham classification.
            </p>
          </div>

          <div className="inline-flex items-center p-1 bg-slate-100 rounded-md">
            {(
              [
                { id: 'level0', label: 'DFD Level 0' },
                { id: 'level1', label: 'DFD Level 1' },
                { id: 'level2', label: 'DFD Level 2' },
                { id: 'all', label: 'All Levels' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setDfdTab(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  dfdTab === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 space-y-8">
          {(dfdTab === 'level0' || dfdTab === 'all') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">
                  Fig 2.1 — DFD Level 0 (Context Diagram)
                </h3>
                <span className="text-xs text-slate-500">
                  User → Spam Email/SMS Detection System → Classification Result
                </span>
              </div>
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-md overflow-x-auto">
                <DfdLevel0Svg />
              </div>
            </div>
          )}

          {(dfdTab === 'level1' || dfdTab === 'all') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">
                  Fig 2.2 — DFD Level 1 (Core System Processes)
                </h3>
                <span className="text-xs text-slate-500">
                  Processes 1.0–5.0 with Corpus & Message Table Data Stores
                </span>
              </div>
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-md overflow-x-auto">
                <DfdLevel1Svg />
              </div>
            </div>
          )}

          {(dfdTab === 'level2' || dfdTab === 'all') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">
                  Fig 2.3 — DFD Level 2 (Expanded Machine Learning Pipeline)
                </h3>
                <span className="text-xs text-slate-500">
                  TF-IDF → Train-Test Split → Training → Testing → Evaluation → Prediction
                </span>
              </div>
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-md overflow-x-auto">
                <DfdLevel2Svg />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Existing vs. Proposed System Comparison (§1.2 & §1.3) */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="pb-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">
            Existing Rule-Based Filters vs. Proposed ML System
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Summary of Literature Survey limitations (Section 1.2) addressed by the Proposed System (Section 1.3).
          </p>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
                <th className="py-3 pr-4 w-48">Dimension</th>
                <th className="py-3 px-4">Existing Rule-Based System</th>
                <th className="py-3 pl-4">Proposed NLP & ML System</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {SYSTEM_COMPARISON.map((row) => (
                <tr key={row.aspect}>
                  <td className="py-3 pr-4 font-semibold text-slate-900">{row.aspect}</td>
                  <td className="py-3 px-4 text-slate-600">{row.existing}</td>
                  <td className="py-3 pl-4 text-slate-900 font-medium">{row.proposed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Requirements & 10-Week Project Timeframe */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <section className="xl:col-span-6 bg-white border border-slate-200 rounded-lg p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Table 1.1 & 1.2 — Software & Hardware Requirements
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Section 1.5 technical environment specifications.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-3 font-medium">Software / Technology</th>
                  <th className="py-2 pl-3 font-medium">Purpose</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {SOFTWARE_REQUIREMENTS.map((row) => (
                  <tr key={row.tech}>
                    <td className="py-2.5 pr-3 font-semibold text-slate-800 whitespace-nowrap">
                      {row.tech}
                    </td>
                    <td className="py-2.5 pl-3 text-slate-600">{row.purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-4 border-t border-slate-200 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-3 font-medium">Hardware Component</th>
                  <th className="py-2 pl-3 font-medium">Minimum Requirement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {HARDWARE_REQUIREMENTS.map((row) => (
                  <tr key={row.component}>
                    <td className="py-2.5 pr-3 font-semibold text-slate-800 whitespace-nowrap">
                      {row.component}
                    </td>
                    <td className="py-2.5 pl-3 text-slate-600">{row.requirement}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="xl:col-span-6 bg-white border border-slate-200 rounded-lg p-6 flex flex-col justify-between space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Table 3.1 — Proposed Project Timeframe
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              10-week development schedule across collection, preprocessing, training, evaluation, and validation.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-3 font-medium">Phase</th>
                    <th className="py-2 px-3 font-medium">Work Package</th>
                    <th className="py-2 pl-3 text-right font-medium">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {PROJECT_TIMEFRAME.map((row) => (
                    <tr key={row.phase}>
                      <td className="py-2.5 pr-3 font-mono font-medium text-slate-700 whitespace-nowrap">
                        {row.phase}
                      </td>
                      <td className="py-2.5 px-3 text-slate-800">{row.work}</td>
                      <td className="py-2.5 pl-3 text-right font-mono tabular-nums text-slate-500 whitespace-nowrap">
                        {row.duration}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Academic Attribution Block */}
          <div className="pt-5 border-t border-slate-200 text-xs text-slate-600 space-y-1.5">
            <p className="font-semibold text-slate-900">Academic Project Specification</p>
            <p>
              Submitted by <span className="font-semibold text-slate-900">Rahul Kumar</span>
              <span aria-hidden="true"> · </span>
              Enroll No.: <span className="font-mono">MUIT/24-25/03072024007</span>
              <span aria-hidden="true"> · </span>
              Roll No.: <span className="font-mono">2402031117025</span>
            </p>
            <p>
              Under the guidance of <span className="font-semibold text-slate-900">Vaishali Shringi</span>
              <span aria-hidden="true"> · </span>
              Bachelor of Computer Application (Session 2026–2027)
            </p>
            <p className="text-slate-500">
              Maharishi School of Engineering & Technology, Maharishi University of Information Technology, Noida
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};
