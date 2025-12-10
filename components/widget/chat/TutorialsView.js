// Tutorials View for Widget
'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, ArrowLeft, BookOpen, Video, FileText, Youtube, ExternalLink, Package, Loader2, ChevronDown, Check } from 'lucide-react';

export default function TutorialsView({ userInfo, onBack }) {
  const [products, setProducts] = useState([]);
  const [tutorials, setTutorials] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedTutorialType, setSelectedTutorialType] = useState('');
  const [selectedTutorial, setSelectedTutorial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingTutorial, setLoadingTutorial] = useState(false);
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const [isTutorialTypeDropdownOpen, setIsTutorialTypeDropdownOpen] = useState(false);
  const productDropdownRef = useRef(null);
  const tutorialTypeDropdownRef = useRef(null);

  useEffect(() => {
    fetchTutorials();
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (productDropdownRef.current && !productDropdownRef.current.contains(event.target)) {
        setIsProductDropdownOpen(false);
      }
      if (tutorialTypeDropdownRef.current && !tutorialTypeDropdownRef.current.contains(event.target)) {
        setIsTutorialTypeDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    // Extract products from tutorials
    if (tutorials && tutorials.length > 0) {
      const uniqueProducts = tutorials
        .map(t => t.product)
        .filter((product, index, self) => 
          product && index === self.findIndex(p => p && p.id === product.id)
        );
      setProducts(uniqueProducts);
    }
  }, [tutorials]);

  useEffect(() => {
    if (selectedProductId) {
      const tutorial = tutorials.find(t => t.productId === selectedProductId);
      setSelectedTutorial(tutorial);
      
      // Reset tutorial type when product changes
      setSelectedTutorialType('');
    } else {
      setSelectedTutorial(null);
      setSelectedTutorialType('');
    }
  }, [selectedProductId, tutorials]);

  const fetchTutorials = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/widget/tutorials');
      const data = await response.json();
      if (data.success) {
        setTutorials(data.tutorials || []);
      }
    } catch (error) {
      console.error('Error fetching tutorials:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTutorialOptions = () => {
    if (!selectedTutorial) return [];
    
    const options = [];
    if (selectedTutorial.manualLink) {
      options.push({ 
        type: 'manual', 
        label: 'Manual (PDF/Document)', 
        link: selectedTutorial.manualLink,
        icon: FileText
      });
    }
    if (selectedTutorial.demoVideoLink) {
      options.push({ 
        type: 'demoVideo', 
        label: 'Demo Video', 
        link: selectedTutorial.demoVideoLink,
        icon: Youtube
      });
    }
    if (selectedTutorial.cleaningVideoLink) {
      options.push({ 
        type: 'cleaningVideo', 
        label: 'Cleaning Video', 
        link: selectedTutorial.cleaningVideoLink,
        icon: Video
      });
    }
    
    return options;
  };

  const getSelectedOption = () => {
    const options = getTutorialOptions();
    return options.find(opt => opt.type === selectedTutorialType);
  };

  const isYoutubeLink = (url) => {
    return url && (url.includes('youtube.com') || url.includes('youtu.be'));
  };

  const isGoogleDriveLink = (url) => {
    return url && url.includes('drive.google.com');
  };

  const getYoutubeEmbedUrl = (url) => {
    if (!url) return '';
    // Extract video ID from various YouTube URL formats
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    const videoId = (match && match[2].length === 11) ? match[2] : null;
    return videoId ? `https://www.youtube.com/embed/${videoId}` : '';
  };

  const getGoogleDriveEmbedUrl = (url) => {
    if (!url) return '';
    // Convert Google Drive share link to embed format
    if (url.includes('/file/d/')) {
      const fileId = url.split('/file/d/')[1]?.split('/')[0];
      return fileId ? `https://drive.google.com/file/d/${fileId}/preview` : '';
    }
    return url;
  };

  const handleOpenInNewTab = () => {
    const option = getSelectedOption();
    if (option && option.link) {
      window.open(option.link, '_blank');
    }
  };

  const tutorialOptions = getTutorialOptions();
  const selectedOption = getSelectedOption();
  const selectedProduct = products.find(p => p.id === selectedProductId);

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 animate-slide-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-700 via-pink-600 to-red-600 text-white px-4 py-3 flex items-center space-x-3">
        <button
          onClick={onBack}
          className="p-1 hover:bg-white/20 rounded transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center space-x-2 flex-1">
          <BookOpen className="w-4 h-4" />
          <h2 className="text-sm font-semibold">Tutorials & Guides</h2>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white dark:bg-gray-900">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-purple-600 dark:text-pink-500" />
          </div>
        ) : (
          <>
            {/* Product Selection */}
            <div className="relative" ref={productDropdownRef}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Product
              </label>
              <button
                type="button"
                onClick={() => setIsProductDropdownOpen(!isProductDropdownOpen)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-pink-500 flex items-center justify-between transition-all hover:border-purple-400 dark:hover:border-pink-500"
              >
                <span className={selectedProductId ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}>
                  {selectedProduct ? selectedProduct.name : 'Select a product...'}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform ${isProductDropdownOpen ? 'transform rotate-180' : ''}`} />
              </button>
              
              {isProductDropdownOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProductId('');
                      setIsProductDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                      !selectedProductId 
                        ? 'bg-purple-50 dark:bg-pink-900/20 text-purple-600 dark:text-pink-400' 
                        : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    <span>Select a product...</span>
                    {!selectedProductId && <Check className="w-4 h-4" />}
                  </button>
                  {products.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => {
                        setSelectedProductId(product.id);
                        setIsProductDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-t border-gray-100 dark:border-gray-700 ${
                        selectedProductId === product.id
                          ? 'bg-purple-50 dark:bg-pink-900/20 text-purple-600 dark:text-pink-400 font-medium'
                          : 'text-gray-900 dark:text-white'
                      }`}
                    >
                      <span>{product.name}</span>
                      {selectedProductId === product.id && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Tutorial Type Selection - Only show if product is selected */}
            {selectedProductId && tutorialOptions.length > 0 && (
              <div className="relative" ref={tutorialTypeDropdownRef}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  What would you like to view?
                </label>
                <button
                  type="button"
                  onClick={() => setIsTutorialTypeDropdownOpen(!isTutorialTypeDropdownOpen)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-pink-500 flex items-center justify-between transition-all hover:border-purple-400 dark:hover:border-pink-500"
                >
                  <span className="flex items-center">
                    {selectedTutorialType ? (
                      <>
                        {(() => {
                          const selectedOpt = tutorialOptions.find(opt => opt.type === selectedTutorialType);
                          const Icon = selectedOpt?.icon;
                          return Icon ? <Icon className="w-4 h-4 mr-2 text-purple-600 dark:text-pink-400" /> : null;
                        })()}
                        <span className="text-gray-900 dark:text-white">
                          {tutorialOptions.find(opt => opt.type === selectedTutorialType)?.label || 'Select tutorial type...'}
                        </span>
                      </>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">Select tutorial type...</span>
                    )}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform ${isTutorialTypeDropdownOpen ? 'transform rotate-180' : ''}`} />
                </button>
                
                {isTutorialTypeDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTutorialType('');
                        setIsTutorialTypeDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                        !selectedTutorialType 
                          ? 'bg-purple-50 dark:bg-pink-900/20 text-purple-600 dark:text-pink-400' 
                          : 'text-gray-900 dark:text-white'
                      }`}
                    >
                      <span>Select tutorial type...</span>
                      {!selectedTutorialType && <Check className="w-4 h-4" />}
                    </button>
                    {tutorialOptions.map((option) => {
                      const Icon = option.icon;
                      return (
                        <button
                          key={option.type}
                          type="button"
                          onClick={() => {
                            setSelectedTutorialType(option.type);
                            setIsTutorialTypeDropdownOpen(false);
                          }}
                          className={`w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-t border-gray-100 dark:border-gray-700 ${
                            selectedTutorialType === option.type
                              ? 'bg-purple-50 dark:bg-pink-900/20 text-purple-600 dark:text-pink-400 font-medium'
                              : 'text-gray-900 dark:text-white'
                          }`}
                        >
                          <span className="flex items-center">
                            <Icon className="w-4 h-4 mr-2 text-purple-600 dark:text-pink-400" />
                            {option.label}
                          </span>
                          {selectedTutorialType === option.type && <Check className="w-4 h-4" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Preview Section */}
            {selectedOption && selectedOption.link && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center">
                    {(() => {
                      const Icon = selectedOption.icon;
                      return <Icon className="w-4 h-4 mr-2 text-purple-600 dark:text-pink-400" />;
                    })()}
                    {selectedOption.label}
                  </h3>
                  <button
                    onClick={handleOpenInNewTab}
                    className="flex items-center text-sm text-purple-600 dark:text-pink-400 hover:text-purple-700 dark:hover:text-pink-300 transition-colors"
                  >
                    Open in New Tab
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </button>
                </div>

                {/* Video Preview */}
                {(isYoutubeLink(selectedOption.link) || isGoogleDriveLink(selectedOption.link)) && (
                  <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                    <iframe
                      src={
                        isYoutubeLink(selectedOption.link)
                          ? getYoutubeEmbedUrl(selectedOption.link)
                          : getGoogleDriveEmbedUrl(selectedOption.link)
                      }
                      className="absolute top-0 left-0 w-full h-full rounded-lg"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title={selectedOption.label}
                    />
                  </div>
                )}

                {/* PDF/Document Preview */}
                {!isYoutubeLink(selectedOption.link) && !isGoogleDriveLink(selectedOption.link) && (
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                    <div className="flex items-center justify-center h-64">
                      <div className="text-center">
                        <FileText className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Document Preview</p>
                        <button
                          onClick={handleOpenInNewTab}
                          className="px-4 py-2 bg-purple-600 dark:bg-pink-600 text-white rounded-lg hover:bg-purple-700 dark:hover:bg-pink-700 transition-colors text-sm"
                        >
                          Open Document
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Direct Link Button */}
                <button
                  onClick={handleOpenInNewTab}
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all flex items-center justify-center space-x-2"
                >
                  <Play className="w-4 h-4" />
                  <span>View Full Screen</span>
                </button>
              </div>
            )}

            {/* Empty State */}
            {selectedProductId && tutorialOptions.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400 dark:text-gray-500">
                <BookOpen className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm">No tutorials available for this product</p>
              </div>
            )}

            {!selectedProductId && (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400 dark:text-gray-500">
                <Package className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm">Select a product to view tutorials</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
