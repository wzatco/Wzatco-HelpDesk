// Demo page to test the widget
'use client';

import CustomerWidget from './widget';

export default function WidgetDemo() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Widget Demo Page</h1>
        <p className="text-gray-600 mb-8">
          This page demonstrates the customer support widget. Hover over the floating icon in the bottom-right corner to see the help text, then click to open it.
        </p>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">How to Use</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Look for the floating icon in the bottom-right corner</li>
            <li>Hover over it to see "Need help?" text</li>
            <li>Click it to open the widget</li>
            <li>Enter your name and email to login</li>
            <li>Explore the different support options</li>
          </ol>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Features</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>Knowledge Base - Search help articles</li>
            <li>Tutorials - Projector setup guides</li>
            <li>Schedule Callback - Book phone callbacks</li>
            <li>Ticket Management - Create and manage support tickets</li>
            <li>Profile Management - Update your information</li>
          </ul>
        </div>
      </div>

      {/* Widget */}
      <CustomerWidget />
    </div>
  );
}

