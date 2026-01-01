import { useState, useEffect, useRef } from 'react';
import { X, CheckCircle, Upload, File, AlertCircle, Loader2 } from 'lucide-react';
import { createPortal } from 'react-dom';

export default function TicketCreationFlow({ 
  isOpen, 
  onClose, 
  onTicketCreated,
  userInfo,
  products = [],
  accessories = [],
  issueTypes = []
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [ticketData, setTicketData] = useState({
    subject: '',
    priority: 'medium',
    name: userInfo?.name || '',
    email: userInfo?.email || '',
    phone: '',
    altPhone: '',
    address: '',
    orderNumber: '',
    purchasedFrom: '',
    ticketBody: '',
    projectorImages: [],
    invoice: null,
    additionalDocuments: [],
    issueVideoLink: '',
    issueType: '',
    productId: '',
    accessoryId: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [createdTicket, setCreatedTicket] = useState(null);
  const fileInputRef = useRef(null);
  const docInputRef = useRef(null);
  const projectorImagesInputRef = useRef(null);

  // Steps for ticket creation
  const steps = [
    { field: 'subject', label: 'Ticket Subject', required: true, type: 'text' },
    { field: 'priority', label: 'Priority', required: true, type: 'select', options: ['low', 'medium', 'high'] },
    { field: 'name', label: 'Your Name', required: true, type: 'text' },
    { field: 'email', label: 'Email Address', required: true, type: 'email' },
    { field: 'phone', label: 'Phone Number', required: true, type: 'tel' },
    { field: 'altPhone', label: 'Alternative Phone Number', required: false, type: 'tel' },
    { field: 'address', label: 'Address', required: true, type: 'textarea' },
    { field: 'orderNumber', label: 'Order Number', required: false, type: 'text' },
    { field: 'purchasedFrom', label: 'Purchased From', required: true, type: 'select', options: ['Official Site', 'Amazon', 'Flipkart', 'Other'] },
    { field: 'ticketBody', label: 'Issue Description', required: true, type: 'textarea' },
    { field: 'projectorImages', label: 'Upload Projector Images (4 sides)', required: true, type: 'projector-images', count: 4, description: 'Upload 4 clear images showing Front, Back, Left, and Right sides of your projector' },
    { field: 'invoice', label: 'Invoice', required: false, type: 'file', accept: 'image/*,application/pdf' },
    { field: 'additionalDocuments', label: 'Additional Documents (Max 5 files, 5MB each)', required: false, type: 'files', maxFiles: 5 },
    { field: 'issueVideoLink', label: 'Issue Video Link (Google Drive)', required: false, type: 'url' },
    { field: 'issueType', label: 'Issue Type', required: true, type: 'select', options: issueTypes.length > 0 ? issueTypes : ['Technical', 'Billing', 'Warranty', 'Other'] },
    { field: 'productId', label: 'Product', required: true, type: 'select', options: products },
    { field: 'accessoryId', label: 'Accessory', required: false, type: 'select', options: accessories }
  ];

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setTicketData({
        subject: '',
        priority: 'medium',
        name: userInfo?.name || '',
        email: userInfo?.email || '',
        phone: '',
        altPhone: '',
        address: '',
        orderNumber: '',
        purchasedFrom: '',
        ticketBody: '',
        invoice: null,
        additionalDocuments: [],
        issueVideoLink: '',
        issueType: '',
        productId: '',
        accessoryId: ''
      });
      setError(null);
      setCreatedTicket(null);
    }
  }, [isOpen, userInfo]);

  const handleInputChange = (field, value) => {
    setTicketData(prev => ({
      ...prev,
      [field]: value
    }));
    setError(null);
  };

  const handleFileChange = (field, files) => {
    if (field === 'invoice') {
      const file = files[0];
      if (file && file.size <= 5 * 1024 * 1024) {
        setTicketData(prev => ({
          ...prev,
          invoice: file
        }));
      } else {
        setError('Invoice file size must be less than 5MB');
      }
    } else if (field === 'additionalDocuments') {
      const fileArray = Array.from(files).slice(0, 5);
      const validFiles = fileArray.filter(file => file.size <= 5 * 1024 * 1024);
      if (validFiles.length !== fileArray.length) {
        setError('Some files exceed 5MB limit. Only files under 5MB will be uploaded.');
      }
      setTicketData(prev => ({
        ...prev,
        additionalDocuments: validFiles
      }));
    } else if (field === 'projectorImages') {
      const fileArray = Array.from(files);
      
      // Check if trying to upload more than 4
      const currentCount = ticketData.projectorImages.length;
      const remainingSlots = 4 - currentCount;
      const filesToAdd = fileArray.slice(0, remainingSlots);
      
      // Validate file size and type
      const validFiles = filesToAdd.filter(file => {
        if (!file.type.startsWith('image/')) {
          setError('Only image files are allowed for projector images');
          return false;
        }
        if (file.size > 5 * 1024 * 1024) {
          setError('Image file size must be less than 5MB');
          return false;
        }
        return true;
      });
      
      setTicketData(prev => ({
        ...prev,
        projectorImages: [...prev.projectorImages, ...validFiles]
      }));
      
      setError(null);
    }
  };

  const handleRemoveProjectorImage = (index) => {
    setTicketData(prev => ({
      ...prev,
      projectorImages: prev.projectorImages.filter((_, i) => i !== index)
    }));
  };

  const handleNext = () => {
    const currentField = steps[currentStep];
    
    // Special validation for projectorImages
    if (currentField.field === 'projectorImages' && currentField.required) {
      if (ticketData.projectorImages.length !== 4) {
        setError('Please upload exactly 4 images (one for each side of the projector)');
        return;
      }
    } else if (currentField.required && !ticketData[currentField.field]) {
      setError(`${currentField.label} is required`);
      return;
    }
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
      setError(null);
    } else {
      handleSubmit();
    }
  };

  const handleSkip = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
      setError(null);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      
      // Add all fields to FormData
      Object.keys(ticketData).forEach(key => {
        if (key === 'invoice' && ticketData.invoice) {
          formData.append('invoice', ticketData.invoice);
        } else if (key === 'additionalDocuments' && ticketData.additionalDocuments.length > 0) {
          ticketData.additionalDocuments.forEach((file, index) => {
            formData.append('additionalDocuments', file);
          });
        } else if (key === 'projectorImages' && ticketData.projectorImages.length > 0) {
          ticketData.projectorImages.forEach((file, index) => {
            formData.append('projectorImages', file);
          });
        } else if (ticketData[key] !== null && ticketData[key] !== '' && !Array.isArray(ticketData[key])) {
          formData.append(key, ticketData[key]);
        }
      });

      const response = await fetch('/api/widget/tickets/create', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        setCreatedTicket(data.ticket);
        if (onTicketCreated) {
          onTicketCreated(data.ticket);
        }
      } else {
        setError(data.message || 'Failed to create ticket');
      }
    } catch (err) {
      console.error('Error creating ticket:', err);
      setError('An error occurred while creating the ticket. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderInput = (step) => {
    const field = steps[step];
    const value = ticketData[field.field];

    switch (field.type) {
      case 'text':
      case 'email':
      case 'tel':
      case 'url':
        return (
          <input
            type={field.type}
            value={value || ''}
            onChange={(e) => handleInputChange(field.field, e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            placeholder={`Enter ${field.label.toLowerCase()}`}
            autoFocus
          />
        );
      
      case 'textarea':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => handleInputChange(field.field, e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
            rows={4}
            placeholder={`Enter ${field.label.toLowerCase()}`}
            autoFocus
          />
        );
      
      case 'select':
        if (field.field === 'productId' || field.field === 'accessoryId') {
          const options = field.field === 'productId' ? products : accessories;
          return (
            <select
              value={value || ''}
              onChange={(e) => handleInputChange(field.field, e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              autoFocus
            >
              <option value="">Select {field.label}</option>
              {options.map(option => (
                <option key={option.id || option} value={option.id || option}>
                  {option.name || option}
                </option>
              ))}
            </select>
          );
        }
        return (
          <select
            value={value || ''}
            onChange={(e) => handleInputChange(field.field, e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            autoFocus
          >
            <option value="">Select {field.label}</option>
            {field.options.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );
      
      case 'file':
        return (
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept={field.accept}
              onChange={(e) => handleFileChange(field.field, e.target.files)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-4 py-3 rounded-lg border-2 border-dashed border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-2"
            >
              <Upload className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <span className="text-gray-700 dark:text-gray-300">
                {ticketData.invoice ? ticketData.invoice.name : 'Upload Invoice'}
              </span>
            </button>
            {ticketData.invoice && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <File className="w-4 h-4" />
                <span>{ticketData.invoice.name}</span>
                <button
                  type="button"
                  onClick={() => handleInputChange('invoice', null)}
                  className="ml-auto text-red-500 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        );
      
      case 'files':
        return (
          <div className="space-y-3">
            <input
              ref={docInputRef}
              type="file"
              multiple
              onChange={(e) => handleFileChange(field.field, e.target.files)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => docInputRef.current?.click()}
              className="w-full px-4 py-3 rounded-lg border-2 border-dashed border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-2"
            >
              <Upload className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <span className="text-gray-700 dark:text-gray-300">
                Upload Documents (Max 5 files, 5MB each)
              </span>
            </button>
            {ticketData.additionalDocuments.length > 0 && (
              <div className="space-y-2">
                {ticketData.additionalDocuments.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-700 px-3 py-2 rounded">
                    <File className="w-4 h-4" />
                    <span className="flex-1">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const newDocs = ticketData.additionalDocuments.filter((_, i) => i !== index);
                        handleInputChange('additionalDocuments', newDocs);
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      
      case 'projector-images':
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {field.description}
            </p>
            
            {/* Image preview grid */}
            {ticketData.projectorImages.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {ticketData.projectorImages.map((file, index) => {
                  const sideName = ['Front', 'Back', 'Left', 'Right'][index] || `Side ${index + 1}`;
                  return (
                    <div key={index} className="relative group">
                      <img 
                        src={URL.createObjectURL(file)} 
                        alt={sideName}
                        className="w-full h-40 object-cover rounded-lg border-2 border-violet-300 dark:border-violet-600"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveProjectorImage(index)}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                        {sideName}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Upload button */}
            <input
              ref={projectorImagesInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFileChange(field.field, e.target.files)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => projectorImagesInputRef.current?.click()}
              disabled={ticketData.projectorImages.length >= 4}
              className="w-full px-4 py-3 rounded-lg border-2 border-dashed border-violet-300 dark:border-violet-600 bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              <span className="text-violet-700 dark:text-violet-300 font-medium">
                {ticketData.projectorImages.length === 0 
                  ? 'Upload 4 Images' 
                  : `Upload More (${ticketData.projectorImages.length}/4)`
                }
              </span>
            </button>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {ticketData.projectorImages.length} of 4 images uploaded
              </span>
              {ticketData.projectorImages.length === 4 && (
                <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  Complete
                </span>
              )}
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  const currentField = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-700">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {createdTicket ? 'Ticket Created Successfully!' : 'Creating Your Ticket'}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {createdTicket 
                  ? `Ticket #${createdTicket.ticketNumber} has been created`
                  : currentStep === 0 
                    ? 'I am creating a ticket for you. Please answer the following questions and provide the correct information until I show "Your Ticket is Created".'
                    : `Step ${currentStep + 1} of ${steps.length}: ${currentField.label}`
                }
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            </button>
          </div>
          
          {/* Progress Bar */}
          {!createdTicket && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                <div 
                  className="bg-violet-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {createdTicket ? (
            // Success View
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h4 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Ticket Created Successfully!
              </h4>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Your ticket has been submitted. Our team will get back to you soon.
              </p>
              <div className="bg-violet-50 dark:bg-violet-900/20 rounded-lg p-4 mb-6">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Ticket Number</p>
                <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">
                  {createdTicket.ticketNumber}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                  Subject: {createdTicket.subject}
                </p>
              </div>
              <button
                onClick={() => {
                  if (onTicketCreated) {
                    onTicketCreated(createdTicket);
                  }
                  onClose();
                }}
                className="w-full px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-colors"
              >
                View Ticket
              </button>
            </div>
          ) : (
            // Form View
            <div className="space-y-4">
              {currentStep === 0 && (
                <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>I am creating a ticket for you.</strong> Please answer the following questions and provide the correct information until I show "Your Ticket is Created".
                  </p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {currentField.label}
                  {currentField.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {renderInput(currentStep)}
                {error && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                    <AlertCircle className="w-4 h-4" />
                    <span>{error}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!createdTicket && (
          <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
            <button
              onClick={handleBack}
              disabled={currentStep === 0}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Back
            </button>
            <div className="flex gap-3">
              {!currentField.required && (
                <button
                  onClick={handleSkip}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  Skip
                </button>
              )}
              <button
                onClick={handleNext}
                disabled={isSubmitting}
                className="px-6 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : currentStep === steps.length - 1 ? (
                  'Create Ticket'
                ) : (
                  'Next'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

