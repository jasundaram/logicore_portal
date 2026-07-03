import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, Send, X, MessageSquare, Bot, User as UserIcon, 
  RotateCcw, Sliders, ChevronDown, Check, Zap, Cpu, HelpCircle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from '../types';

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: string;
}

interface SmartAssistantProps {
  currentUser: User | null;
}

const MODELS = [
  { id: 'gemini-3.5-flash', name: 'Standard Dispatch Core', desc: 'Balanced, smart & general assistance', icon: Sparkles },
  { id: 'gemini-3.1-pro-preview', name: 'Deep Intelligence Engine', desc: 'Deep logistics analysis & queries', icon: Cpu },
  { id: 'gemini-3.1-flash-lite', name: 'High-Speed Core', desc: 'Ultra-fast sub-second responses', icon: Zap }
];

const ROLES = [
  { 
    id: 'support', 
    name: 'Customer Support Representative', 
    title: 'Support Desk Assistant',
    systemPrompt: 'You are an elite Customer Support Representative for SwiftDispatch Logistics (LogiCore). Your job is to help customers track their parcels, calculate rate estimates, explain B2C and B2B pricing, and answer questions about coverage zones. Always keep your tone polite, warm, professional, and reassuring. If asked about rates, remind them that Intra-zone B2C starts at $50 and Inter-zone B2B starts at $250.',
    suggestions: ['How are shipping rates calculated?', 'Tell me about the coverage zones.', 'What is the COD surcharge policy?']
  },
  { 
    id: 'strategist', 
    name: 'Logistics Dispatch Planner', 
    title: 'Dispatch Strategist',
    systemPrompt: 'You are a Senior Logistics & Route Optimization Planner for SwiftDispatch Logistics (LogiCore). You help dispatcher admins with courier assignments, resolving delivery bottlenecks, structuring coverage areas/territory zones, calculating B2B/B2C tariff sheets, and explaining dispatch status overrides. Use standard industry terms, be precise, data-driven, strategic, and concise.',
    suggestions: ['How should I assign couriers to Uptown?', 'What is the benefit of territory zoning?', 'Explain courier dispatch statuses.']
  },
  { 
    id: 'courier-assistant', 
    name: 'Courier Field Copilot', 
    title: 'Field Copilot',
    systemPrompt: 'You are a field delivery copilot for SwiftDispatch Courier Delivery Drivers. Help couriers navigate failed deliveries, communicate reschedule rules, check area statuses, and prioritize tasks. Keep answers extremely brief, clear, action-oriented, and mobile-friendly.',
    suggestions: ['What do I do if a delivery fails?', 'How does rescheduling work?', 'Tips for efficient route delivery.']
  },
  { 
    id: 'operations-ai', 
    name: 'Operations Analyst', 
    title: 'Ops Analyst',
    systemPrompt: 'You are the Core Logistics Operations Assistant. You help SwiftDispatch managers with business forecasting, analyzing dispatch histories, generating reports, writing custom database queries, and explaining the technical architecture of LogiCore.',
    suggestions: ['Draft a daily delivery summary template', 'Write a SQL query for busy couriers', 'How can we reduce delivery bottlenecks?']
  }
];

export default function SmartAssistant({ currentUser }: SmartAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-3.5-flash');
  const [selectedRole, setSelectedRole] = useState('support');
  const [showConfig, setShowConfig] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const threadEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-set role based on current user logged in
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'admin') {
        setSelectedRole('strategist');
      } else if (currentUser.role === 'agent') {
        setSelectedRole('courier-assistant');
      } else {
        setSelectedRole('support');
      }
    }
  }, [currentUser]);

  // Load chat history from localStorage on mount
  useEffect(() => {
    const historyKey = `dispatch_assistant_history_${currentUser?.id || 'guest'}`;
    const saved = localStorage.getItem(historyKey);
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        // Fallback to empty if parse fails
      }
    } else {
      // Default welcome message
      const welcome: Message = {
        id: 'welcome',
        role: 'ai',
        text: getWelcomeMessage(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages([welcome]);
    }
  }, [currentUser, selectedRole]);

  // Save chat history to localStorage when messages change
  useEffect(() => {
    if (messages.length > 0) {
      const historyKey = `dispatch_assistant_history_${currentUser?.id || 'guest'}`;
      localStorage.setItem(historyKey, JSON.stringify(messages));
    }
  }, [messages, currentUser]);

  // Auto-scroll to bottom of thread
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  function getWelcomeMessage() {
    const roleObj = ROLES.find(r => r.id === selectedRole) || ROLES[0];
    const nameStr = currentUser ? currentUser.name : 'there';
    return `Hi ${nameStr}! I am your **${roleObj.title}**. How can I help you optimize your SwiftDispatch logistics tasks today?`;
  }

  const handleResetChat = () => {
    const welcome: Message = {
      id: `welcome-${Date.now()}`,
      role: 'ai',
      text: getWelcomeMessage(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages([welcome]);
    setError(null);
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isTyping) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputText('');
    setIsTyping(true);
    setError(null);

    const activeRole = ROLES.find(r => r.id === selectedRole) || ROLES[0];

    try {
      const messageHistory = updatedMessages.slice(-15).map(m => ({
        role: m.role,
        text: m.text
      }));

      const res = await fetch('/api/dispatch-assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messageHistory,
          systemInstruction: activeRole.systemPrompt,
          model: selectedModel
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate response from assistant engine.');
      }

      const aiMsg: Message = {
        id: `msg-${Date.now()}-ai`,
        role: 'ai',
        text: data.text || 'Sorry, I could not generate a response.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      console.error('Assistant service error:', err);
      setError(err.message || 'Server connection error. Ensure core settings are configured.');
    } finally {
      setIsTyping(false);
    }
  };

  // Basic markdown parser for bold, lists, and linebreaks
  const parseMarkdown = (rawText: string) => {
    if (!rawText) return '';
    let escaped = rawText
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Code blocks
    escaped = escaped.replace(/```([\s\S]*?)```/g, '<pre class="bg-slate-900 text-slate-100 p-2.5 rounded-lg text-xs font-mono my-2 overflow-x-auto select-all border border-slate-800">$1</pre>');
    // Inline code
    escaped = escaped.replace(/`([^`]+)`/g, '<code class="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-mono text-xs border border-slate-200">$1</code>');
    // Bold
    escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>');
    // Bullet points
    escaped = escaped.replace(/^\s*-\s+(.+)$/gm, '<li class="list-disc ml-4 my-1 text-slate-700">$1</li>');
    // New lines
    escaped = escaped.replace(/\n/g, '<br/>');

    return <div className="leading-relaxed text-slate-700 space-y-1" dangerouslySetInnerHTML={{ __html: escaped }} />;
  };

  const currentRoleObj = ROLES.find(r => r.id === selectedRole) || ROLES[0];

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end" id="dispatch-assistant-root">
      
      {/* Floating Expandable Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 25, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="w-80 sm:w-96 h-[500px] bg-white rounded-2xl shadow-xl border border-slate-200 flex flex-col overflow-hidden mb-4"
            id="dispatch-assistant-window"
          >
            {/* Window Header */}
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <div className="bg-blue-600 p-1.5 rounded-lg text-white animate-pulse">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-xs uppercase tracking-wider flex items-center gap-1.5">
                    Dispatch Co-Pilot
                  </h3>
                  <span className="text-[10px] text-slate-400 block font-medium">
                    Role: {currentRoleObj.title}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowConfig(!showConfig)}
                  className={`p-1.5 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 hover:text-white cursor-pointer ${showConfig ? 'bg-slate-800 text-white' : ''}`}
                  title="Configure Core Settings"
                >
                  <Sliders className="h-4 w-4" />
                </button>
                <button
                  onClick={handleResetChat}
                  className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 hover:text-white cursor-pointer"
                  title="Reset Thread"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Quick config overlays */}
            <AnimatePresence>
              {showConfig && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-slate-50 border-b border-slate-200 p-4 shrink-0 overflow-hidden text-xs text-slate-700 space-y-3"
                  id="dispatch-assistant-config"
                >
                  {/* Select Assistant Persona */}
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Choose Assistant Persona
                    </label>
                    <select
                      value={selectedRole}
                      onChange={(e) => {
                        setSelectedRole(e.target.value);
                        setShowConfig(false);
                      }}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 text-xs font-semibold cursor-pointer text-slate-800"
                    >
                      {ROLES.map(role => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Select Model */}
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Select Processing Core
                    </label>
                    <div className="grid grid-cols-1 gap-1">
                      {MODELS.map(m => {
                        const Icon = m.icon;
                        const isSelected = selectedModel === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setSelectedModel(m.id)}
                            className={`w-full p-2 rounded-xl text-left border flex items-center justify-between transition-all cursor-pointer ${
                              isSelected 
                                ? 'bg-blue-50 border-blue-200 text-blue-900 font-bold' 
                                : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-650'
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <Icon className={`h-3.5 w-3.5 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                              <div>
                                <span className="block text-[10px]">{m.name}</span>
                                <span className="block text-[8px] text-slate-400 font-normal">{m.desc}</span>
                              </div>
                            </div>
                            {isSelected && <Check className="h-3.5 w-3.5 text-blue-600" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Conversation Thread */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50" id="dispatch-assistant-thread">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 items-start ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  {/* Avatar */}
                  <div className={`p-1.5 rounded-lg shrink-0 ${
                    msg.role === 'user' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-slate-800 text-white'
                  }`}>
                    {msg.role === 'user' ? (
                      <UserIcon className="h-3.5 w-3.5" />
                    ) : (
                      <Bot className="h-3.5 w-3.5" />
                    )}
                  </div>

                  {/* Message Bubble */}
                  <div className={`max-w-[78%] flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`p-3 rounded-2xl shadow-2xs text-xs ${
                      msg.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-tr-none' 
                        : 'bg-white text-slate-700 border border-slate-200/80 rounded-tl-none'
                    }`}>
                      {msg.role === 'user' ? (
                        <div className="whitespace-pre-wrap">{msg.text}</div>
                      ) : (
                        parseMarkdown(msg.text)
                      )}
                    </div>
                    <span className="text-[8px] text-slate-400 mt-1 px-1 font-mono">
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex gap-2.5 items-start">
                  <div className="p-1.5 rounded-lg shrink-0 bg-slate-800 text-white animate-pulse">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                  <div className="bg-white text-slate-500 border border-slate-200 p-3.5 rounded-2xl rounded-tl-none shadow-2xs max-w-[70%] text-xs flex items-center gap-1.5 font-medium">
                    <div className="flex space-x-1">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">processing...</span>
                  </div>
                </div>
              )}

              {/* Error log block */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-[10px] leading-relaxed">
                  <span className="font-bold block uppercase mb-0.5">Engine Notice:</span>
                  {error}
                </div>
              )}

              <div ref={threadEndRef} />
            </div>

            {/* Quick Suggestions Shelf */}
            {messages.length === 1 && !isTyping && (
              <div className="px-4 py-2 bg-slate-50 border-t border-slate-150 shrink-0 flex flex-col gap-1.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <HelpCircle className="h-3 w-3" /> Quick Inquiries
                </span>
                <div className="flex flex-wrap gap-1">
                  {currentRoleObj.suggestions.map((sug) => (
                    <button
                      key={sug}
                      onClick={() => handleSendMessage(sug)}
                      className="text-[10px] text-slate-650 bg-white border border-slate-200 rounded-lg px-2 py-1 text-left hover:border-blue-500 hover:text-blue-600 transition-all font-medium cursor-pointer"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message Input Box */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputText);
              }}
              className="p-3 border-t border-slate-200 bg-white flex gap-2 shrink-0 items-center"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Type a message to ${currentRoleObj.title}...`}
                disabled={isTyping}
                className="flex-1 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-blue-600 focus:bg-white transition-colors disabled:opacity-60"
                id="dispatch-assistant-input"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isTyping}
                className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                id="dispatch-assistant-send"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toggle Bubble Icon */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="h-12 w-12 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 transition-colors cursor-pointer relative"
        id="btn-dispatch-assistant-toggle"
        title="Open Dispatch Co-Pilot"
      >
        {isOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <>
            <MessageSquare className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
            </span>
          </>
        )}
      </motion.button>

    </div>
  );
}
