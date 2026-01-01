// Demo page to test the new chat widget
'use client';

import ChatWidget from './widget-chat';

export default function ChatWidgetDemo() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">New Chat Widget Demo</h1>
        <p className="text-gray-600 mb-8">
          This is the new AI-style chat widget. Hover over the floating icon in the bottom-right corner to see the help text, then click to open it.
        </p>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Features</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>AI-style chat interface</li>
            <li>Quick action suggestions</li>
            <li>Category filtering</li>
            <li>Chat history</li>
            <li>Connected to Knowledge Base</li>
            <li>Projector-specific support</li>
          </ul>
        </div>
      </div>

      {/* Widget */}
      <ChatWidget />
    </div>
  );
}

