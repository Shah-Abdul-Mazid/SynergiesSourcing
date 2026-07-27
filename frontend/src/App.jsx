import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import OrderTable from './components/OrderTable';
import TechPackTab from './components/TechPackTab';
import LogisticsTab from './components/LogisticsTab';
import QCTab from './components/QCTab';
import ProcurementTab from './components/ProcurementTab';
import InventoryTab from './components/InventoryTab';
import ProductionTab from './components/ProductionTab';
import ReportsTab from './components/ReportsTab';
import AIAssistantTab from './components/AIAssistantTab';
import RAGTab from './components/RAGTab';

// Configure Axios defaults to target our FastAPI backend
const API_URL = 'http://localhost:8000/api';
axios.defaults.baseURL = API_URL;

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [qcLogs, setQcLogs] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);

  // Sync state function from database
  const syncERPState = async () => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      // Parallel fetches for performance
      const [ordersRes, inventoryRes, qcLogsRes] = await Promise.all([
        axios.get('/orders'),
        axios.get('/inventory'),
        axios.get('/qc/logs')
      ]);

      setOrders(ordersRes.data);
      setInventory(inventoryRes.data);
      setQcLogs(qcLogsRes.data);
    } catch (err) {
      console.error("Failed to sync state with ERP database:", err);
      setSyncError("ERP Connection Offline. Verify that the FastAPI backend is running on localhost:8000.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Sync state on load
  useEffect(() => {
    syncERPState();
  }, []);

  // Handler for manual Order registration
  const handleRegisterPO = async (poData) => {
    const res = await axios.post('/orders', poData);
    await syncERPState(); // Refresh dashboard state
    return res.data;
  };

  // Handler for manually updating order ERP status
  const handleUpdateOrderStatus = async (orderId, status, riskLevel, delayProbability) => {
    const payload = { status };
    if (riskLevel !== undefined) payload.risk_level = riskLevel;
    if (delayProbability !== undefined) payload.delay_probability = delayProbability;
    const res = await axios.patch(`/orders/${orderId}/status`, payload);
    await syncERPState();
    return res.data;
  };

  // Handler for Tech Pack parsing
  const handleIngestTechPack = async (text) => {
    const res = await axios.post('/ai/techpack-to-bom', { text });
    await syncERPState(); // Refresh dashboard state
    return res.data;
  };

  // Handler for Disruption Simulations
  const handleAnalyzeDisruption = async (orderId, disruptionVector) => {
    const res = await axios.post('/logistics/analyze', { order_id: orderId, disruption_vector: disruptionVector });
    await syncERPState(); // Refresh dashboard state
    return res.data;
  };

  // Handler for Quality checks
  const handleRunQCDetection = async (formData) => {
    const res = await axios.post('/qc/analyze', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    await syncERPState(); // Refresh dashboard state
    return res.data;
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Global state syncing overlay error */}
      {syncError && (
        <div className="fixed top-4 right-4 z-50 bg-rose-950/90 border border-rose-900/60 p-4 rounded-2xl shadow-2xl text-xs text-rose-300 max-w-sm flex items-center justify-between gap-4 backdrop-blur-md">
          <span>⚠️ {syncError}</span>
          <button 
            onClick={syncERPState}
            className="bg-rose-900/40 hover:bg-rose-900/60 px-3 py-1.5 rounded-lg border border-rose-800 font-bold transition-all text-[10px]"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Sidebar Nav */}
      <Sidebar 
        inventory={inventory} 
        orders={orders} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
      />

      {/* Main Panel Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Operational Status Bar */}
        <header className="h-16 border-b border-slate-900 bg-slate-950/40 flex justify-between items-center px-8 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Active Workspace:</span>
            <span className="text-xs bg-slate-900 border border-slate-800 text-indigo-400 px-3 py-1 rounded-full font-bold">
               Dhaka Production Facility
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            {isSyncing ? (
              <span className="flex items-center gap-2 text-slate-500">
                <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-slate-500 border-t-transparent rounded-full" />
                Syncing ERP ledger...
              </span>
            ) : (
              <button 
                onClick={syncERPState}
                className="text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1.5"
                title="Force manual sync of inventory and logs"
              >
                🔄 Refresh Ledger
              </button>
            )}
            <div className="h-4 w-[1px] bg-slate-800" />
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-md shadow-emerald-500/50" />
              <span className="text-slate-300 font-medium">Synergies Merchandiser</span>
            </div>
          </div>
        </header>

        {/* Tab View Switcher */}
        <div className="flex-1 overflow-y-auto p-8">
          {activeTab === 'dashboard' && (
            <Dashboard 
              inventory={inventory} 
              orders={orders} 
              qcLogs={qcLogs} 
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === 'orders' && (
            <OrderTable 
              orders={orders} 
              onAddOrder={handleRegisterPO}
              onUpdateStatus={handleUpdateOrderStatus}
            />
          )}

          {activeTab === 'techpack' && (
            <TechPackTab 
              onIngestSuccess={handleIngestTechPack} 
            />
          )}

          {activeTab === 'logistics' && (
            <LogisticsTab 
              orders={orders} 
              onAnalyzeDisruption={handleAnalyzeDisruption} 
            />
          )}

          {activeTab === 'qc' && (
            <QCTab 
              orders={orders} 
              onRunQCDetection={handleRunQCDetection}
              qcLogs={qcLogs}
              onRefreshQCOrderLogs={syncERPState}
            />
          )}

          {activeTab === 'procurement' && (
            <ProcurementTab />
          )}

          {activeTab === 'inventory' && (
            <InventoryTab />
          )}

          {activeTab === 'production' && (
            <ProductionTab orders={orders} />
          )}

          {activeTab === 'reports' && (
            <ReportsTab />
          )}

          {activeTab === 'assistant' && (
            <AIAssistantTab />
          )}

          {activeTab === 'rag' && (
            <RAGTab />
          )}
        </div>
      </main>
    </div>
  );
}
