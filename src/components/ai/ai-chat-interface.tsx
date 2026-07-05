"use client";

import React, { useState, useRef, useEffect } from "react";
import { askAssistant } from "@/app/actions/ai";
import { GlassCard } from "@/components/ui/glass-card";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export const AIChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I am Mr. Boot AI Strategist. Ask me about today's revenues, low stock items, or recent intake details.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const newHistory: Message[] = [...messages, { role: "user", content: text }];
    setMessages(newHistory);
    setInput("");
    setLoading(true);

    try {
      const res = await askAssistant(newHistory);
      setLoading(false);

      if (res.success && res.reply) {
        setMessages([...newHistory, { role: "assistant", content: res.reply }]);
      } else {
        setMessages([
          ...newHistory,
          {
            role: "assistant",
            content: `⚠️ ${res.error || "Failed to communicate with the AI. Please check that the GROQ_API_KEY is configured."}`,
          },
        ]);
      }
    } catch (e: any) {
      setLoading(false);
      setMessages([
        ...newHistory,
        { role: "assistant", content: `⚠️ Error: ${e.message}` },
      ]);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 h-[calc(100vh-200px)]">
      {/* Left Chat Console */}
      <div className="lg:col-span-7 flex flex-col bg-white/65 dark:bg-primary/65 backdrop-blur-xl border border-white/22 rounded-2xl overflow-hidden relative shadow-sm h-full justify-between">
        {/* Glow */}
        <div className="absolute top-1/4 left-1/4 w-40 h-40 bg-tertiary-fixed-dim/10 rounded-full blur-[50px] pointer-events-none"></div>

        {/* Chat History */}
        <div className="flex-grow overflow-y-auto p-6 space-y-4 custom-scrollbar relative z-10">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] p-4 rounded-2xl shadow-sm ${
                  msg.role === "user"
                    ? "bg-primary text-on-primary rounded-tr-sm"
                    : "bg-white/90 border border-black/5 rounded-tl-sm text-primary"
                }`}
              >
                <p className="text-sm font-medium whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white/90 border border-black/5 p-4 rounded-2xl rounded-tl-sm text-primary flex items-center gap-2">
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.4s]"></span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>


        {/* Action Controls Input */}
        <div className="p-4 bg-white/40 border-t border-black/5 backdrop-blur-md z-10 relative">
          <div className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSendMessage(input);
              }}
              className="w-full bg-white/80 border border-black/5 focus:border-primary focus:ring-1 focus:ring-primary rounded-full py-3.5 pl-5 pr-16 text-sm text-primary shadow-inner"
              placeholder="Ask anything... e.g. 'Show me low stock alerts'"
            />
            <button
              onClick={() => handleSendMessage(input)}
              className="absolute right-2 p-2 bg-primary text-on-primary rounded-full hover:opacity-90 transition-all flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
            </button>
          </div>

          {/* Quick suggestions */}
          <div className="flex gap-2 mt-3 px-2 overflow-x-auto pb-1">
            {[
              "Show low stock supplies",
              "What is today's revenue?",
              "Summarize recent orders",
            ].map((suggest) => (
              <button
                key={suggest}
                onClick={() => handleSendMessage(suggest)}
                className="whitespace-nowrap px-3 py-1 bg-white/50 border border-black/5 hover:bg-white/80 rounded-full text-xs text-on-surface-variant transition-colors"
              >
                {suggest}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column: Dynamic Insight Cards */}
      <div className="lg:col-span-5 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
        <GlassCard>
          <div className="flex items-center gap-3 mb-4">
            <span className="material-symbols-outlined text-primary p-2 bg-primary-fixed/20 rounded-lg">
              lightbulb
            </span>
            <h3 className="font-semibold text-primary dark:text-primary-fixed">Strategic Predictions</h3>
          </div>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            Based on current service speeds, sole replacements take average of 1.4 days. Restocking Barge Sole Glue can help maintain standard fulfillment times.
          </p>
        </GlassCard>

        <GlassCard>
          <h4 className="font-semibold text-sm mb-3">AI Quick Actions</h4>
          <div className="space-y-2">
            <button
              onClick={() => handleSendMessage("Draft a reminder for all ready orders.")}
              className="w-full p-3 bg-white/40 border border-black/5 hover:bg-white/80 text-left rounded-xl transition-all text-xs font-semibold flex justify-between items-center"
            >
              <span>Draft picking reminders</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
            <button
              onClick={() => handleSendMessage("Summarize customer repeat rate statistics.")}
              className="w-full p-3 bg-white/40 border border-black/5 hover:bg-white/80 text-left rounded-xl transition-all text-xs font-semibold flex justify-between items-center"
            >
              <span>Analyze loyalty cohorts</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
