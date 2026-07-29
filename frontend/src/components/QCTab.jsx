import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function QCTab({ 
  orders = [], 
  onRunQCDetection,
  qcLogs = [],
  onRefreshQCOrderLogs
}) {
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState('workbench');
  const [aiReport, setAiReport] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => {
    if (activeSubTab === 'analytics') {
      fetchQCAnalytics();
    }
  }, [activeSubTab, qcLogs]);

  const fetchQCAnalytics = async () => {
    setLoadingAi(true);
    try {
      const res = await axios.get('/reports/qc-analytics');
      setAiReport(res.data.ai_report_analysis);
    } catch (err) {
      console.error(err);
      setAiReport('Failed to query defect analytics.');
    } finally {
      setLoadingAi(false);
    }
  };

  const handleSelectOrder = (e) => {
    setSelectedOrderId(e.target.value);
    setResult(null);
    setError('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
      setError('');
    }
  };

  const handleQCDetection = async () => {
    if (!selectedOrderId) {
      setError('Please select an active Purchase Order to bind the quality audit.');
      return;
    }
    if (!selectedFile) {
      setError('Please upload or select a fabric inspection frame.');
      return;
    }

    setIsLoading(true);
    setError('');
    setResult(null);

    const formData = new FormData();
    formData.append('order_id', selectedOrderId);
    formData.append('file', selectedFile);

    try {
      const data = await onRunQCDetection(formData);
      setResult(data);
      onRefreshQCOrderLogs(); // Refresh historical logs in parent App state
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail || 
        'Vision scanner failed. Ensure that YOLOv8 and your backend server are actively running.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-100">Multimodal Vision-LLM Inspector (CV + GenAI)</h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              YOLOv8 Crop + Vision LLM
            </span>
          </div>
          <p className="text-xs text-slate-400 font-normal">Detect objects & surface defects using YOLOv8 + OpenCV multi-pass vision engines, auto-crop region patches, and synthesize multimodal Vision-LLM diagnostic summaries.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveSubTab('workbench')}
            className={`text-xs font-bold px-3.5 py-2 rounded-xl border transition-all ${
              activeSubTab === 'workbench'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/10'
                : 'bg-slate-800 hover:bg-slate-750 text-slate-350 border-slate-750'
            }`}
          >
            📂 Visual Inspector
          </button>
          <button
            onClick={() => setActiveSubTab('history')}
            className={`text-xs font-bold px-3.5 py-2 rounded-xl border transition-all ${
              activeSubTab === 'history'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/10'
                : 'bg-slate-800 hover:bg-slate-750 text-slate-350 border-slate-750'
            }`}
          >
            📜 Audit Ledger
          </button>
          <button
            onClick={() => setActiveSubTab('analytics')}
            className={`text-xs font-bold px-3.5 py-2 rounded-xl border transition-all ${
              activeSubTab === 'analytics'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/10'
                : 'bg-slate-800 hover:bg-slate-750 text-slate-350 border-slate-750'
            }`}
          >
            📈 Defect Analytics
          </button>
        </div>
      </div>

      {activeSubTab === 'workbench' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left panel: Image Uploader and Controls */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 rounded-2xl glass-panel space-y-4">
              <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Image / Document Inspection Feed</h3>
              
              {/* Select PO */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Target Production Order / Asset</label>
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

              {/* Upload Drop Zone */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Upload Frame / Document / Scene Image</label>
                <div className="relative border-2 border-dashed border-slate-800 rounded-2xl hover:border-indigo-500/50 transition-colors p-6 bg-slate-950/40 flex flex-col items-center justify-center text-center space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {previewUrl ? (
                    <img 
                      src={previewUrl} 
                      alt="Inspection Upload Preview" 
                      className="max-h-48 object-contain rounded-xl"
                    />
                  ) : (
                    <>
                      <span className="text-3xl">📷</span>
                      <p className="text-xs font-semibold text-slate-350">Click or drag scene image frame here</p>
                      <p className="text-[10px] text-slate-500">Supports JPEG, PNG — YOLOv8 Object Detection + OpenCV Crop + Vision LLM</p>
                    </>
                  )}
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
                  ⚠️ {error}
                </div>
              )}

              <button
                onClick={handleQCDetection}
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-850 text-white font-semibold text-xs py-3 rounded-xl shadow-lg shadow-indigo-600/10 transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Running Multimodal Vision-LLM Pipeline...
                  </>
                ) : (
                  <>🔍 Run Multimodal Crop & Vision Diagnostic</>
                )}
              </button>
            </div>
          </div>

          {/* Right panel: YOLO Output Image, Cropped Region Thumbnails, and AI Vision Report */}
          <div className="lg:col-span-7">
            {!result ? (
              <div className="p-12 rounded-2xl glass-panel border-dashed border-slate-850 flex flex-col items-center justify-center text-center space-y-3 h-[480px]">
                <span className="text-4xl text-slate-600">🔍</span>
                <h3 className="font-bold text-slate-300 text-sm">Multimodal Vision Assistant Awaiting Input</h3>
                <p className="text-xs text-slate-500 max-w-sm">Attach a sample image, select an order ID, and trigger the Multimodal Visual Inspector to view detected bounding boxes, cropped region patches, and LLM diagnostic reports.</p>
              </div>
            ) : (
              <div className="p-6 rounded-2xl glass-panel space-y-6 min-h-[480px] flex flex-col justify-between">
                {/* Header Verdict */}
                <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="font-bold text-slate-200 text-sm capitalize">Multimodal Vision-LLM Verdict</h3>
                    <span className="text-[10px] text-slate-450 font-bold block">LOG ID COMPILING UNDER PO: {result.order_id}</span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase border ${
                    result.final_status === 'Passed'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}>
                    {result.final_status} Inspection
                  </span>
                </div>

                {/* Annotated Frame Display & Bounding Box Telemetry */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Annotated Image */}
                  <div className="bg-slate-950 rounded-xl border border-slate-850 p-2 flex flex-col items-center justify-center">
                    <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-1 block w-full text-left">Annotated Scene Frame</span>
                    <img 
                      src={result.annotated_image} 
                      alt="YOLOv8 CV Annotation Feed" 
                      className="max-h-44 object-contain rounded-lg"
                    />
                  </div>

                  {/* Telemetry log list */}
                  <div className="bg-slate-950 border border-slate-850 rounded-xl p-4 flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-2 block">YOLOv8 + OpenCV Spatial Telemetry</span>
                      {result.yolo_detections?.length === 0 ? (
                        <p className="text-xs text-emerald-400 font-medium">✓ No anomalies detected by spatial scanner.</p>
                      ) : (
                        <div className="space-y-1.5 overflow-y-auto max-h-[110px]">
                          {result.yolo_detections?.map((det, index) => {
                            const isDefectFree = det.class === 'defect_free';
                            const isCritical = !isDefectFree && det.confidence >= 0.60;
                            const isMinor = !isDefectFree && det.confidence >= 0.30 && det.confidence < 0.60;
                            const confColor = isDefectFree ? 'text-emerald-400' : isCritical ? 'text-rose-400' : isMinor ? 'text-amber-400' : 'text-slate-400';
                            const labelColor = isDefectFree ? 'text-emerald-350' : isCritical ? 'text-rose-300' : isMinor ? 'text-amber-300' : 'text-slate-300';
                            const icon = isDefectFree ? '✓' : '⚠';
                            return (
                              <div key={index} className="flex flex-col text-[10px] border-b border-slate-900 pb-1 text-slate-400">
                                <div className="flex justify-between items-center text-xs">
                                  <span className={`capitalize font-bold ${labelColor}`}>{icon} Region #{index + 1}: {det.class.replace(/_/g, ' ')}</span>
                                  <span className={`font-mono font-bold ${confColor}`}>{(det.confidence * 100).toFixed(1)}%</span>
                                </div>
                                <span className="font-mono text-[9px] text-slate-500">BBox: [{det.bbox.map(v => Math.round(v)).join(', ')}]</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] text-slate-500 italic mt-2">Engine: Ultralytics YOLOv8 + OpenCV Multi-Pass Region Extraction</span>
                  </div>
                </div>

                {/* Cropped Region Patches Visual Gallery */}
                {result.cropped_regions && result.cropped_regions.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <span className="text-[10px] text-indigo-400 uppercase font-bold tracking-wider block">
                      ✂️ Extracted Cropped Regions ({result.cropped_regions.length} Patches Passed to Vision LLM)
                    </span>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 overflow-x-auto p-1 bg-slate-950/60 rounded-xl border border-slate-850">
                      {result.cropped_regions.map((crop) => (
                        <div key={crop.id} className="bg-slate-900/80 border border-slate-800 rounded-lg p-2 flex flex-col items-center space-y-1">
                          {crop.crop_b64 ? (
                            <img 
                              src={crop.crop_b64} 
                              alt={`Region #${crop.id}`} 
                              className="h-16 w-full object-cover rounded border border-slate-700"
                            />
                          ) : (
                            <div className="h-16 w-full bg-slate-800 rounded flex items-center justify-center text-[10px] text-slate-500">No Crop</div>
                          )}
                          <div className="w-full flex justify-between items-center text-[9px]">
                            <span className="font-bold text-slate-300 truncate">#{crop.id} {crop.class}</span>
                            <span className="font-mono text-indigo-400 font-bold">{(crop.confidence * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Visual compliance text */}
                <div className="flex-1 space-y-2 pt-2">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Multimodal Vision-LLM Diagnostic Synthesis</span>
                  <pre className="bg-slate-950 border border-slate-850 rounded-xl p-4 text-[11px] leading-relaxed text-slate-350 whitespace-pre-wrap overflow-y-auto max-h-[160px] font-sans">
                    {result.vision_report}
                  </pre>
                </div>

                {/* Database state */}
                <div className="pt-4 border-t border-slate-850 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Audit Committed: <span className="font-semibold text-slate-300">QCLog ID #{result.qc_log_id}</span></span>
                  <span className="font-mono text-indigo-400">YOLOv8 + OpenCV ➔ Vision-LLM Pipeline</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeSubTab === 'history' && (
        /* History logs view */
        <div className="rounded-2xl glass-panel overflow-hidden">
          <div className="p-4 bg-slate-900/40 border-b border-slate-800">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Quality Control database transaction ledger</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-900/30 text-slate-400 font-semibold text-xs tracking-wider uppercase">
                  <th className="p-4">Log ID</th>
                  <th className="p-4">Order ID</th>
                  <th className="p-4">Defect Anomaly class</th>
                  <th className="p-4">Inspection State</th>
                  <th className="p-4">Visual Audit Text Report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/80 text-xs">
                {qcLogs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-slate-500 italic">
                      No historical QC checks registered in database.
                    </td>
                  </tr>
                ) : (
                  qcLogs.map((log) => (
                    <tr key={log.log_id} className="hover:bg-slate-850/30 transition-colors">
                      <td className="p-4 font-mono font-bold text-slate-400">#{log.log_id}</td>
                      <td className="p-4 font-mono font-bold text-indigo-400">{log.order_id}</td>
                      <td className="p-4 text-slate-300 font-semibold capitalize">{log.defect_type}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          log.status === 'Passed'
                            ? 'bg-emerald-950/40 text-emerald-450 border border-emerald-900/60'
                            : 'bg-rose-950/40 text-rose-450 border border-rose-900/60'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="p-4 text-slate-400 max-w-sm truncate" title={log.report}>{log.report}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Stats blocks */}
          <div className="lg:col-span-4 space-y-4">
            <div className="p-5 rounded-2xl glass-panel text-left space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Visual Audits</span>
              <span className="text-2xl font-extrabold text-slate-100 mt-1 block">{qcLogs.length}</span>
              <span className="text-[10px] text-indigo-400 font-semibold block">Run on active production fabric</span>
            </div>
            <div className="p-5 rounded-2xl glass-panel text-left space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Defects Pass Rate</span>
              <span className="text-2xl font-extrabold text-slate-100 mt-1 block">
                {(qcLogs.length > 0 ? (qcLogs.filter(q=>q.status==='Passed').length / qcLogs.length) * 100 : 100.0).toFixed(1)}%
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold block">
                {qcLogs.filter(q=>q.status==='Passed').length} checks approved
              </span>
            </div>
          </div>

          {/* AI Trends Briefing */}
          <div className="lg:col-span-8 p-5 rounded-2xl glass-panel space-y-3">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider block">AI Defect Summary & Trend Analysis</h3>
            {loadingAi ? (
              <div className="text-center py-6 text-slate-500 text-xs">
                <span className="animate-spin inline-block w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full mr-2" />
                Aggregating defect types...
              </div>
            ) : (
              <div className="text-xs text-slate-350 leading-relaxed whitespace-pre-wrap font-sans">
                {aiReport}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
