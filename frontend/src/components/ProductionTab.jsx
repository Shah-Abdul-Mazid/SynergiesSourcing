import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function ProductionTab({ orders = [] }) {
  const [productionOrders, setProductionOrders] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [prodNotes, setProdNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchProductionOrders();
    fetchAnalytics();
  }, []);

  const fetchProductionOrders = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/production/orders');
      setProductionOrders(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const res = await axios.get('/production/analytics');
      setAnalytics(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const handleRegisterProduction = async () => {
    if (!selectedOrderId) return;
    setSubmitting(true);
    try {
      const payload = {
        order_id: selectedOrderId,
        status: 'Planned',
        progress_pct: 0.0,
        risk_score: 15.0,
        notes: prodNotes
      };
      await axios.post('/production/orders', payload);
      setSelectedOrderId('');
      setProdNotes('');
      await fetchProductionOrders();
      await fetchAnalytics();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (prodId, currentStatus, currentProgress) => {
    let nextStatus = 'Planned';
    let nextProgress = 0.0;
    let nextRisk = 15.0;

    if (currentStatus === 'Planned') {
      nextStatus = 'In Progress';
      nextProgress = 30.0;
      nextRisk = 30.0;
    } else if (currentStatus === 'In Progress') {
      nextStatus = 'QC';
      nextProgress = 80.0;
      nextRisk = 10.0;
    } else if (currentStatus === 'QC') {
      nextStatus = 'Completed';
      nextProgress = 100.0;
      nextRisk = 5.0;
    } else {
      nextStatus = 'Planned';
      nextProgress = 0.0;
      nextRisk = 15.0;
    }

    try {
      await axios.put(`/production/orders/${prodId}/status`, {
        status: nextStatus,
        progress_pct: nextProgress,
        risk_score: nextRisk
      });
      await fetchProductionOrders();
      await fetchAnalytics();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Production Tracking Dashboard</h2>
          <p className="text-xs text-slate-400 font-normal">Track sewing progress, review machine bottlenecks, adjust scheduling, and query AI risk parameters.</p>
        </div>
        <button onClick={() => { fetchProductionOrders(); fetchAnalytics(); }} className="text-xs font-bold bg-slate-800 hover:bg-slate-750 text-indigo-350 px-3.5 py-2 rounded-xl border border-slate-750 transition-all">
          🔄 Refresh Operations
        </button>
      </div>

      {/* Analytics Summary */}
      {analytics && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl glass-panel text-left">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Active Production Lines</span>
            <span className="text-2xl font-extrabold text-slate-100 mt-1 block">
              {analytics.active_production_lines}
            </span>
            <span className="text-[10px] text-indigo-400 font-semibold block mt-1">Total active lines</span>
          </div>
          <div className="p-5 rounded-2xl glass-panel text-left">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Average Completion Progress</span>
            <span className="text-2xl font-extrabold text-slate-100 mt-1 block">
              {analytics.average_progress_pct?.toFixed(1)}%
            </span>
            <div className="w-full bg-slate-950 rounded-full h-1.5 mt-2 overflow-hidden">
              <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${analytics.average_progress_pct}%` }} />
            </div>
          </div>
          <div className="p-5 rounded-2xl glass-panel text-left">
            <span className="text-[10px] font-bold text-rose-500 uppercase block animate-pulse">Critical Lines At Risk</span>
            <span className="text-2xl font-extrabold text-slate-100 mt-1 block">
              {analytics.high_risk_lines}
            </span>
            <span className="text-[10px] text-rose-350 font-semibold block mt-1">Flagged with bottleneck warnings</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Production tracking table */}
        <div className="lg:col-span-8 space-y-4">
          <div className="rounded-2xl glass-panel overflow-hidden">
            <div className="p-4 bg-slate-900/40 border-b border-slate-800">
              <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Line Optimization Registry</h3>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-500 text-xs">
                <span className="animate-spin inline-block w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full mr-2" />
                Reading scanner sensors...
              </div>
            ) : productionOrders.length === 0 ? (
              <div className="p-12 text-center text-slate-550 italic text-xs">
                No active production tracking lines found. Initialize one using the right panel.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/30 text-slate-400 font-semibold text-xs tracking-wider uppercase">
                      <th className="p-4">Line ID</th>
                      <th className="p-4">Contract ID</th>
                      <th className="p-4">Process status</th>
                      <th className="p-4">Progress</th>
                      <th className="p-4">AI Risk</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850/80 text-xs">
                    {productionOrders.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-850/20 transition-colors">
                        <td className="p-4 font-mono font-bold text-slate-400">#L-{p.production_id}</td>
                        <td className="p-4 font-mono font-bold text-indigo-400">{p.order_id}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                            p.status === 'Completed'
                              ? 'bg-emerald-950/40 text-emerald-450 border-emerald-900/60'
                              : p.status === 'QC'
                              ? 'bg-indigo-950/40 text-indigo-450 border-indigo-900/60'
                              : p.status === 'In Progress'
                              ? 'bg-amber-950/40 text-amber-450 border-amber-900/60'
                              : 'bg-slate-900 text-slate-400 border-slate-850'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="p-4 w-40">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-[10px] text-slate-350">{p.progress_pct}%</span>
                            <div className="flex-1 bg-slate-950 rounded-full h-1.5 overflow-hidden">
                              <div className="bg-indigo-500 h-full" style={{ width: `${p.progress_pct}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`font-mono font-semibold ${p.risk_score > 60.0 ? 'text-rose-450 font-bold' : p.risk_score > 30.0 ? 'text-amber-450' : 'text-slate-450'}`}>
                            {p.risk_score.toFixed(0)}%
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleUpdateStatus(p.production_id, p.status, p.progress_pct)}
                            className="text-[10px] bg-indigo-650 hover:bg-indigo-600 text-white font-bold px-2.5 py-1 rounded-lg transition-all"
                          >
                            ⏩ Next Phase
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right side form and AI advice */}
        <div className="lg:col-span-4 space-y-4">
          {/* Register production line */}
          <div className="p-5 rounded-2xl glass-panel space-y-4">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Initialize Production Line</h3>
            
            {/* Select PO */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase block">Purchase Order ID</label>
              <select
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="">-- Select Order ID --</option>
                {orders.map((o) => (
                  <option key={o.order_id} value={o.order_id}>
                    {o.order_id} - {o.buyer_name} ({o.item})
                  </option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase block">Line schedule details</label>
              <textarea
                placeholder="E.g. Line 2 allocated for sewing start. Secondary QC checks mandatory."
                value={prodNotes}
                onChange={(e) => setProdNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 h-20 resize-none font-sans"
              />
            </div>

            <button
              onClick={handleRegisterProduction}
              disabled={submitting || !selectedOrderId}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 text-white font-semibold text-xs py-3 rounded-xl shadow-lg transition-all"
            >
              {submitting ? 'Registering...' : '🏗 Start Production Tracking'}
            </button>
          </div>

          {/* AI Production Advice */}
          <div className="p-5 rounded-2xl glass-panel space-y-3">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider block">AI Scheduling Recommendations</h3>
            {loadingAnalytics ? (
              <div className="text-center py-6 text-slate-500 text-xs">
                <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-slate-500 border-t-transparent rounded-full mr-2" />
                Querying line status...
              </div>
            ) : (
              <div className="text-xs text-slate-350 leading-relaxed whitespace-pre-wrap font-sans">
                {analytics?.ai_operational_advice}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
