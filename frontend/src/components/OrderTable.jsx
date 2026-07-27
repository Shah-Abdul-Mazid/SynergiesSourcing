import React, { useState } from 'react';

export default function OrderTable({ 
  orders = [], 
  onAddOrder,
  onUpdateStatus
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [riskFilter, setRiskFilter] = useState('All');
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states
  const [orderId, setOrderId] = useState('');
  const [buyerId, setBuyerId] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [item, setItem] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('pcs');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inline status editor states
  const [editingStatus, setEditingStatus] = useState(null); // order_id being edited
  const [editStatusVal, setEditStatusVal] = useState('');
  const [editRisk, setEditRisk] = useState('');
  const [editDelay, setEditDelay] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [updateSuccess, setUpdateSuccess] = useState('');

  const openEditor = (order) => {
    setEditingStatus(order.order_id);
    setEditStatusVal(order.status);
    setEditRisk(order.risk_level);
    setEditDelay(Math.round(order.delay_probability * 100));
    setUpdateError('');
    setUpdateSuccess('');
  };

  const closeEditor = () => {
    setEditingStatus(null);
    setUpdateError('');
    setUpdateSuccess('');
  };

  const handleStatusUpdate = async (order) => {
    setIsUpdating(true);
    setUpdateError('');
    setUpdateSuccess('');
    try {
      await onUpdateStatus(
        order.order_id,
        editStatusVal,
        editRisk,
        editDelay / 100
      );
      setUpdateSuccess(`✓ ${order.order_id} updated to "${editStatusVal}"`);
      setTimeout(() => closeEditor(), 1200);
    } catch (err) {
      setUpdateError(err.response?.data?.detail || 'Update failed. Please retry.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Filter logic
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.order_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.buyer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.item.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || order.status === statusFilter;
    const matchesRisk = riskFilter === 'All' || order.risk_level === riskFilter;

    return matchesSearch && matchesStatus && matchesRisk;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'QC Passed':
        return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded-md text-[11px] font-bold uppercase">QC Passed</span>;
      case 'QC Failed':
        return <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-1 rounded-md text-[11px] font-bold uppercase">QC Failed</span>;
      case 'Risk Warning':
        return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-1 rounded-md text-[11px] font-bold uppercase animate-pulse">Risk Warning</span>;
      case 'Processing':
        return <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-1 rounded-md text-[11px] font-bold uppercase">Processing</span>;
      case 'Shipped':
        return <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-1 rounded-md text-[11px] font-bold uppercase">Shipped</span>;
      case 'Completed':
        return <span className="bg-teal-500/10 text-teal-400 border border-teal-500/20 px-2 py-1 rounded-md text-[11px] font-bold uppercase">Completed</span>;
      case 'Cancelled':
        return <span className="bg-zinc-800 text-zinc-500 border border-zinc-700 px-2 py-1 rounded-md text-[11px] font-bold uppercase line-through">Cancelled</span>;
      case 'Pending':
      default:
        return <span className="bg-slate-800 text-slate-400 border border-slate-700 px-2 py-1 rounded-md text-[11px] font-bold uppercase">Pending</span>;
    }
  };

  const getRiskBadge = (risk) => {
    switch (risk) {
      case 'High':
        return <span className="text-rose-400 font-extrabold bg-rose-950/40 border border-rose-900/60 px-2 py-0.5 rounded text-[10px] tracking-wider uppercase">High</span>;
      case 'Medium':
        return <span className="text-amber-400 font-bold bg-amber-950/30 border border-amber-900/40 px-2 py-0.5 rounded text-[10px] tracking-wider uppercase">Medium</span>;
      case 'Low':
      default:
        return <span className="text-emerald-400 font-medium bg-emerald-950/20 border border-emerald-900/30 px-2 py-0.5 rounded text-[10px] tracking-wider uppercase">Low</span>;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    if (!orderId || !buyerId || !buyerName || !item || !quantity) {
      setFormError('Please fill out all fields.');
      setIsSubmitting(false);
      return;
    }

    try {
      await onAddOrder({
        order_id: orderId,
        buyer_id: buyerId.toUpperCase(),
        buyer_name: buyerName,
        item: item,
        quantity: parseFloat(quantity),
        unit: unit
      });
      // Reset form
      setOrderId('');
      setBuyerId('');
      setBuyerName('');
      setItem('');
      setQuantity('');
      setUnit('pcs');
      setShowAddForm(false);
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to create order. Ensure Order ID is unique.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Order Management Log</h2>
          <p className="text-xs text-slate-400">View, search, and register buyer purchase contracts and BOM assemblies.</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2"
        >
          <span>➕</span> New Purchase Order
        </button>
      </div>

      {/* Filters card */}
      <div className="p-4 rounded-2xl glass-panel flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Search by PO ID, buyer, fabric..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
        <div className="flex flex-wrap gap-4 w-full md:w-auto justify-end">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Processing">Processing</option>
              <option value="Risk Warning">Risk Warning</option>
              <option value="QC Passed">QC Passed</option>
              <option value="QC Failed">QC Failed</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Risk:</span>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="All">All Risks</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table view */}
      <div className="rounded-2xl glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-900/30 text-slate-400 font-semibold text-xs tracking-wider uppercase">
                <th className="p-4 w-12"></th>
                <th className="p-4">PO ID</th>
                <th className="p-4">Buyer Entity</th>
                <th className="p-4">Ordered Garment</th>
                <th className="p-4">Target Quantity</th>
                <th className="p-4">ERP State</th>
                <th className="p-4">Risk Factor</th>
                <th className="p-4">Delay Prob</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850/80 text-xs">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-500 italic">
                    No matching purchase contracts logged in database.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const isExpanded = expandedOrder === order.order_id;
                  return (
                    <React.Fragment key={order.order_id}>
                      <tr className="hover:bg-slate-850/30 transition-all group">
                        <td className="p-4 text-center">
                          <button
                            onClick={() => setExpandedOrder(isExpanded ? null : order.order_id)}
                            className="text-slate-400 hover:text-slate-200 text-sm font-bold"
                          >
                            {isExpanded ? '▼' : '▶'}
                          </button>
                        </td>
                        <td className="p-4 font-mono font-bold text-indigo-400">{order.order_id}</td>
                        <td className="p-4 font-medium text-slate-200">
                          {order.buyer_name}
                          <span className="text-[10px] text-slate-500 block uppercase font-bold">{order.buyer_id}</span>
                        </td>
                        <td className="p-4 text-slate-300 capitalize">{order.item}</td>
                        <td className="p-4 font-mono text-slate-300">
                          {order.quantity.toLocaleString()} <span className="text-[10px] text-slate-500">{order.unit}</span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {getStatusBadge(order.status)}
                            <button
                              onClick={() => {
                                setExpandedOrder(order.order_id);
                                openEditor(order);
                              }}
                              title="Edit ERP status"
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-indigo-400 text-[10px] border border-slate-700 hover:border-indigo-500/50 px-1.5 py-0.5 rounded font-bold"
                            >
                              ✏️
                            </button>
                          </div>
                        </td>
                        <td className="p-4">{getRiskBadge(order.risk_level)}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-900">
                              <div 
                                className={`h-full rounded-full ${
                                  order.delay_probability > 0.6 
                                    ? 'bg-rose-500' 
                                    : (order.delay_probability > 0.3 ? 'bg-amber-500' : 'bg-emerald-500')
                                }`}
                                style={{ width: `${order.delay_probability * 100}%` }}
                              />
                            </div>
                            <span className="font-mono font-medium text-slate-400">{(order.delay_probability * 100).toFixed(0)}%</span>
                          </div>
                        </td>
                      </tr>
                      {/* Expanded panel: BOM + Status Editor */}
                      {isExpanded && (
                        <tr className="bg-slate-950/40">
                          <td colSpan="8" className="p-5 border-t border-b border-slate-800">
                            <div className="pl-8 space-y-5">

                              {/* ── Inline Status Editor ── */}
                              <div className="rounded-2xl border border-indigo-500/20 bg-indigo-950/20 p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                  <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                                    <span>⚙️</span> Manual ERP State Override
                                  </h3>
                                  {editingStatus !== order.order_id && (
                                    <button
                                      onClick={() => openEditor(order)}
                                      className="text-[10px] font-bold bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 border border-indigo-500/30 px-3 py-1 rounded-lg transition-all"
                                    >
                                      ✏️ Edit Status
                                    </button>
                                  )}
                                </div>

                                {editingStatus !== order.order_id ? (
                                  /* Read-only summary row */
                                  <div className="flex flex-wrap gap-4 items-center">
                                    <div>
                                      <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Current Status</span>
                                      {getStatusBadge(order.status)}
                                    </div>
                                    <div>
                                      <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Risk Level</span>
                                      {getRiskBadge(order.risk_level)}
                                    </div>
                                    <div>
                                      <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Delay Probability</span>
                                      <span className="font-mono text-xs text-slate-300 font-bold">{(order.delay_probability * 100).toFixed(0)}%</span>
                                    </div>
                                  </div>
                                ) : (
                                  /* Active editor */
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                      {/* Status dropdown */}
                                      <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ERP Status</label>
                                        <select
                                          value={editStatusVal}
                                          onChange={(e) => setEditStatusVal(e.target.value)}
                                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                                        >
                                          <option value="Pending">Pending</option>
                                          <option value="Processing">Processing</option>
                                          <option value="Shipped">Shipped</option>
                                          <option value="QC Passed">QC Passed</option>
                                          <option value="QC Failed">QC Failed</option>
                                          <option value="Risk Warning">Risk Warning</option>
                                          <option value="Completed">Completed</option>
                                          <option value="Cancelled">Cancelled</option>
                                        </select>
                                      </div>

                                      {/* Risk dropdown */}
                                      <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Risk Level</label>
                                        <select
                                          value={editRisk}
                                          onChange={(e) => setEditRisk(e.target.value)}
                                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                                        >
                                          <option value="Low">Low</option>
                                          <option value="Medium">Medium</option>
                                          <option value="High">High</option>
                                        </select>
                                      </div>

                                      {/* Delay probability slider */}
                                      <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                          Delay Probability — <span className="text-indigo-400 font-mono">{editDelay}%</span>
                                        </label>
                                        <input
                                          type="range"
                                          min="0" max="100" step="1"
                                          value={editDelay}
                                          onChange={(e) => setEditDelay(Number(e.target.value))}
                                          className="w-full h-1.5 accent-indigo-500 cursor-pointer"
                                        />
                                        <div className="flex justify-between text-[9px] text-slate-600 font-mono">
                                          <span>0%</span><span>50%</span><span>100%</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Feedback messages */}
                                    {updateError && (
                                      <div className="text-rose-400 text-[11px] bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-lg">
                                        ⚠️ {updateError}
                                      </div>
                                    )}
                                    {updateSuccess && (
                                      <div className="text-emerald-400 text-[11px] bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-lg">
                                        {updateSuccess}
                                      </div>
                                    )}

                                    {/* Action buttons */}
                                    <div className="flex items-center gap-3">
                                      <button
                                        onClick={() => handleStatusUpdate(order)}
                                        disabled={isUpdating}
                                        className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-[11px] px-4 py-2 rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-1.5"
                                      >
                                        {isUpdating ? (
                                          <><span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" /> Saving...</>
                                        ) : (
                                          <>💾 Save Changes</>
                                        )}
                                      </button>
                                      <button
                                        onClick={closeEditor}
                                        disabled={isUpdating}
                                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-[11px] px-4 py-2 rounded-xl transition-all"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* ── BOM Section ── */}
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Bill of Materials (BOM) Specifications</h3>
                                  <span className="text-[10px] text-slate-400">Locked in database ledger</span>
                                </div>
                                {(!order.bom_items || order.bom_items.length === 0) ? (
                                  <p className="text-xs text-slate-500 italic">No structured raw materials BOM generated for this order. Import a Tech Pack to auto-generate.</p>
                                ) : (
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {order.bom_items.map((bom, idx) => (
                                      <div key={idx} className="p-3 bg-slate-900/80 border border-slate-850 rounded-xl flex justify-between items-center">
                                        <div>
                                          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wide block">Material</span>
                                          <span className="text-xs text-slate-200 capitalize font-medium">{bom.item}</span>
                                        </div>
                                        <div className="text-right">
                                          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wide block">Required Qty</span>
                                          <span className="font-mono text-xs font-bold text-indigo-300">{bom.quantity.toLocaleString()} {bom.unit}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Registration Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-slate-100">Manually Log Purchase Order</h3>
                <p className="text-xs text-slate-400">Submit a buyer purchase contract. The ERP will seed matching customer nodes.</p>
              </div>
              <button 
                onClick={() => setShowAddForm(false)}
                className="text-slate-400 hover:text-slate-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
                ⚠️ {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Order ID (PO-XXXX)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PO-7801"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Buyer Code (ZARA, LEVIS)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ZARA"
                    value={buyerId}
                    onChange={(e) => setBuyerId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Buyer Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Zara International"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Ordered Garment Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chino Trousers"
                  value={item}
                  onChange={(e) => setItem(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Target Quantity</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 1500"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Unit</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="pcs">pcs</option>
                    <option value="sets">sets</option>
                    <option value="dozens">dozens</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs py-2.5 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-600/10 flex items-center justify-center"
                >
                  {isSubmitting ? 'Submitting...' : 'Register Contract'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
