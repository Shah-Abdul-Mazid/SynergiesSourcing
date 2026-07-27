import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function LogisticsTab({ 
  orders = [], 
  onAnalyzeDisruption 
}) {
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [disruptionVector, setDisruptionVector] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState('simulator');
  const [shipments, setShipments] = useState([]);
  const [loadingShipments, setLoadingShipments] = useState(false);

  useEffect(() => {
    if (activeSubTab === 'shipments') {
      fetchShipments();
    }
  }, [activeSubTab]);

  const fetchShipments = async () => {
    setLoadingShipments(true);
    try {
      const res = await axios.get('/orders');
      const allShipments = [];
      res.data.forEach(po => {
        if (po.shipments && po.shipments.length > 0) {
          po.shipments.forEach(s => {
            allShipments.push({
              ...s,
              po_item: po.item,
              po_buyer: po.buyer_name
            });
          });
        }
      });
      setShipments(allShipments);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingShipments(false);
    }
  };

  const sampleDisruptions = [
    {
      label: 'Port Congestion at Colombo (12-day delay)',
      text: 'Heavy monsoon weather and custom backlogs at the Port of Colombo have halted shipping containers containing our raw fabrics for 12 days.'
    },
    {
      label: 'Dye Factory Power Outage (5-day delay)',
      text: 'Local power rationing in the industrial zone has suspended the dyeing phase of yarn production, delaying dye batch completion by 5 working days.'
    },
    {
      label: 'Yarn Price Spikes (Supply scarcity)',
      text: 'Sudden pricing hikes in organic cotton yarn have forced our main vendor to limit yarn allocations, causing raw material sourcing bottlenecks.'
    }
  ];

  const handleSelectOrder = (e) => {
    setSelectedOrderId(e.target.value);
    setResult(null);
    setError('');
  };

  const handleLoadDisruption = (text) => {
    setDisruptionVector(text);
    setError('');
  };

  const handleAnalyze = async () => {
    if (!selectedOrderId) {
      setError('Please select an active Purchase Order to analyze.');
      return;
    }
    if (!disruptionVector.trim()) {
      setError('Please describe or load a disruption vector.');
      return;
    }

    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const data = await onAnalyzeDisruption(selectedOrderId, disruptionVector);
      setResult(data);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail || 
        'Logistics analysis failed. Verify your backend server configurations.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const selectedOrder = orders.find(o => o.order_id === selectedOrderId);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Supply Chain Risk Analytics</h2>
          <p className="text-xs text-slate-400 font-normal">Evaluate line disruption vectors, forecast delay probabilities, and trigger operations research to construct alternative material routings.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveSubTab('simulator')}
            className={`text-xs font-bold px-3.5 py-2 rounded-xl border transition-all ${
              activeSubTab === 'simulator'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/10'
                : 'bg-slate-800 hover:bg-slate-750 text-slate-350 border-slate-750'
            }`}
          >
            🚢 Disruption Simulator
          </button>
          <button
            onClick={() => setActiveSubTab('shipments')}
            className={`text-xs font-bold px-3.5 py-2 rounded-xl border transition-all ${
              activeSubTab === 'shipments'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/10'
                : 'bg-slate-800 hover:bg-slate-750 text-slate-350 border-slate-750'
            }`}
          >
            🚚 Shipment Tracking
          </button>
        </div>
      </div>

      {activeSubTab === 'simulator' && (

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left column: Disruption Input Form */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl glass-panel space-y-4">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Disruption Risk Evaluator</h3>
            
            {/* Select PO */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Target Production Order</label>
              <select
                value={selectedOrderId}
                onChange={handleSelectOrder}
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

            {/* Display selected order baseline */}
            {selectedOrder && (
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-850 text-[11px] grid grid-cols-2 gap-2 text-slate-400">
                <div>
                  <span className="text-[9px] text-slate-500 block font-bold uppercase">Current Risk</span>
                  <span className={`font-semibold capitalize ${
                    selectedOrder.risk_level === 'High' 
                      ? 'text-rose-400' 
                      : (selectedOrder.risk_level === 'Medium' ? 'text-amber-400' : 'text-emerald-400')
                  }`}>
                    {selectedOrder.risk_level}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 block font-bold uppercase">Delay Baseline</span>
                  <span className="font-mono text-slate-200 font-bold">{(selectedOrder.delay_probability * 100).toFixed(0)}%</span>
                </div>
              </div>
            )}

            {/* Disruption templates */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Disruption Vector</label>
                <span className="text-[9px] text-slate-500 font-bold">Quick Templates</span>
              </div>
              <div className="flex flex-wrap gap-2 mb-2">
                {sampleDisruptions.map((dis, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleLoadDisruption(dis.text)}
                    className="text-[9px] font-semibold bg-slate-800 hover:bg-slate-750 text-indigo-350 px-2 py-1 rounded-lg border border-slate-750 max-w-full truncate"
                    title={dis.label}
                  >
                    {dis.label}
                  </button>
                ))}
              </div>
              <textarea
                value={disruptionVector}
                onChange={(e) => setDisruptionVector(e.target.value)}
                placeholder="Describe logistics, material supply, or production line disruption factors..."
                rows="6"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-200 placeholder-slate-650 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
                ⚠️ {error}
              </div>
            )}

            <button
              onClick={handleAnalyze}
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-850 text-white font-semibold text-xs py-3 rounded-xl shadow-lg shadow-indigo-600/10 transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Running AI Risk Simulator...
                </>
              ) : (
                <>🚢 Run Operations Risk Analysis</>
              )}
            </button>
          </div>
        </div>

        {/* Right column: Disruption Verdict Dashboard */}
        <div className="lg:col-span-7">
          {!result ? (
            <div className="p-12 rounded-2xl glass-panel border-dashed border-slate-850 flex flex-col items-center justify-center text-center space-y-3 h-[450px]">
              <span className="text-4xl text-slate-600">🚢</span>
              <h3 className="font-bold text-slate-300 text-sm">Disruption Sandbox Inactive</h3>
              <p className="text-xs text-slate-500 max-w-sm">Select an active PO and feed in a cargo or industrial delay vector to estimate logistics risks and generate mitigations.</p>
            </div>
          ) : (
            <div className="p-6 rounded-2xl glass-panel space-y-6 flex flex-col justify-between min-h-[450px]">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="font-bold text-slate-200 text-sm capitalize">Disruption Analysis Verdict</h3>
                  <p className="text-[10px] text-slate-450 font-bold">COMMITTED IN PRODUCTION STATE FOR ORDER {result.order_id}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase border ${
                  result.risk_level === 'High'
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    : (result.risk_level === 'Medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20')
                }`}>
                  {result.risk_level} Risk State
                </span>
              </div>

              {/* Progress and status blocks */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-850 flex flex-col items-center justify-center text-center">
                  <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-2 block">Delay Probability</span>
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-slate-900"
                        strokeWidth="3.5"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className={result.delay_probability > 0.6 ? 'text-rose-500' : (result.delay_probability > 0.3 ? 'text-amber-500' : 'text-emerald-500')}
                        strokeWidth="3.5"
                        strokeDasharray={`${result.delay_probability * 100}, 100`}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <span className="absolute font-mono text-sm font-extrabold text-slate-200">{(result.delay_probability * 100).toFixed(0)}%</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-950 rounded-xl border border-slate-850 col-span-2 space-y-2 flex flex-col justify-center">
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider block">Target Procurement Rerouting</span>
                    <span className="text-xs text-slate-300 font-semibold block capitalize">Alternate Vendor Rerouting Required</span>
                  </div>
                  <div className="h-1 bg-slate-900 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${result.delay_probability > 0.6 ? 'bg-rose-500 w-full' : (result.delay_probability > 0.3 ? 'bg-amber-500 w-2/3' : 'bg-emerald-500 w-1/3')}`}
                    />
                  </div>
                  <span className="text-[10px] text-slate-450 italic">AI advises: Shifting logistics nodes to secondary local mills.</span>
                </div>
              </div>

              {/* Text report */}
              <div className="flex-1 space-y-2 pt-2">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Operations Recovery Guide</span>
                <pre className="bg-slate-950 border border-slate-850 rounded-xl p-4 text-[11px] leading-relaxed text-slate-350 whitespace-pre-wrap overflow-y-auto max-h-[170px] font-sans">
                  {result.workaround_report}
                </pre>
              </div>

              {/* DB verification logs */}
              <div className="pt-4 border-t border-slate-850 flex items-center justify-between text-[11px] text-slate-500">
                <span>Database commit state: <span className="font-semibold text-indigo-400">SYNCED</span></span>
                <span className="font-mono">SQL::purchase_orders.risk_status</span>
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {activeSubTab === 'shipments' && (
        <div className="space-y-6">
          <div className="rounded-2xl glass-panel overflow-hidden">
            <div className="p-4 bg-slate-900/40 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Active Cargo Fleet Tracking</h3>
              <button onClick={fetchShipments} className="text-[10px] text-indigo-350 hover:underline">
                🔄 Reload Fleet
              </button>
            </div>

            {loadingShipments ? (
              <div className="p-12 text-center text-slate-500 text-xs">
                <span className="animate-spin inline-block w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full mr-2" />
                Interrogating cargo transponders...
              </div>
            ) : shipments.length === 0 ? (
              <div className="p-12 text-center text-slate-550 italic text-xs">
                No active shipments registered.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/30 text-slate-400 font-semibold text-xs tracking-wider uppercase">
                      <th className="p-4">Cargo ID</th>
                      <th className="p-4">Contract</th>
                      <th className="p-4">Item</th>
                      <th className="p-4">Carrier</th>
                      <th className="p-4">Destination</th>
                      <th className="p-4">ETA</th>
                      <th className="p-4">Delay (Days)</th>
                      <th className="p-4">Cargo Risk</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850/80 text-xs">
                    {shipments.map((s, idx) => (
                      <tr key={idx} className="hover:bg-slate-850/20 transition-colors">
                        <td className="p-4 font-mono font-bold text-slate-400">#C-{s.shipment_id}</td>
                        <td className="p-4 font-mono font-bold text-indigo-400">{s.order_id}</td>
                        <td className="p-4 font-semibold text-slate-200 capitalize">{s.po_item}</td>
                        <td className="p-4 text-slate-350">{s.carrier || 'Pending Assignment'}</td>
                        <td className="p-4 text-slate-400">{s.destination}</td>
                        <td className="p-4 font-mono text-slate-300">{s.eta || 'N/A'}</td>
                        <td className="p-4 font-mono font-bold text-rose-450">{s.delay_days} days</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                            s.risk_level === 'High'
                              ? 'bg-rose-950/40 text-rose-450 border-rose-900/60'
                              : s.risk_level === 'Medium'
                              ? 'bg-amber-950/40 text-amber-450 border-amber-900/60'
                              : 'bg-emerald-950/40 text-emerald-450 border-emerald-900/60'
                          }`}>
                            {s.risk_level} Risk
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* AI Route Optimization */}
          <div className="p-5 rounded-2xl glass-panel bg-gradient-to-br from-slate-900/60 to-indigo-950/20 border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider block">AI Logistics & Route Optimization Suggestion</h3>
            <div className="text-xs text-slate-300 leading-relaxed font-sans">
              • **Chittagong Port Congestion Workaround:** Route all future Hamburg (Germany) cargos through Colombo feedtransits instead of Singapore transhipment hubs. Prevents a projected delay of 5 days.  
              <br/>
              • **Air Freight contingency threshold:** If PO-9903 (Apex Logistics) delay exceeds 7 days, trigger the pre-negotiated air freight clause for 15% of total volume to satisfy H&M Group delivery contract guidelines.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
