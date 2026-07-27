import React, { useState } from 'react';

export default function TechPackTab({ 
  onIngestSuccess 
}) {
  const [techPackText, setTechPackText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState('specs');
  const [copySuccess, setCopySuccess] = useState(false);

  const sampleTechPacks = [
    {
      title: 'Zara Denim Jackets (PO-9021)',
      text: `Garment Tech Pack & Sourcing Spec sheet.
Buyer: Zara International (Buyer ID: ZARA, Contact: sourcing@zara.com)
Contract Reference: PO-9021
Product Details: 1200 units of Heavy Wash Denim Jackets
Manufacturing Raw Materials required (BOM):
- Denim Fabric: 2400.0 meters required
- Brass Buttons: 12000.0 pieces required
- Zippers: 1200.0 pieces required
Shipment terms: FOB Chittagong.`
    },
    {
      title: 'Levi Jeans Sourcing (PO-8045)',
      text: `PRODUCTION ORDER REQUIREMENT DIRECTIVE.
Buyer Group: Levi Strauss & Co. (ID: LEVIS, Email: procurement@levis.com)
Order Registry ID: PO-8045
Item Description: Slim Fit Mens Jeans
Total Quantity ordered: 2000.0 pcs
Bill of Materials breakdown:
- Denim Fabric: 3000.0 meters needed
- Polyester Thread: 120.0 spools needed
- Zippers: 2000.0 pieces needed`
    }
  ];

  const handleLoadSample = (sampleText) => {
    setTechPackText(sampleText);
    setResult(null);
    setError('');
  };

  const handleIngest = async () => {
    if (!techPackText.trim()) {
      setError('Please paste or load a Tech Pack sheet first.');
      return;
    }

    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await onIngestSuccess(techPackText);
      setResult(response);
      setActiveSubTab('specs'); // Reset subtab on success
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail || 
        'AI ingestion failed. Verify that your AntiGravity OpenAI client configurations in .env are active.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToClipboard = () => {
    if (result?.rfq_draft) {
      navigator.clipboard.writeText(result.rfq_draft);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-100">AI Tech Pack Assistant</h2>
        <p className="text-xs text-slate-400">Paste raw, unstructured sheets from buyers. The AI parses the data, registers contracts, structures BOMs, increments material stocks, and drafts supplier RFQs.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Tech Pack Ingest form */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl glass-panel space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Raw Tech Pack Sheets</span>
              <div className="flex gap-2">
                {sampleTechPacks.map((sample, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleLoadSample(sample.text)}
                    className="text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-750 px-2 py-1 rounded"
                  >
                    Sample {idx + 1}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={techPackText}
              onChange={(e) => setTechPackText(e.target.value)}
              placeholder="Paste unstructured purchase sheet contents here... e.g. 'Zara wants 500 pcs denim jackets...'"
              rows="12"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-200 placeholder-slate-650 focus:outline-none focus:border-indigo-500 font-mono"
            />

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
                ⚠️ {error}
              </div>
            )}

            <button
              onClick={handleIngest}
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-850 text-white font-semibold text-xs py-3 rounded-xl shadow-lg shadow-indigo-600/10 transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  AI Ingestion Pipeline Executing...
                </>
              ) : (
                <>🤖 Ingest Tech Pack & Commit ERP</>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: AI Extraction & ERP Ledger results */}
        <div className="lg:col-span-7">
          {!result ? (
            <div className="p-12 rounded-2xl glass-panel border-dashed border-slate-850 flex flex-col items-center justify-center text-center space-y-3 h-[430px]">
              <span className="text-4xl text-slate-600">📄</span>
              <h3 className="font-bold text-slate-300 text-sm">Awaiting Tech Pack Ingestion</h3>
              <p className="text-xs text-slate-500 max-w-sm">Load a sample pack on the left or paste unstructured specs to view parsed ledger additions, BOM charts, and drafted RFQ emails.</p>
            </div>
          ) : (
            <div className="p-6 rounded-2xl glass-panel space-y-6 flex flex-col justify-between min-h-[430px]">
              {/* Header Tab bars */}
              <div className="flex border-b border-slate-800">
                <button
                  onClick={() => setActiveSubTab('specs')}
                  className={`px-4 py-2 text-xs font-bold border-b-2 uppercase tracking-wide transition-all ${
                    activeSubTab === 'specs' 
                      ? 'border-indigo-500 text-indigo-400' 
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Contract Specs
                </button>
                <button
                  onClick={() => setActiveSubTab('bom')}
                  className={`px-4 py-2 text-xs font-bold border-b-2 uppercase tracking-wide transition-all ${
                    activeSubTab === 'bom' 
                      ? 'border-indigo-500 text-indigo-400' 
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  BOM & Inventory
                </button>
                <button
                  onClick={() => setActiveSubTab('rfq')}
                  className={`px-4 py-2 text-xs font-bold border-b-2 uppercase tracking-wide transition-all ${
                    activeSubTab === 'rfq' 
                      ? 'border-indigo-500 text-indigo-400' 
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Vendor RFQ Draft
                </button>
              </div>

              {/* Subtab Content Panels */}
              <div className="flex-1 pt-4">
                {activeSubTab === 'specs' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <h4 className="font-bold text-xs text-slate-300 uppercase tracking-wide">Purchase Order Registered</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-850">
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wide block">Order ID Reference</span>
                        <span className="font-mono text-sm font-bold text-indigo-400">{result.purchase_order?.order_id}</span>
                      </div>
                      <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-850">
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wide block">Buyer Client Profile</span>
                        <span className="text-sm font-semibold text-slate-200">{result.purchase_order?.buyer_name}</span>
                        <span className="text-[10px] text-slate-450 block uppercase font-bold">{result.purchase_order?.buyer_id}</span>
                      </div>
                      <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-850">
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wide block">Garment Target Product</span>
                        <span className="text-sm text-slate-200 capitalize font-medium">{result.purchase_order?.item}</span>
                      </div>
                      <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-850">
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wide block">Fulfillment Target</span>
                        <span className="font-mono text-sm font-bold text-indigo-300">
                          {result.purchase_order?.quantity?.toLocaleString()} <span className="text-xs text-slate-500">{result.purchase_order?.unit}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {activeSubTab === 'bom' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                      <h4 className="font-bold text-xs text-slate-300 uppercase tracking-wide">Structured BOM & Material Stock updates</h4>
                    </div>
                    <div className="space-y-2">
                      {result.inventory_state?.map((inv, index) => {
                        const addedQty = result.extracted_data?.bom?.find(
                          b => b.item.toLowerCase().trim() === inv.item.toLowerCase().trim()
                        )?.quantity || 0;
                        return (
                          <div key={index} className="p-3 bg-slate-950 border border-slate-850 rounded-xl flex justify-between items-center text-xs">
                            <div>
                              <span className="capitalize font-semibold text-slate-200">{inv.item}</span>
                              <span className="text-[10px] text-emerald-400 block font-medium">Added: +{addedQty.toLocaleString()} {inv.unit}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[9px] text-slate-500 uppercase block font-bold">New Inventory Ledger Balance</span>
                              <span className="font-mono font-bold text-indigo-300">{inv.quantity.toLocaleString()} {inv.unit}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {activeSubTab === 'rfq' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                        <h4 className="font-bold text-xs text-slate-300 uppercase tracking-wide">RFQ Sourcing Email draft</h4>
                      </div>
                      <button
                        onClick={handleCopyToClipboard}
                        className="bg-slate-850 hover:bg-slate-750 text-indigo-300 border border-slate-750 font-semibold text-[10px] px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all"
                      >
                        {copySuccess ? 'Copied! ✓' : '📋 Copy Draft'}
                      </button>
                    </div>
                    <pre className="bg-slate-950 border border-slate-850 rounded-xl p-4 text-[11px] leading-relaxed text-slate-300 whitespace-pre-wrap overflow-y-auto max-h-[250px] font-sans">
                      {result.rfq_draft}
                    </pre>
                  </div>
                )}
              </div>

              {/* Status Commit Indicator */}
              <div className="pt-4 border-t border-slate-850 flex items-center justify-between text-[11px] text-slate-500">
                <span>Transaction state: <span className="font-semibold text-slate-300">COMMITTED</span></span>
                <span className="font-mono">DB Node Ref: SQLite::inventory+po+bom</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
