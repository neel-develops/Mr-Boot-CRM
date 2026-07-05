import React from "react";
import { AIChatInterface } from "@/components/ai/ai-chat-interface";

export default function AIAssistantPage() {
  return (
    <div className="w-full max-w-[1200px] px-4 md:px-gutter mx-auto py-4">
      {/* Header */}
      <header className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-headline-lg font-headline-lg text-primary dark:text-primary-fixed">Intelligence Hub</h2>
          <p className="text-on-surface-variant font-body-md text-body-md">
            Ask questions, get insights, and manage database queries using Llama AI.
          </p>
        </div>
      </header>

      {/* Interface Chat */}
      <AIChatInterface />
    </div>
  );
}
export const dynamic = 'force-dynamic';
