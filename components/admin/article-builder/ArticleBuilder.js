'use client';

import { useState, useRef, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Settings, Trash2, Eye, Code } from 'lucide-react';
import HeadingBlock from './blocks/HeadingBlock';
import TextBlock from './blocks/TextBlock';
import ImageBlock from './blocks/ImageBlock';
import ListBlock from './blocks/ListBlock';
import QuoteBlock from './blocks/QuoteBlock';
import DividerBlock from './blocks/DividerBlock';
import ButtonBlock from './blocks/ButtonBlock';
import BlockSettingsPanel from './BlockSettingsPanel';
import { Button } from '../../ui/button';

const BLOCK_TYPES = {
  heading: { name: 'Heading', icon: 'H', component: HeadingBlock },
  text: { name: 'Text', icon: 'T', component: TextBlock },
  image: { name: 'Image', icon: 'Img', component: ImageBlock },
  list: { name: 'List', icon: 'List', component: ListBlock },
  quote: { name: 'Quote', icon: '"', component: QuoteBlock },
  divider: { name: 'Divider', icon: '—', component: DividerBlock },
  button: { name: 'Button', icon: 'Btn', component: ButtonBlock },
};

export default function ArticleBuilder({ initialBlocks = [], onBlocksChange, onSave }) {
  const [blocks, setBlocks] = useState(initialBlocks.length > 0 ? initialBlocks : []);
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const addMenuRef = useRef(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (onBlocksChange) {
      onBlocksChange(blocks);
    }
  }, [blocks, onBlocksChange]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (addMenuRef.current && !addMenuRef.current.contains(event.target)) {
        setShowAddMenu(false);
      }
    };

    if (showAddMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showAddMenu]);

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setBlocks((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const addBlock = (type) => {
    const newBlock = {
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      data: getDefaultBlockData(type),
      styles: getDefaultBlockStyles(type),
    };
    setBlocks([...blocks, newBlock]);
    setSelectedBlockId(newBlock.id);
    setShowAddMenu(false);
  };

  const updateBlock = (blockId, updates) => {
    setBlocks((prevBlocks) =>
      prevBlocks.map((block) =>
        block.id === blockId ? { ...block, ...updates } : block
      )
    );
  };

  const deleteBlock = (blockId) => {
    setBlocks((prevBlocks) => prevBlocks.filter((block) => block.id !== blockId));
    if (selectedBlockId === blockId) {
      setSelectedBlockId(null);
    }
  };

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId);

  const renderBlock = (block) => {
    const BlockComponent = BLOCK_TYPES[block.type]?.component;
    if (!BlockComponent) return null;

    return (
      <BlockComponent
        key={block.id}
        block={block}
        isSelected={selectedBlockId === block.id}
        onSelect={() => setSelectedBlockId(block.id)}
        onUpdate={(updates) => updateBlock(block.id, updates)}
        onDelete={() => deleteBlock(block.id)}
      />
    );
  };

  return (
    <div className="flex h-full bg-slate-50 dark:bg-slate-900">
      {/* Main Builder Area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative" ref={addMenuRef}>
              <Button
                type="button"
                onClick={() => setShowAddMenu(!showAddMenu)}
                className="bg-violet-600 hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-500 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Block
              </Button>
              {showAddMenu && (
                <div 
                  className="absolute top-full left-0 mt-2 bg-white dark:bg-slate-800 border-2 border-violet-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 min-w-[200px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-2">
                    {Object.entries(BLOCK_TYPES).map(([type, config]) => (
                      <div
                        key={type}
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          addBlock(type);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            addBlock(type);
                          }
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors flex items-center gap-3 text-slate-700 dark:text-slate-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500"
                      >
                        <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 dark:text-violet-400 font-semibold text-sm">
                          {config.icon}
                        </div>
                        <span className="font-medium">{config.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <Button
              type="button"
              onClick={() => setPreviewMode(!previewMode)}
              variant="outline"
              className="border-slate-300 dark:border-slate-600"
            >
              {previewMode ? (
                <>
                  <Code className="w-4 h-4 mr-2" />
                  Edit Mode
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </>
              )}
            </Button>
          </div>
          {onSave && (
            <Button
              type="button"
              onClick={() => onSave(blocks)}
              className="bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-500 text-white"
            >
              Save Article
            </Button>
          )}
        </div>

        {/* Builder Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {previewMode ? (
            <div className="max-w-4xl mx-auto bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg p-8">
              {blocks.length === 0 ? (
                <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                  No blocks added yet. Click "Add Block" to get started.
                </div>
              ) : (
                blocks.map((block) => (
                  <div key={block.id} className="mb-4 last:mb-0">
                    {renderBlock(block)}
                  </div>
                ))
              )}
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={blocks.map((b) => b.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="max-w-4xl mx-auto space-y-4">
                  {blocks.length === 0 ? (
                    <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700">
                      <p className="text-slate-400 dark:text-slate-500 mb-4">
                        No blocks added yet
                      </p>
                      <Button
                        type="button"
                        onClick={() => setShowAddMenu(true)}
                        className="bg-violet-600 hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-500 text-white"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Your First Block
                      </Button>
                    </div>
                  ) : (
                    blocks.map((block) => (
                      <SortableBlockWrapper
                        key={block.id}
                        block={block}
                        isSelected={selectedBlockId === block.id}
                        onSelect={() => setSelectedBlockId(block.id)}
                        onDelete={() => deleteBlock(block.id)}
                      >
                        {renderBlock(block)}
                      </SortableBlockWrapper>
                    ))
                  )}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      {/* Settings Panel */}
      {selectedBlock && !previewMode && (
        <BlockSettingsPanel
          block={selectedBlock}
          onUpdate={(updates) => updateBlock(selectedBlock.id, updates)}
          onClose={() => setSelectedBlockId(null)}
        />
      )}
    </div>
  );
}

// Helper functions
function getDefaultBlockData(type) {
  switch (type) {
    case 'heading':
      return { text: 'Heading', level: 1 };
    case 'text':
      return { content: 'Enter your text here...' };
    case 'image':
      return { url: '', alt: '', caption: '' };
    case 'list':
      return { items: ['Item 1', 'Item 2', 'Item 3'], ordered: false };
    case 'quote':
      return { text: 'Quote text', author: '' };
    case 'divider':
      return {};
    case 'button':
      return { text: 'Click Me', url: '#', style: 'primary' };
    default:
      return {};
  }
}

function getDefaultBlockStyles(type) {
  const baseStyles = {
    marginTop: '0',
    marginBottom: '0',
    padding: '0',
    textAlign: 'left',
  };

  switch (type) {
    case 'heading':
      return { ...baseStyles, fontSize: '2rem', fontWeight: 'bold', color: '#1e293b' };
    case 'text':
      return { ...baseStyles, fontSize: '1rem', lineHeight: '1.6', color: '#475569' };
    case 'image':
      return { ...baseStyles, width: '100%', borderRadius: '0' };
    default:
      return baseStyles;
  }
}

// Sortable Block Wrapper Component
function SortableBlockWrapper({ block, isSelected, onSelect, onDelete, children }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${isSelected ? 'ring-2 ring-violet-500' : ''}`}
    >
      <div className="absolute left-0 top-0 -ml-8 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-4 h-4 text-slate-400" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600 dark:text-red-400"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div onClick={onSelect} className="cursor-pointer">
        {children}
      </div>
    </div>
  );
}

