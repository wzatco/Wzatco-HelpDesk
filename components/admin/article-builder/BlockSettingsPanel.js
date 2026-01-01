'use client';

import { useState } from 'react';
import { X, Palette, Type, Layout, Image as ImageIcon } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';

export default function BlockSettingsPanel({ block, onUpdate, onClose }) {
  const [activeTab, setActiveTab] = useState('content');
  const { data, styles } = block;

  const updateStyle = (key, value) => {
    onUpdate({
      styles: { ...styles, [key]: value },
    });
  };

  const updateData = (key, value) => {
    onUpdate({
      data: { ...data, [key]: value },
    });
  };

  const renderContentSettings = () => {
    switch (block.type) {
      case 'heading':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Heading Level
              </label>
              <select
                value={data.level || 1}
                onChange={(e) => updateData('level', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value={1}>H1</option>
                <option value={2}>H2</option>
                <option value={3}>H3</option>
                <option value={4}>H4</option>
                <option value={5}>H5</option>
                <option value={6}>H6</option>
              </select>
            </div>
          </div>
        );
      case 'list':
        return (
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={data.ordered || false}
                  onChange={(e) => updateData('ordered', e.target.checked)}
                  className="rounded"
                />
                Ordered List
              </label>
            </div>
          </div>
        );
      case 'button':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Button Style
              </label>
              <select
                value={data.style || 'primary'}
                onChange={(e) => updateData('style', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="primary">Primary</option>
                <option value="secondary">Secondary</option>
                <option value="outline">Outline</option>
              </select>
            </div>
          </div>
        );
      default:
        return <p className="text-sm text-slate-500 dark:text-slate-400">No content settings available</p>;
    }
  };

  const renderStyleSettings = () => {
    return (
      <div className="space-y-4">
        {/* Typography */}
        {(block.type === 'heading' || block.type === 'text' || block.type === 'quote') && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Font Size
              </label>
              <Input
                type="text"
                value={styles?.fontSize || ''}
                onChange={(e) => updateStyle('fontSize', e.target.value)}
                placeholder="e.g., 1.5rem, 24px"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Font Weight
              </label>
              <select
                value={styles?.fontWeight || 'normal'}
                onChange={(e) => updateStyle('fontWeight', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="normal">Normal</option>
                <option value="bold">Bold</option>
                <option value="600">Semi-bold</option>
                <option value="300">Light</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Text Color
              </label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={styles?.color?.replace(/[^#0-9A-F]/gi, '') || '#1e293b'}
                  onChange={(e) => updateStyle('color', e.target.value)}
                  className="w-16 h-10"
                />
                <Input
                  type="text"
                  value={styles?.color || ''}
                  onChange={(e) => updateStyle('color', e.target.value)}
                  placeholder="#1e293b"
                  className="flex-1"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Text Align
              </label>
              <select
                value={styles?.textAlign || 'left'}
                onChange={(e) => updateStyle('textAlign', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
                <option value="justify">Justify</option>
              </select>
            </div>
            {block.type === 'text' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Line Height
                </label>
                <Input
                  type="text"
                  value={styles?.lineHeight || ''}
                  onChange={(e) => updateStyle('lineHeight', e.target.value)}
                  placeholder="e.g., 1.6, 24px"
                  className="w-full"
                />
              </div>
            )}
          </>
        )}

        {/* Spacing */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Spacing</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Margin Top</label>
              <Input
                type="text"
                value={styles?.marginTop || ''}
                onChange={(e) => updateStyle('marginTop', e.target.value)}
                placeholder="0"
                className="w-full text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Margin Bottom</label>
              <Input
                type="text"
                value={styles?.marginBottom || ''}
                onChange={(e) => updateStyle('marginBottom', e.target.value)}
                placeholder="0"
                className="w-full text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Margin Left</label>
              <Input
                type="text"
                value={styles?.marginLeft || ''}
                onChange={(e) => updateStyle('marginLeft', e.target.value)}
                placeholder="0"
                className="w-full text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Margin Right</label>
              <Input
                type="text"
                value={styles?.marginRight || ''}
                onChange={(e) => updateStyle('marginRight', e.target.value)}
                placeholder="0"
                className="w-full text-sm"
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Padding</label>
            <Input
              type="text"
              value={styles?.padding || ''}
              onChange={(e) => updateStyle('padding', e.target.value)}
              placeholder="e.g., 1rem, 16px"
              className="w-full text-sm"
            />
          </div>
        </div>

        {/* Image specific */}
        {block.type === 'image' && (
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Image Settings</h4>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Border Radius
              </label>
              <Input
                type="text"
                value={styles?.borderRadius || ''}
                onChange={(e) => updateStyle('borderRadius', e.target.value)}
                placeholder="e.g., 0.5rem, 8px"
                className="w-full"
              />
            </div>
            <div className="mt-3">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Width
              </label>
              <Input
                type="text"
                value={styles?.width || ''}
                onChange={(e) => updateStyle('width', e.target.value)}
                placeholder="e.g., 100%, 500px"
                className="w-full"
              />
            </div>
          </div>
        )}

        {/* Divider specific */}
        {block.type === 'divider' && (
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Divider Settings</h4>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Border Color
              </label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={styles?.borderColor?.replace(/[^#0-9A-F]/gi, '') || '#cbd5e1'}
                  onChange={(e) => updateStyle('borderColor', e.target.value)}
                  className="w-16 h-10"
                />
                <Input
                  type="text"
                  value={styles?.borderColor || ''}
                  onChange={(e) => updateStyle('borderColor', e.target.value)}
                  placeholder="#cbd5e1"
                  className="flex-1"
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Border Width
              </label>
              <Input
                type="text"
                value={styles?.borderWidth || ''}
                onChange={(e) => updateStyle('borderWidth', e.target.value)}
                placeholder="e.g., 1px, 2px"
                className="w-full"
              />
            </div>
          </div>
        )}

        {/* Quote specific */}
        {block.type === 'quote' && (
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Quote Settings</h4>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Border Color
              </label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={styles?.borderColor?.replace(/[^#0-9A-F]/gi, '') || '#8b5cf6'}
                  onChange={(e) => updateStyle('borderColor', e.target.value)}
                  className="w-16 h-10"
                />
                <Input
                  type="text"
                  value={styles?.borderColor || ''}
                  onChange={(e) => updateStyle('borderColor', e.target.value)}
                  placeholder="#8b5cf6"
                  className="flex-1"
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Padding Left
              </label>
              <Input
                type="text"
                value={styles?.paddingLeft || ''}
                onChange={(e) => updateStyle('paddingLeft', e.target.value)}
                placeholder="e.g., 1rem, 16px"
                className="w-full"
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-80 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 dark:text-white">Block Settings</h3>
        <button
          type="button"
          onClick={onClose}
          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700">
        <button
          type="button"
          onClick={() => setActiveTab('content')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'content'
              ? 'text-violet-600 dark:text-violet-400 border-b-2 border-violet-600 dark:border-violet-400'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Type className="w-4 h-4 inline mr-2" />
          Content
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('style')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'style'
              ? 'text-violet-600 dark:text-violet-400 border-b-2 border-violet-600 dark:border-violet-400'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Palette className="w-4 h-4 inline mr-2" />
          Style
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'content' ? renderContentSettings() : renderStyleSettings()}
      </div>
    </div>
  );
}

