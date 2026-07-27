import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function RAGTab() {
  const [documents, setDocuments] = useState([]);
  const [fileToUpload, setFileToUpload] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [error, setError] = useState('');
  
  // RAG query state
  const [ragPrompt, setRagPrompt] = useState('');
  const [ragHistory, setRagHistory] = useState([
    { role: 'assistant', text: 'Ask me any question. I will search only the text extracts of the uploaded PDF/DOCX/Excel/CSV files and summarize the answer for you with sources.', sources: [] }
  ]);
  const [queryLoading, setQueryLoading] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoadingDocs(true);
    try {
      const res = await axios.get('/assistant/rag/documents');
      setDocuments(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleFileChange = (e) => {
    setFileToUpload(e.target.files[0]);
    setError('');
  };

  const handleUpload = async () => {
    if (!fileToUpload) return;
    setUploading(true);
    setError('');
    
    const formData = new FormData();
    formData.append('file', fileToUpload);

    try {
      await axios.post('/assistant/rag/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFileToUpload(null);
      // Reset input element
      document.getElementById('rag-file-input').value = '';
      await fetchDocuments();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to extract text or index document.');
    } finally {
      setUploading(false);
    }
  };

  const handleSendRagQuery = async () => {
    if (!ragPrompt.trim()) return;
    const userMsg = ragPrompt;
    setRagPrompt('');
    setRagHistory(prev => [...prev, { role: 'user', text: userMsg, sources: [] }]);
    setQueryLoading(true);

    try {
      const res = await axios.post('/assistant/rag/query', { question: userMsg });
      setRagHistory(prev => [...prev, { 
        role: 'assistant', 
        text: res.data.response,
        sources: res.data.sources || []
      }]);
    } catch (err) {
      console.error(err);
      setRagHistory(prev => [...prev, { role: 'assistant', text: 'Error executing RAG document matching search.', sources: [] }]);
    } finally {
      setQueryLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Document Knowledge Base (RAG)</h2>
          <p className="text-xs text-slate-400 font-normal">Upload PDF, DOCX, Excel or CSV tech packs, contracts, and invoices to query them offline via local LLM indexing.</p>
        </div>
        <button onClick={fetchDocuments} className="text-xs font-bold bg-slate-800 hover:bg-slate-750 text-indigo-350 px-3.5 py-2 rounded-xl border border-slate-750 transition-all">
          🔄 Refresh Library
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: File Upload & Document List */}
        <div className="lg:col-span-5 space-y-4">
          {/* Upload card */}
          <div className="p-5 rounded-2xl glass-panel space-y-4">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Index New Document</h3>
            
            <div className="relative border-2 border-dashed border-slate-850 rounded-2xl hover:border-indigo-500/50 transition-colors p-6 bg-slate-950/40 flex flex-col items-center justify-center text-center space-y-2">
              <input
                id="rag-file-input"
                type="file"
                accept=".pdf,.docx,.xlsx,.xls,.csv,.txt"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <span className="text-3xl">📤</span>
              <p className="text-xs font-semibold text-slate-350">
                {fileToUpload ? fileToUpload.name : 'Choose contract, invoice, or tech pack'}
              </p>
              <p className="text-[9px] text-slate-550">Supports PDF, DOCX, Excel (XLSX), CSV</p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-450 text-xs font-medium">
                ⚠️ {error}
              </div>
            )}

            {fileToUpload && (
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 text-white font-semibold text-xs py-3 rounded-xl shadow-lg transition-all"
              >
                {uploading ? 'Extracting text content...' : '⚡ Index into Knowledge Base'}
              </button>
            )}
          </div>

          {/* Documents list */}
          <div className="p-5 rounded-2xl glass-panel space-y-3">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Indexed Documents Library</h3>
            {loadingDocs ? (
              <div className="text-center py-6 text-slate-500 text-xs">
                <span className="animate-spin inline-block w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full mr-2" />
                Scanning index...
              </div>
            ) : documents.length === 0 ? (
              <p className="text-xs text-slate-500 italic text-center py-6">No RAG files uploaded yet.</p>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {documents.map((doc, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2.5 rounded-xl bg-slate-950 border border-slate-850 text-xs">
                    <div className="truncate max-w-[70%]">
                      <p className="font-semibold text-slate-300 truncate">{doc.filename}</p>
                      <p className="text-[8px] text-slate-550 font-mono mt-0.5">Uploaded: {doc.uploaded_at}</p>
                    </div>
                    <span className="font-mono text-[9px] bg-slate-900 text-indigo-400 border border-slate-800 px-2 py-0.5 rounded">
                      {doc.doc_type}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: RAG Search Chat Box */}
        <div className="lg:col-span-7 p-5 rounded-2xl glass-panel flex flex-col h-[520px] justify-between">
          <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
            <div>
              <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">RAG Retrieval Search Agent</h3>
              <span className="text-[9px] text-slate-500 font-bold block">ANSWERS WILL BE SOURCED ONLY FROM UPLOADED FILES</span>
            </div>
            <span className="text-xs bg-indigo-950 border border-indigo-900 text-indigo-400 px-2.5 py-0.5 rounded font-mono">RAG Mode</span>
          </div>

          {/* RAG history */}
          <div className="flex-1 overflow-y-auto my-4 space-y-3 pr-1 text-xs scrollbar-thin">
            {ragHistory.map((msg, idx) => (
              <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`p-3.5 rounded-2xl max-w-[85%] leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                    : 'bg-slate-900 border border-slate-800 text-slate-300 rounded-tl-none'
                }`}>
                  <div className="font-sans">{msg.text}</div>
                  
                  {/* Sources display */}
                  {msg.sources?.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-800 text-[8px] text-slate-500 flex flex-wrap gap-1 font-mono">
                      <span className="font-bold uppercase">Sources:</span>
                      {msg.sources.map((src, sIdx) => (
                        <span key={sIdx} className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-850">
                          {src}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {queryLoading && (
              <div className="flex justify-start">
                <div className="p-3 rounded-2xl max-w-[80%] bg-slate-900 border border-slate-800 text-slate-500 rounded-tl-none flex items-center gap-2 text-xs">
                  <span className="animate-bounce">●</span>
                  <span className="animate-bounce delay-75">●</span>
                  <span className="animate-bounce delay-150">●</span>
                  <span>Scanning index layers...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input field */}
          <div className="flex gap-2 border-t border-slate-850 pt-3">
            <input
              type="text"
              placeholder="Ask documents (e.g. what are the payment terms in contract?)"
              value={ragPrompt}
              onChange={(e) => setRagPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendRagQuery()}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-sans"
            />
            <button
              onClick={handleSendRagQuery}
              disabled={queryLoading || !ragPrompt.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
            >
              Search
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
