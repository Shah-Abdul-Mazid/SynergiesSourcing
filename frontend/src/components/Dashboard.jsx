import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function Dashboard({ 
  inventory = [], 
  orders = [], 
  qcLogs = [], 
  setActiveTab 
}) {
  const [dashboardInsight, setDashboardInsight] = useState('');

  useEffect(() => {
    fetchDashboardInsight();
  }, [orders, inventory, qcLogs]);

  const fetchDashboardInsight = async () => {
    try {
      const res = await axios.get('/reports/executive-summary');
      setDashboardInsight(res.data.executive_summary);
    } catch (err) {
      console.error(err);
      setDashboardInsight('Dashboard AI executive summary uncompiled.');
    }
  };

  // Aggregate Metrics
  const activeOrdersCount = orders.length;
  const highRiskCount = orders.filter(o => o.risk_level === 'High').bind ? 0 : orders.filter(o => o.risk_level === 'High').length;
  const warningOrdersCount = orders.filter(o => o.status === 'Risk Warning').length;
  
  // Total material stock volume sum
  const totalStockVolume = inventory.reduce((acc, curr) => acc + curr.quantity, 0);

  // QC Pass Rate calculations
  const totalQCRuns = qcLogs.length;
  const qcPassedCount = qcLogs.filter(log => log.status === 'Passed').length;
  const qcPassRate = totalQCRuns > 0 ? (qcPassedCount / totalQCRuns) * 100 : 100.0;

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="flex justify-between items-center bg-gradient-to-r from-indigo-950/40 via-indigo-900/20 to-slate-900/10 p-6 rounded-3xl border border-indigo-900/30">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">SmartFactory Operations Center</h2>
          <p className="text-xs text-slate-400 mt-1">Real-time ERP ledger analytics integrated with deep visual inspection models and supply chain risk calculations.</p>
        </div>
        <div className="text-right hidden sm:block">
          <span className="text-[10px] font-bold text-indigo-400 tracking-wider uppercase block">System Time</span>
          <span className="font-mono text-sm text-slate-350">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      {/* AI Executive Summary Block */}
      <div className="p-5 rounded-2xl glass-panel bg-gradient-to-br from-slate-900/60 to-indigo-950/20 border-slate-800 space-y-2.5">
        <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">⚡ AI Executive Briefing & Daily Insights</h3>
        {dashboardInsight ? (
          <div className="text-xs text-slate-350 leading-relaxed whitespace-pre-wrap font-sans">
            {dashboardInsight}
          </div>
        ) : (
          <div className="text-xs text-slate-500 italic flex items-center gap-2">
            <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-slate-500 border-t-transparent rounded-full" />
            Compiling ledger indexes...
          </div>
        )}
      </div>

      {/* Primary KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Active POs */}
        <div className="p-5 rounded-2xl glass-panel flex items-center justify-between shadow-xl shadow-slate-950/20">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Active Contracts</span>
            <span className="text-2xl font-extrabold text-slate-100 mt-1 block">{activeOrdersCount}</span>
            <span className="text-[10px] text-indigo-400 font-semibold block mt-1">Purchase Orders logged</span>
          </div>
          <div className="w-12 h-12 bg-indigo-950/40 border border-indigo-900/30 rounded-xl flex items-center justify-center text-xl text-indigo-400">
            📦
          </div>
        </div>

        {/* Total inventory */}
        <div className="p-5 rounded-2xl glass-panel flex items-center justify-between shadow-xl shadow-slate-950/20">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Sourced Raw Materials</span>
            <span className="text-2xl font-extrabold text-slate-100 mt-1 block">{totalStockVolume.toLocaleString()}</span>
            <span className="text-[10px] text-indigo-400 font-semibold block mt-1">Total items in warehouse</span>
          </div>
          <div className="w-12 h-12 bg-indigo-950/40 border border-indigo-900/30 rounded-xl flex items-center justify-center text-xl text-indigo-400">
            🧵
          </div>
        </div>

        {/* QC pass rate */}
        <div className="p-5 rounded-2xl glass-panel flex items-center justify-between shadow-xl shadow-slate-950/20">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">QC Inspection Pass Rate</span>
            <span className="text-2xl font-extrabold text-slate-100 mt-1 block">{qcPassRate.toFixed(1)}%</span>
            <span className="text-[10px] text-emerald-400 font-semibold block mt-1">{qcPassedCount} of {totalQCRuns} checks passed</span>
          </div>
          <div className="w-12 h-12 bg-emerald-950/30 border border-emerald-900/30 rounded-xl flex items-center justify-center text-xl text-emerald-400">
            🔍
          </div>
        </div>

        {/* Warning Alerts */}
        <div className={`p-5 rounded-2xl glass-panel flex items-center justify-between shadow-xl shadow-slate-950/20 border transition-colors ${
          highRiskCount > 0 ? 'border-rose-900/60 bg-rose-950/10' : ''
        }`}>
          <div>
            <span className={`text-[10px] font-bold uppercase tracking-wider block ${highRiskCount > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-500'}`}>
              Pending Risk Alerts
            </span>
            <span className="text-2xl font-extrabold text-slate-100 mt-1 block">{highRiskCount}</span>
            <span className={`text-[10px] font-semibold block mt-1 ${highRiskCount > 0 ? 'text-rose-300' : 'text-slate-400'}`}>
              {warningOrdersCount} orders flagged warning
            </span>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${
            highRiskCount > 0 
              ? 'bg-rose-900/30 border border-rose-800/40 text-rose-450 animate-bounce' 
              : 'bg-slate-950/40 border border-slate-850 text-slate-400'
          }`}>
            ⚠️
          </div>
        </div>
      </div>

      {/* Main split dashboards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Recent Materials Storage Capacity */}
        <div className="lg:col-span-7 p-6 rounded-2xl glass-panel space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Material Stocks Capacity Log</h3>
            <button 
              onClick={() => setActiveTab('techpack')} 
              className="text-[10px] font-bold text-indigo-400 hover:underline"
            >
              Update via Ingestion +
            </button>
          </div>
          
          <div className="space-y-4 pt-2">
            {inventory.length === 0 ? (
              <p className="text-xs text-slate-500 italic text-center py-6">No materials logged.</p>
            ) : (
              inventory.map((inv, idx) => {
                // Calculate percentage relative to a mock warehouse limit of 10000 units
                const limit = 10000.0;
                const percentage = Math.min((inv.quantity / limit) * 100, 100);
                
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-350 capitalize">{inv.item}</span>
                      <span className="font-mono text-slate-200">
                        {inv.quantity.toLocaleString()} / <span className="text-slate-500">{limit.toLocaleString()} {inv.unit}</span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 border border-slate-900 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Quick Action Panels */}
        <div className="lg:col-span-5 p-6 rounded-2xl glass-panel space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-3">AI Quick Launch Workflows</h3>
            <p className="text-xs text-slate-400">Trigger automated merchandiser pipelines by launching corresponding AI interfaces.</p>
          </div>
          
          <div className="space-y-3 pt-2 flex-1 flex flex-col justify-center">
            {/* Quick Sourcing */}
            <button
              onClick={() => setActiveTab('techpack')}
              className="w-full flex items-center justify-between p-3.5 bg-slate-950 hover:bg-slate-900 border border-slate-850 rounded-xl transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">📄</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Parse Buyer Tech Pack</h4>
                  <p className="text-[10px] text-slate-550">Runs LLM extraction to update database logs.</p>
                </div>
              </div>
              <span className="text-indigo-400 text-xs">➔</span>
            </button>

            {/* Quick Risk Analysis */}
            <button
              onClick={() => setActiveTab('logistics')}
              className="w-full flex items-center justify-between p-3.5 bg-slate-950 hover:bg-slate-900 border border-slate-850 rounded-xl transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">🚢</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Run Supply Disruption Simulator</h4>
                  <p className="text-[10px] text-slate-550">Analyses delays and generates alternatives.</p>
                </div>
              </div>
              <span className="text-indigo-400 text-xs">➔</span>
            </button>

            {/* Quick Quality check */}
            <button
              onClick={() => setActiveTab('qc')}
              className="w-full flex items-center justify-between p-3.5 bg-slate-950 hover:bg-slate-900 border border-slate-850 rounded-xl transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">🔍</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Run Fabric Defect Scan (YOLO)</h4>
                  <p className="text-[10px] text-slate-550">Processes fabric frame through neural networks.</p>
                </div>
              </div>
              <span className="text-indigo-400 text-xs">➔</span>
            </button>
          </div>

          <div className="text-[10px] text-slate-550 text-center italic border-t border-slate-850 pt-3">
            Garment Buy-house Automation Engine
          </div>
        </div>
      </div>
    </div>
  );
}
