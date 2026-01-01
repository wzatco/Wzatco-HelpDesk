'use client';

import { useState, useRef } from 'react';
import { Image as ImageIcon, Upload, Loader2 } from 'lucide-react';

export default function ImageBlock({ block, isSelected, onSelect, onUpdate }) {
  const { data, styles } = block;
  const { url = '', alt = '', caption = '' } = data;
  const [imageError, setImageError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleUrlChange = (e) => {
    onUpdate({
      data: { ...data, url: e.target.value },
    });
    setImageError(false);
  };

  const handleAltChange = (e) => {
    onUpdate({
      data: { ...data, alt: e.target.value },
    });
  };

  const handleCaptionChange = (e) => {
    onUpdate({
      data: { ...data, caption: e.target.value },
    });
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image size must be less than 10MB');
      return;
    }

    setUploading(true);
    try {
      // Convert file to base64
      const reader = new FileReader();
      const base64 = await new Promise((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Upload to server
      const response = await fetch('/api/admin/upload-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          base64,
          filename: file.name,
          mimeType: file.type,
        }),
      });

      const result = await response.json();

      if (response.ok && result.url) {
        onUpdate({
          data: { ...data, url: result.url },
        });
        setImageError(false);
      } else {
        alert(result.message || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('An error occurred while uploading the image');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div
      className={`p-4 rounded-lg border-2 ${
        isSelected
          ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
          : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600'
      } transition-all`}
      onClick={onSelect}
    >
      {isSelected ? (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={url}
              onChange={handleUrlChange}
              placeholder="Image URL"
              className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              id={`image-upload-${block.id}`}
            />
            <label
              htmlFor={`image-upload-${block.id}`}
              className={`px-4 py-2 border border-violet-300 dark:border-violet-600 rounded-lg bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/30 cursor-pointer transition-colors flex items-center gap-2 ${
                uploading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-xs">Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span className="text-xs">Upload</span>
                </>
              )}
            </label>
          </div>
          <input
            type="text"
            value={alt}
            onChange={handleAltChange}
            placeholder="Alt text"
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          />
          {url && (
            <div className="relative">
              <img
                src={url}
                alt={alt}
                onError={() => setImageError(true)}
                className={`w-full rounded-lg ${styles?.borderRadius ? `rounded-${styles.borderRadius}` : ''}`}
                style={{
                  width: styles?.width || '100%',
                  borderRadius: styles?.borderRadius || '0.5rem',
                }}
              />
              {imageError && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <div className="text-center">
                    <ImageIcon className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">Failed to load image</p>
                  </div>
                </div>
              )}
            </div>
          )}
          {!url && (
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8 text-center">
              <ImageIcon className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                Enter image URL or upload an image
              </p>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id={`image-upload-placeholder-${block.id}`}
              />
              <label
                htmlFor={`image-upload-placeholder-${block.id}`}
                className={`inline-flex items-center gap-2 px-4 py-2 border border-violet-300 dark:border-violet-600 rounded-lg bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/30 cursor-pointer transition-colors ${
                  uploading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span className="text-sm">Select Image from Device</span>
                  </>
                )}
              </label>
            </div>
          )}
          <input
            type="text"
            value={caption}
            onChange={handleCaptionChange}
            placeholder="Caption (optional)"
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm italic"
          />
        </div>
      ) : (
        <div>
          {url && !imageError ? (
            <img
              src={url}
              alt={alt}
              onError={() => setImageError(true)}
              className="w-full rounded-lg"
              style={{
                width: styles?.width || '100%',
                borderRadius: styles?.borderRadius || '0.5rem',
              }}
            />
          ) : (
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8 text-center">
              <ImageIcon className="w-12 h-12 text-slate-400 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Image Block</p>
            </div>
          )}
          {caption && (
            <p className="text-sm text-slate-500 italic mt-2 text-center">{caption}</p>
          )}
        </div>
      )}
    </div>
  );
}

