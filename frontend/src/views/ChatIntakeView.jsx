import React, { useState } from 'react';
import {
  Send,
  Bot,
  User,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCcw,
  Package,
  Calendar,
  MapPin,
  Flame,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../services/api.js';
import { Badge } from '../components/Badge.jsx';

export const ChatIntakeView = () => {
  const [messages, setMessages] = useState([
    {
      sender: 'assistant',
      text: 'Hello! I am your Corvo Procurement Assistant. Tell me what you need to purchase (e.g., "Need 200 nitrile gloves for Chakan by next Friday") and I will help raise your Purchase Requisition.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentState, setCurrentState] = useState({});
  const [createdPR, setCreatedPR] = useState(null);

  const samplePrompts = [
    'Need 200 nitrile gloves for Chakan by next Friday',
    'Urgent need for 50 hydraulic hose 1/2 inch 2 wire at Bhosari by 2026-11-28',
    'Require 4 EOT crane 5 ton for Bhosari by next month',
    'Need 1 drinking water purifier 50 LPH for Bhosari by 2026-11-20',
  ];

  const handleSend = async (textToSend) => {
    const text = textToSend || input;
    if (!text.trim() || loading) return;

    const userMsg = {
      sender: 'user',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const state = await api.sendChatMessage(text, currentState);
      setCurrentState(state);

      const assistantMsg = {
        sender: 'assistant',
        text: state.assistantResponse,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: `Sorry, an error occurred: ${err.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPR = async () => {
    if (!currentState || !currentState.isComplete) return;

    try {
      setLoading(true);
      const res = await api.createPRFromChat(currentState);
      setCreatedPR(res.pr);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: `🎉 **Success!** ${res.message}\nPR Number: **${res.pr.pr_no}** has been generated and routed to the Requirements Workspace.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      // Reset state for next PR
      setCurrentState({});
    } catch (err) {
      alert(`Error creating PR: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCurrentState({});
    setCreatedPR(null);
    setMessages([
      {
        sender: 'assistant',
        text: 'Session reset. What would you like to purchase?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto h-[calc(100vh-4rem)] flex flex-col gap-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Conversational Purchase Requisition Intake</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Employees raise purchase requests via natural language. The assistant extracts entities, matches catalog items, resolves plants, and confirms before creating PRs.
          </p>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-2xs active:scale-95"
        >
          <RefreshCcw className="w-3.5 h-3.5 text-blue-600" />
          <span>New Request</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Chat Window (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col overflow-hidden">
          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-3 max-w-2xl ${m.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold shadow-xs ${
                    m.sender === 'user'
                      ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white'
                      : 'bg-[#0f172a] text-slate-200'
                  }`}
                >
                  {m.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-blue-400" />}
                </div>

                <div
                  className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-line shadow-2xs ${
                    m.sender === 'user'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-xs shadow-blue-500/10'
                      : 'bg-slate-50 text-slate-800 rounded-tl-xs border border-slate-200/80'
                  }`}
                >
                  {m.text}
                  <div
                    className={`text-[10px] mt-1.5 text-right font-mono ${
                      m.sender === 'user' ? 'text-blue-200' : 'text-slate-400'
                    }`}
                  >
                    {m.timestamp}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#0f172a] text-white flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-blue-400 animate-pulse" />
                </div>
                <div className="bg-slate-50 border border-slate-200/80 text-slate-600 p-3 rounded-2xl rounded-tl-xs text-xs flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce"></span>
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:0.4s]"></span>
                  <span className="font-medium text-slate-500">Analyzing policy and item catalog...</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Prompts Bar */}
          <div className="p-3 bg-slate-50/80 border-t border-slate-100 flex items-center gap-2 overflow-x-auto text-xs">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] whitespace-nowrap flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" /> Prompts:
            </span>
            {samplePrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(p)}
                className="px-2.5 py-1 rounded-full bg-white border border-slate-200/90 text-slate-600 hover:text-blue-600 hover:border-blue-300 transition-colors whitespace-nowrap text-[11px] shadow-2xs active:scale-95"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="p-4 bg-white border-t border-slate-200 flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your request... e.g. Need 200 nitrile gloves for Chakan by next Friday"
              className="flex-1 px-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-semibold text-xs transition-all shadow-md shadow-blue-500/20 flex items-center gap-2 disabled:opacity-40 active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>Send</span>
            </button>
          </div>
        </div>

        {/* Live Extracted Entities Cockpit Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm tracking-tight flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Live Entity Extraction Cockpit</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Real-time parser output conforming to Corvo Master Schema
              </p>
            </div>

            <div className="mt-4 space-y-3">
              {/* Item Identification Tile */}
              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/70">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <Package className="w-3 h-3 text-blue-500" />
                  <span>Item Identification</span>
                </div>
                <div className="mt-1.5 font-medium text-slate-900 text-xs">
                  {currentState.matchedItemCode ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono text-blue-600 font-bold">{currentState.matchedItemCode}</span>
                      <span className="text-[11px] text-slate-600 leading-tight">{currentState.itemDescription}</span>
                    </div>
                  ) : currentState.itemDescription ? (
                    <div className="text-amber-700 text-xs font-semibold">
                      <span>[New Item]:</span> {currentState.itemDescription}
                    </div>
                  ) : (
                    <span className="text-slate-400 italic text-xs">Awaiting input...</span>
                  )}
                </div>
              </div>

              {/* Grid 2x2 for Quantity, Plant, Date, Urgency */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/70">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Quantity</span>
                  <div className="mt-1 font-mono font-bold text-slate-900 text-xs">
                    {currentState.quantity ? (
                      `${currentState.quantity} ${currentState.uom || 'NOS'}`
                    ) : (
                      <span className="text-slate-400 font-normal italic text-xs">Missing</span>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/70">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <MapPin className="w-3 h-3 text-indigo-500" />
                    <span>Plant</span>
                  </div>
                  <div className="mt-1">
                    {currentState.plant ? (
                      <Badge type="plant" value={currentState.plant} />
                    ) : (
                      <span className="text-slate-400 italic text-xs">Missing</span>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/70">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <Calendar className="w-3 h-3 text-emerald-500" />
                    <span>Need-by</span>
                  </div>
                  <div className="mt-1 font-mono text-[11px] font-semibold text-slate-800">
                    {currentState.need_by_date || <span className="text-slate-400 font-normal italic text-xs">Missing</span>}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/70">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <Flame className="w-3 h-3 text-rose-500" />
                    <span>Urgency</span>
                  </div>
                  <div className="mt-1">
                    <Badge type="urgency" value={currentState.urgency || 'Normal'} />
                  </div>
                </div>
              </div>

              {/* New Item Price requirement if applicable */}
              {currentState.isNewItem && (
                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80">
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                    Estimated Unit Price (New Item)
                  </span>
                  <div className="mt-1 font-mono font-bold text-amber-900 text-xs">
                    {currentState.estimated_unit_price ? (
                      `₹${currentState.estimated_unit_price.toLocaleString('en-IN')}`
                    ) : (
                      <span className="text-amber-600 font-normal italic text-xs">Required for New Item</span>
                    )}
                  </div>
                </div>
              )}

              {/* Status checklist */}
              <div className="pt-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Intake Readiness
                </span>
                {currentState.isComplete ? (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-semibold shadow-2xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>All fields validated! Ready to raise PR.</span>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-amber-900 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-[11px]">
                      <span className="font-bold">Missing: </span>
                      {currentState.missingFields && currentState.missingFields.length > 0
                        ? currentState.missingFields.join(', ')
                        : 'Awaiting user input'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Confirm Action Button */}
          <div className="pt-4 border-t border-slate-100">
            <button
              onClick={handleConfirmPR}
              disabled={!currentState.isComplete || loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white font-bold text-xs transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 active:scale-98"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm & Create Purchase Requisition</span>
            </button>
            <p className="text-[10px] text-slate-400 text-center mt-2">
              PR will be submitted for policy-driven grouping & valuation
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
