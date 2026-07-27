import React, { useState } from 'react';
import axios from 'axios';

export default function AIAssistantTab() {
  const [activeContext, setActiveContext] = useState('all');
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hello! I am your SmartFactory Executive AI Agent. I have full query capability over your SQLite registers. Select a context filter on the left or send me an inquiry.', actions: [] }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [loading, setLoading] = useState(false);

  const contextItems = [
    { id: 'all', name: 'Global ERP Context', icon: '🌐' },
    { id: 'orders', name: 'Purchase Contracts', icon: '📦' },
    { id: 'inventory', name: 'Materials Inventory', icon: '🧵' },
    { id: 'suppliers', name: 'Suppliers Performance', icon: '🛒' },
    { id: 'qc', name: 'QC Auditing Logs', icon: '🔍' },
  ];

  const suggestions = [
    { text: 'Which active orders are High Risk?', context: 'orders' },
    { text: 'What material inventory is below safety limit?', context: 'inventory' },
    { text: 'Compare supplier performance grades', context: 'suppliers' },
    { text: 'Show recent quality defect trends', context: 'qc' },
  ];

  const handleSendChat = async (textToSend) => {
    const prompt = textToSend || chatInput;
    if (!prompt.trim()) return;

    setMessages(prev => [...prev, { role: 'user', text: prompt, actions: [] }]);
    if (!textToSend) setChatInput('');
    setLoading(true);

    try {
      const res = await axios.post('/assistant/chat', {
        message: prompt,
        context_type: activeContext
      });
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        text: res.data.response,
        actions: res.data.actions || []
      }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', text: 'Error executing assistant orchestration payload.', actions: [] }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)]">
      {/* Context Sidebar */}
      <div className="lg:col-span-3 p-4 rounded-2xl glass-panel space-y-4 flex flex-col justify-between h-full">
        <div className="space-y-3">
          <span className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Context Scope Filter</span>
          <div className="space-y-1.5">
            {contextItems.map((item) => {
              const isActive = activeContext === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveContext(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 text-left ${
                    isActive 
                      ? 'bg-gradient-to-r from-indigo-600/90 to-indigo-700 text-white font-semibold' 
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100'
                  }`}
                >
                  <span className="text-sm">{item.icon}</span>
                  <span className="text-xs">{item.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Informational Panel */}
        <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-900 text-[10px] text-slate-500 leading-relaxed font-sans">
          Select a context to narrow the AI scope. For example, selecting <strong>Materials Inventory</strong> feeds active warehouse stock volumes directly into the LLM context prompt for exact calculations.
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="lg:col-span-9 p-5 rounded-2xl glass-panel flex flex-col justify-between h-full">
        <div className="border-b border-slate-800 pb-3 flex justify-between items-center flex-shrink-0">
          <div>
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Enterprise AI Executive Assistant</h3>
            <span className="text-[9px] text-slate-550 block font-bold mt-0.5">CURRENT RUNNING CONTEXT: {contextItems.find(c=>c.id===activeContext).name}</span>
          </div>
          <button 
            onClick={() => setMessages([{ role: 'assistant', text: 'Chat history cleared. How can I help you today?', actions: [] }])}
            className="text-[10px] text-slate-500 hover:text-slate-350 underline"
          >
            Clear History
          </button>
        </div>

        {/* Message history */}
        <div className="flex-1 overflow-y-auto my-4 space-y-4 pr-1 scrollbar-thin flex flex-col justify-between">
          <div className="space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`p-4 rounded-2xl max-w-[80%] leading-relaxed text-xs space-y-3 ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-600/10' 
                    : 'bg-slate-900 border border-slate-800 text-slate-300 rounded-tl-none'
                }`}>
                  <div className="whitespace-pre-wrap font-sans">{msg.text}</div>
                  
                  {/* Actions mapping */}
                  {msg.actions?.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {msg.actions.map((act, aIdx) => (
                        <span key={aIdx} className="bg-indigo-900/50 hover:bg-indigo-850/60 border border-indigo-700/60 px-3 py-1 rounded-lg text-[10px] font-bold text-indigo-300">
                          🎯 suggested: {act}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start">
                <div className="p-3 rounded-2xl max-w-[80%] bg-slate-900 border border-slate-800 text-slate-500 rounded-tl-none flex items-center gap-2 text-xs">
                  <span className="animate-bounce">●</span>
                  <span className="animate-bounce delay-75">●</span>
                  <span className="animate-bounce delay-150">●</span>
                  <span>Orchestrating databases...</span>
                </div>
              </div>
            )}
          </div>

          {/* Prompt Suggestions */}
          {messages.length === 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-6 border-t border-slate-900/60">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => { setActiveContext(s.context); handleSendChat(s.text); }}
                  className="p-3 bg-slate-950 hover:bg-slate-900 border border-slate-850 rounded-xl text-left transition-all hover:border-indigo-500/30"
                >
                  <p className="text-[10px] font-bold text-indigo-400">Context: {contextItems.find(c => c.id === s.context).name}</p>
                  <p className="text-xs text-slate-300 mt-1 font-semibold">"{s.text}"</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Input box */}
        <div className="flex gap-2 border-t border-slate-850 pt-3 flex-shrink-0">
          <input
            type="text"
            placeholder="Type your instruction or business question here..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-sans"
          />
          <button
            onClick={() => handleSendChat()}
            disabled={loading || !chatInput.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 text-white font-bold text-xs px-6 py-3 rounded-xl transition-all"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
