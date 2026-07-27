import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function InventoryTab() {
  const [dashboardData, setDashboardData] = useState(null);
  const [forecastReport, setForecastReport] = useState('');
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [loadingForecast, setLoadingForecast] = useState(false);
  
  // Chat state
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { role: 'assistant', text: 'Hi! I am the Warehouse Management Assistant. Ask me anything about stock volumes, reorder levels, or safety thresholds.' }
  ]);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    fetchDashboard();
    fetchForecast();
  }, []);

  const fetchDashboard = async () => {
    setLoadingDashboard(true);
    try {
      const res = await axios.get('/inventory/dashboard');
      setDashboardData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDashboard(false);
    }
  };

  const fetchForecast = async () => {
    setLoadingForecast(true);
    try {
      const res = await axios.get('/inventory/forecast');
      setForecastReport(res.data.forecast_report);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingForecast(false);
    }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatLoading(true);

    try {
      const res = await axios.post('/inventory/chat', { message: userMsg });
      setChatHistory(prev => [...prev, { role: 'assistant', text: res.data.response }]);
    } catch (err) {
      console.error(err);
      setChatHistory(prev => [...prev, { role: 'assistant', text: 'Sorry, I failed to scan the warehouse databases right now.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Inventory Management</h2>
          <p className="text-xs text-slate-400 font-normal">Monitor raw material volumes, safety stock buffers, and chat with the warehouse operations assistant.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { fetchDashboard(); fetchForecast(); }} className="text-xs font-bold bg-slate-800 hover:bg-slate-750 text-indigo-350 px-3.5 py-2 rounded-xl border border-slate-750 transition-all">
            🔄 Sync Warehouse Status
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Stock Level Bars & Safety Stock Status */}
        <div className="lg:col-span-8 space-y-6">
          {/* Main Dashboard Stats */}
          {dashboardData && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl glass-panel text-left">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Warehouse Stock</span>
                <span className="text-2xl font-extrabold text-slate-100 mt-1 block">
                  {dashboardData.total_quantity?.toLocaleString()}
                </span>
                <span className="text-[10px] text-indigo-400 font-semibold block mt-1">Total items registered</span>
              </div>
              <div className="p-5 rounded-2xl glass-panel text-left">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Warehouse Storage Load</span>
                <span className="text-2xl font-extrabold text-slate-100 mt-1 block">
                  {dashboardData.warehouse_capacity_pct?.toFixed(1)}%
                </span>
                <div className="w-full bg-slate-950 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${dashboardData.warehouse_capacity_pct}%` }} />
                </div>
              </div>
              <div className="p-5 rounded-2xl glass-panel text-left">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Inventory Health Score</span>
                <span className="text-2xl font-extrabold text-slate-100 mt-1 block">
                  {dashboardData.health_score} / 100
                </span>
                <span className={`text-[10px] font-semibold block mt-1 ${dashboardData.low_stock_count > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {dashboardData.low_stock_count} items below safety limits
                </span>
              </div>
            </div>
          )}

          {/* Detailed stock items */}
          <div className="p-6 rounded-2xl glass-panel space-y-4">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Live Material Threshold Log</h3>
            {loadingDashboard ? (
              <div className="text-center py-6 text-slate-500 text-xs">
                <span className="animate-spin inline-block w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full mr-2" />
                Reading RFID registers...
              </div>
            ) : dashboardData?.items?.length === 0 ? (
              <p className="text-xs text-slate-500 italic text-center py-6">No inventory items active.</p>
            ) : (
              <div className="space-y-4">
                {dashboardData?.items?.map((item, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-350 capitalize flex items-center gap-1.5">
                        {item.is_low && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />}
                        {item.item}
                      </span>
                      <span className="font-mono text-slate-200">
                        {item.quantity.toLocaleString()} / <span className="text-slate-500">{item.unit}</span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 border border-slate-900 rounded-full h-2 overflow-hidden flex">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${item.is_low ? 'bg-rose-500 shadow-md shadow-rose-500/20' : 'bg-indigo-600'}`}
                        style={{ width: `${item.percentage_of_limit}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-500">
                      <span>Threshold Min: {item.safety_stock} {item.unit}</span>
                      <span>Stock Status: {item.is_low ? '⚠️ LOW STOCK' : '🟢 HEALTHY'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI Demand Forecasting */}
          <div className="p-5 rounded-2xl glass-panel space-y-3">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider block">AI Reorder & Demand Forecast</h3>
            {loadingForecast ? (
              <div className="text-center py-6 text-slate-500 text-xs">
                <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-slate-500 border-t-transparent rounded-full mr-2" />
                Computing demand logs...
              </div>
            ) : (
              <div className="text-xs text-slate-350 leading-relaxed whitespace-pre-wrap font-sans">
                {forecastReport}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Inventory Operations AI Chat Assistant */}
        <div className="lg:col-span-4 p-5 rounded-2xl glass-panel flex flex-col h-[580px] justify-between">
          <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
            <div>
              <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Inventory AI Agent</h3>
              <span className="text-[9px] text-slate-500 font-bold block">REAL-TIME WAREHOUSE LOG CONTEXT</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow shadow-emerald-500/50" />
          </div>

          {/* Chat log */}
          <div className="flex-1 overflow-y-auto my-4 space-y-3 pr-1 text-xs scrollbar-thin">
            {chatHistory.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`p-3 rounded-2xl max-w-[85%] leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                    : 'bg-slate-900 border border-slate-800 text-slate-300 rounded-tl-none'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="p-3 rounded-2xl max-w-[80%] bg-slate-900 border border-slate-800 text-slate-500 rounded-tl-none flex items-center gap-2">
                  <span className="animate-bounce">●</span>
                  <span className="animate-bounce delay-75">●</span>
                  <span className="animate-bounce delay-150">●</span>
                </div>
              </div>
            )}
          </div>

          {/* Chat input form */}
          <div className="flex gap-2 border-t border-slate-850 pt-3">
            <input
              type="text"
              placeholder="Ask inventory agent (e.g. what is below safety?)"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-sans"
            />
            <button
              onClick={handleSendChat}
              disabled={chatLoading || !chatInput.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
