// Tutorials - Projector tutorials and guides
'use client';

import { useState } from 'react';
import { Play, Download, BookOpen } from 'lucide-react';

export default function Tutorials({ onBack }) {
  const [selectedTutorial, setSelectedTutorial] = useState(null);

  const tutorials = [
    {
      id: 1,
      title: 'Complete Setup Guide',
      description: 'Step-by-step projector setup instructions',
      category: 'Setup',
      videoUrl: '#',
      duration: '15 min',
    },
    {
      id: 2,
      title: 'WiFi Connection Tutorial',
      description: 'How to connect your projector to WiFi',
      category: 'Connectivity',
      videoUrl: '#',
      duration: '8 min',
    },
    {
      id: 3,
      title: 'Troubleshooting Common Issues',
      description: 'Fix common problems quickly',
      category: 'Troubleshooting',
      videoUrl: '#',
      duration: '20 min',
    },
  ];

  if (selectedTutorial) {
    return (
      <div className="h-full flex flex-col bg-black">
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-white text-lg font-bold mb-4">{selectedTutorial.title}</h3>
          <div className="bg-gray-800 rounded-lg p-4 mb-4">
            <div className="aspect-video bg-gray-700 rounded-lg flex items-center justify-center mb-4">
              <Play className="w-12 h-12 text-gray-400" />
            </div>
            <p className="text-gray-300 text-sm mb-4">{selectedTutorial.description}</p>
            <div className="flex items-center space-x-2 text-sm text-gray-400 mb-4">
              <span>{selectedTutorial.category}</span>
              <span>•</span>
              <span>{selectedTutorial.duration}</span>
            </div>
            <button className="w-full py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 flex items-center justify-center space-x-2">
              <Download className="w-4 h-4" />
              <span>Download Guide</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black">
      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-white text-lg font-bold mb-4">Projector Tutorials & Guides</h3>
        <div className="space-y-3">
          {tutorials.map((tutorial) => (
            <button
              key={tutorial.id}
              onClick={() => setSelectedTutorial(tutorial)}
              className="w-full p-4 bg-gray-800 border border-gray-700 rounded-xl hover:border-pink-500 transition-all text-left group"
            >
              <div className="flex items-start space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Play className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-medium group-hover:text-pink-400 transition-colors mb-1">
                    {tutorial.title}
                  </h4>
                  <p className="text-gray-400 text-sm mb-2">{tutorial.description}</p>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <span>{tutorial.category}</span>
                    <span>•</span>
                    <span>{tutorial.duration}</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

