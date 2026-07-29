import React from 'react';

export default function Sidebar({ 
  inventory = [], 
  orders = [], 
  activeTab = 'dashboard', 
  setActiveTab 
}) {
  // Navigation tabs config
  const navItems = [
    { id: 'dashboard', name: 'Dashboard', icon: '📊' },
    { id: 'orders', name: 'Order Management', icon: '📦' },
    { id: 'techpack', name: 'AI Tech Pack Assistant', icon: '📝' },
    { id: 'procurement', name: 'Procurement', icon: '🛒' },
    { id: 'inventory', name: 'Inventory & Safety', icon: '🧵' },
    { id: 'production', name: 'Production Line', icon: '🏗' },
    { id: 'logistics', name: 'Logistics Tracking', icon: '🚢' },
    { id: 'qc', name: 'Multimodal Vision Inspector', icon: '🔍' },
    { id: 'reports', name: 'Reports & SQL Agent', icon: '📈' },
    { id: 'assistant', name: 'AI Assistant', icon: '🤖' },
    { id: 'rag', name: 'Knowledge Base (RAG)', icon: '📚' },
  ];

  // Filters
  const highRiskOrders = orders.filter(o => o.risk_level === 'High');

  return (
    <aside className="w-80 glass-panel border-r border-slate-800 flex flex-col h-screen overflow-hidden flex-shrink-0">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white text-xl shadow-lg shadow-indigo-500/30">
          SF
        </div>
        <div>
          <h1 className="font-bold text-lg leading-none text-slate-100">SmartFactory</h1>
          <span className="text-xs font-semibold text-indigo-400 tracking-wider uppercase">AI-ERP Platform</span>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="p-4 space-y-1 overflow-y-auto flex-1">
        <span className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Modules</span>
        {navItems.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-left ${
                isActive 
                  ? 'bg-gradient-to-r from-indigo-600/90 to-indigo-700 text-white font-medium shadow-md shadow-indigo-600/10' 
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100'
              }`}
            >
              <span className={`text-lg transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                {tab.icon}
              </span>
              <span className="text-sm">{tab.name}</span>
            </button>
          );
        })}

        {/* Material Inventory Log Summary */}
        <div className="mt-8 pt-6 border-t border-slate-850">
          <div className="flex items-center justify-between px-3 mb-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Material Stocks</span>
            <span className="text-[10px] font-semibold bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
              {inventory.length} items
            </span>
          </div>
          <div className="space-y-2.5 px-3">
            {inventory.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No materials registered.</p>
            ) : (
              inventory.slice(0, 4).map((inv, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 truncate max-w-[130px] capitalize">{inv.item}</span>
                  <span className="font-mono text-slate-200 font-medium">
                    {inv.quantity.toLocaleString()} <span className="text-[10px] text-slate-500">{inv.unit}</span>
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* High Risk Production Logs */}
        <div className="mt-8 pt-6 border-t border-slate-850">
          <div className="flex items-center justify-between px-3 mb-3">
            <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">High Risk Disruption Alerts</span>
            {highRiskOrders.length > 0 && (
              <span className="animate-pulse w-2 h-2 rounded-full bg-rose-500" />
            )}
          </div>
          <div className="space-y-2 px-1">
            {highRiskOrders.length === 0 ? (
              <p className="text-xs text-slate-500 italic px-2">No active logistics alerts.</p>
            ) : (
              highRiskOrders.map((order, idx) => (
                <div 
                  key={idx} 
                  onClick={() => setActiveTab('logistics')}
                  className="p-3 rounded-xl border border-rose-900/50 bg-rose-950/20 hover:bg-rose-950/30 transition-all cursor-pointer group risk-high-glow"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-mono text-xs font-bold text-rose-400 group-hover:underline">
                      {order.order_id}
                    </span>
                    <span className="text-[10px] font-extrabold bg-rose-500 text-white px-1.5 py-0.5 rounded uppercase">
                      High Risk
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 truncate capitalize">{order.item}</p>
                  <div className="mt-2 flex justify-between text-[10px] text-rose-300/80 font-medium">
                    <span>Delay Probability:</span>
                    <span className="font-mono">{(order.delay_probability * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </nav>

      {/* Footer / Status indicators */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/40 text-[10px] text-slate-500 flex justify-between items-center">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Server: Online
        </span>
        <span className="font-mono">v1.0.0</span>
      </div>
    </aside>
  );
}
