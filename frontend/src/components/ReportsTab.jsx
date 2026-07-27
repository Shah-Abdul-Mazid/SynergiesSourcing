import React, { useState } from 'react';
import axios from 'axios';

export default function ReportsTab() {
  const [activeTab, setActiveTab] = useState('summary');
  const [nlPrompt, setNlPrompt] = useState('');
  const [nlResults, setNlResults] = useState(null);
  const [nlLoading, setNlLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Executive summary AI report state
  const [execSummary, setExecSummary] = useState('');
  const [execLoading, setExecLoading] = useState(false);

  const fetchExecSummary = async () => {
    setExecLoading(true);
    setError('');
    try {
      const res = await axios.get('/reports/executive-summary');
      setExecSummary(res.data.executive_summary);
    } catch (err) {
      console.error(err);
      setError('Failed to query local LLM context.');
    } finally {
      setExecLoading(false);
    }
  };

  const handleRunNLQuery = async () => {
    if (!nlPrompt.trim()) return;
    setNlLoading(true);
    setNlResults(null);
    setError('');
    
    try {
      const res = await axios.get(`/reports/nl-query?query=${encodeURIComponent(nlPrompt)}`);
      setNlResults(res.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'SQL Agent query validation failure.');
    } finally {
      setNlLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!nlResults || !nlResults.results || nlResults.results.length === 0) return;
    
    const data = nlResults.results;
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','), // Header row
      ...data.map(row => headers.map(fieldName => JSON.stringify(row[fieldName] || '')).join(','))
    ];
    
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sql_agent_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center print:hidden">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Enterprise Reports & BI</h2>
          <p className="text-xs text-slate-400 font-normal">Generate summaries, run natural language database queries, and export reports to PDF or CSV.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('summary')}
            className={`text-xs font-bold px-3.5 py-2 rounded-xl border transition-all ${
              activeTab === 'summary' 
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/10' 
                : 'bg-slate-800 hover:bg-slate-750 text-slate-350 border-slate-750'
            }`}
          >
            📊 Executive Summary
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            className={`text-xs font-bold px-3.5 py-2 rounded-xl border transition-all ${
              activeTab === 'sql' 
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/10' 
                : 'bg-slate-800 hover:bg-slate-750 text-slate-350 border-slate-750'
            }`}
          >
            💻 NL Database Query Agent
          </button>
        </div>
      </div>

      {activeTab === 'summary' ? (
        <div className="space-y-4">
          <div className="p-6 rounded-2xl glass-panel space-y-4">
            <div className="flex justify-between items-center print:hidden">
              <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">AI Executive Briefing</h3>
              <div className="flex gap-2">
                <button
                  onClick={fetchExecSummary}
                  disabled={execLoading}
                  className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-xl transition-all"
                >
                  {execLoading ? 'Analyzing...' : '⚡ Generate AI Analysis'}
                </button>
                {execSummary && (
                  <button
                    onClick={handlePrint}
                    className="text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-indigo-350 px-3 py-1.5 rounded-xl border border-slate-750 transition-all"
                  >
                    🖨️ Export PDF / Print
                  </button>
                )}
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-450 text-xs font-medium print:hidden">
                ⚠️ {error}
              </div>
            )}

            {!execSummary && !execLoading ? (
              <div className="h-64 border border-dashed border-slate-850 rounded-2xl flex flex-col items-center justify-center text-center p-6 space-y-2">
                <span className="text-3xl">📊</span>
                <p className="text-xs font-semibold text-slate-300">Operations Briefing Uncompiled</p>
                <p className="text-[10px] text-slate-500 max-w-sm">Trigger the AI generation engine to run queries across all active orders, inventory counts, and QC transaction ledgers.</p>
              </div>
            ) : execLoading ? (
              <div className="h-64 flex flex-col items-center justify-center space-y-3 text-xs text-slate-500">
                <span className="animate-spin inline-block w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full" />
                <span>Aggregating warehouse stock capacity and contract delay profiles via LLM...</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="hidden print:block border-b border-slate-300 pb-3 mb-6">
                  <h1 className="text-2xl font-bold text-slate-900">SMARTFACTORY AI-ERP BRIEFING REPORT</h1>
                  <span className="text-xs text-slate-500 font-mono">Date: {new Date().toLocaleDateString()}</span>
                </div>
                <div className="prose prose-invert max-w-none text-slate-300 text-sm whitespace-pre-wrap leading-relaxed print:text-slate-900 print:text-xs">
                  {execSummary}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Query input card */}
          <div className="p-5 rounded-2xl glass-panel space-y-4 print:hidden">
            <div>
              <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Natural Language Database Query Agent</h3>
              <p className="text-xs text-slate-400 mt-1">Translate plain English queries into secure SQL SELECT commands and execute them on the active database.</p>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="E.g., Which supplier has the most defects? or Show safety stock warnings"
                value={nlPrompt}
                onChange={(e) => setNlPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRunNLQuery()}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={handleRunNLQuery}
                disabled={nlLoading || !nlPrompt.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all"
              >
                {nlLoading ? 'Running query...' : '🔍 Execute Query'}
              </button>
            </div>
            
            {/* Quick Suggestions */}
            <div className="flex flex-wrap gap-2 text-[10px]">
              <span className="text-slate-500 font-bold self-center">Quick Queries:</span>
              {["Show delayed purchase orders", "Which supplier has highest risk?", "List materials below safety stock", "Show all QC logs"].map((q, idx) => (
                <button 
                  key={idx} 
                  onClick={() => { setNlPrompt(q); }} 
                  className="bg-slate-900 hover:bg-slate-800 text-indigo-400 border border-slate-800 px-2.5 py-1 rounded-lg transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-450 text-xs font-medium print:hidden">
              ⚠️ {error}
            </div>
          )}

          {/* Results Display */}
          {nlResults && (
            <div className="space-y-6">
              {/* Executive Summary Narrative */}
              <div className="p-5 rounded-2xl glass-panel space-y-2">
                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">AI Agent Interpretation</h4>
                <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                  {nlResults.ai_summary}
                </div>
              </div>

              {/* Data Table */}
              <div className="rounded-2xl glass-panel overflow-hidden">
                <div className="p-4 bg-slate-900/40 border-b border-slate-800 flex justify-between items-center print:hidden">
                  <div>
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Results Grid</h4>
                    <span className="text-[9px] text-slate-500 font-mono block mt-1">Generated SQL: <code className="text-slate-400 font-bold">{nlResults.sql_query}</code></span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleExportCSV}
                      className="text-xs font-bold bg-slate-800 hover:bg-slate-750 text-indigo-350 px-3.5 py-2 rounded-xl border border-slate-750 transition-all"
                    >
                      📥 Export CSV
                    </button>
                    <button
                      onClick={handlePrint}
                      className="text-xs font-bold bg-slate-800 hover:bg-slate-750 text-indigo-350 px-3.5 py-2 rounded-xl border border-slate-750 transition-all"
                    >
                      🖨️ Export PDF / Print
                    </button>
                  </div>
                </div>

                {nlResults.results.length === 0 ? (
                  <div className="p-12 text-center text-slate-550 italic text-xs">
                    Query completed successfully. Result set is empty.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-900/30 text-slate-400 font-semibold text-xs tracking-wider uppercase">
                          {Object.keys(nlResults.results[0]).map((key, i) => (
                            <th key={i} className="p-4">{key.replace(/_/g, ' ')}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850/80 text-xs">
                        {nlResults.results.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-850/20 transition-colors">
                            {Object.values(row).map((val, cIdx) => (
                              <td key={cIdx} className="p-4 text-slate-350 font-medium">
                                {typeof val === 'number' && val <= 1 && val > 0 ? (val * 100).toFixed(0) + '%' : String(val)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
