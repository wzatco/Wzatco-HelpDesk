import { useState, useRef, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/admin/universal/AdminLayout';
import { User, Mail, Phone, MapPin, FileText, Package, Tag, AlertCircle, Upload, X, Search as SearchIcon, CheckCircle, XCircle } from 'lucide-react';
import StyledSelect from '../../../components/ui/StyledSelect';

import { withAuth } from '../../../lib/withAuth';
export default function NewTicketPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    subject: '',
    message: '',
    productId: '',
    accessoryId: '',
    category: '',
    categoryOther: '',
    priority: 'low',
    invoice: ''
  });
  const [products, setProducts] = useState([]);
  const [accessories, setAccessories] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [issueCategories, setIssueCategories] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [invoiceAttachment, setInvoiceAttachment] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: null, message: '' });
  const [existingTicketsPopup, setExistingTicketsPopup] = useState(null);
  const [captcha, setCaptcha] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaError, setCaptchaError] = useState('');
  const [fileUploadSettings, setFileUploadSettings] = useState({
    maxUploadSize: 10,
    allowedFileTypes: [],
    ticketFileUpload: true
  });
  const [ticketSettings, setTicketSettings] = useState({
    hidePriorityCustomer: false
  });
  const [captchaSettings, setCaptchaSettings] = useState({
    enabledPlacements: {
      customerTicket: false
    }
  });

  const fileInputRef = useRef(null);
  const invoiceInputRef = useRef(null);
  const customerSearchTimeoutRef = useRef(null);
  const searchInputRef = useRef(null);

  // Fetch file upload and ticket settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const [fileUploadRes, ticketRes, captchaRes] = await Promise.all([
          fetch('/api/admin/settings/file-upload'),
          fetch('/api/admin/settings/ticket'),
          fetch('/api/admin/settings/captcha')
        ]);

        const fileUploadData = await fileUploadRes.json();
        const ticketData = await ticketRes.json();
        const captchaData = await captchaRes.json();

        if (fileUploadData.success) {
          setFileUploadSettings({
            maxUploadSize: parseInt(fileUploadData.settings.maxUploadSize || '10', 10),
            allowedFileTypes: fileUploadData.settings.allowedFileTypes || [],
            ticketFileUpload: fileUploadData.settings.ticketFileUpload !== false
          });
        }

        if (ticketData.success) {
          setTicketSettings({
            hidePriorityCustomer: ticketData.settings.hidePriorityCustomer || false
          });
        }

        if (captchaData.success) {
          setCaptchaSettings(captchaData.settings);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    };

    fetchSettings();
  }, []);

  // Fetch products and accessories on mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/admin/products?includeInactive=false');
        const data = await res.json();
        if (res.ok) {
          setProducts(data.products || []);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    };

    const fetchAccessories = async () => {
      try {
        const res = await fetch('/api/admin/accessories?includeInactive=false');
        const data = await res.json();
        if (res.ok) {
          setAccessories(data.accessories || []);
        }
      } catch (error) {
        console.error('Error fetching accessories:', error);
      }
    };

    fetchProducts();
    fetchAccessories();
    fetchTemplates();
    fetchIssueCategories();
  }, []);

  // Fetch captcha only if enabled
  useEffect(() => {
    if (captchaSettings.enabledPlacements?.customerTicket) {
      fetchCaptcha();
    }
  }, [captchaSettings.enabledPlacements?.customerTicket]);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/admin/ticket-templates?activeOnly=true');
      const data = await res.json();
      if (res.ok) {
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchCaptcha = async () => {
    try {
      const res = await fetch('/api/admin/captcha/generate');
      const data = await res.json();
      if (data.success && data.captcha) {
        setCaptcha(data.captcha);
        setCaptchaError(''); // Clear any previous errors
      } else {
        console.error('Failed to generate captcha:', data);
        setStatus({ type: 'error', message: 'Failed to load captcha. Please refresh the page.' });
      }
    } catch (error) {
      console.error('Error fetching captcha:', error);
      setStatus({ type: 'error', message: 'Failed to load captcha. Please refresh the page.' });
    }
  };

  const fetchIssueCategories = async () => {
    try {
      const res = await fetch('/api/admin/issue-categories?activeOnly=true');
      const data = await res.json();
      if (res.ok && data.success) {
        setIssueCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Error fetching issue categories:', error);
    }
  };

  const refreshCaptcha = () => {
    fetchCaptcha();
    setCaptchaInput('');
    setCaptchaError('');
  };

  // Filter accessories based on selected product
  const filteredAccessories = formData.productId
    ? accessories.filter(acc => acc.productId === formData.productId)
    : [];

  // Filter templates based on selected product
  const filteredTemplates = templates.filter(template => {
    if (!template.isActive) return false;
    if (formData.productId && template.productId) {
      return template.productId === formData.productId;
    }
    return true; // Show all templates if no product selected, or template has no product filter
  });

  // Handle template selection
  const handleTemplateSelect = async (templateId) => {
    // Handle both event object and direct value
    const id = typeof templateId === 'string' ? templateId : (templateId?.target?.value || '');
    if (!id) {
      setSelectedTemplateId('');
      return;
    }

    const template = templates.find(t => t.id === id);
    if (!template) return;

    // Populate form with template data
    setFormData(prev => ({
      ...prev,
      subject: template.subject || prev.subject,
      message: template.message || prev.message,
      category: template.category || prev.category,
      priority: template.priority || prev.priority,
      productId: template.productId || prev.productId,
      departmentId: template.departmentId || prev.departmentId
    }));

    setSelectedTemplateId(id);

    // Increment usage count
    try {
      await fetch(`/api/admin/ticket-templates/${id}/use`, {
        method: 'POST'
      });
    } catch (error) {
      console.error('Error tracking template usage:', error);
    }
  };

  // Customer search with debouncing - only search after user stops typing for 800ms
  useEffect(() => {
    // Clear any existing timeout
    if (customerSearchTimeoutRef.current) {
      clearTimeout(customerSearchTimeoutRef.current);
    }

    // If search is too short, clear results
    if (customerSearch.trim().length < 2) {
      setCustomerResults([]);
      return;
    }

    // Set debounce - wait 800ms after user stops typing before searching
    customerSearchTimeoutRef.current = setTimeout(async () => {
      try {
        const searchTerm = customerSearch.trim();
        if (searchTerm.length < 2) {
          setCustomerResults([]);
          return;
        }

        const res = await fetch(`/api/admin/customers/search?q=${encodeURIComponent(searchTerm)}`);

        // Check if response is JSON
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.error('Non-JSON response received:', contentType);
          setCustomerResults([]);
          return;
        }

        const data = await res.json();
        if (res.ok) {
          setCustomerResults(data.customers || []);
        } else {
          console.error('Search API error:', data.message || 'Unknown error');
          setCustomerResults([]);
        }
      } catch (error) {
        console.error('Error searching customers:', error);
        setCustomerResults([]);
      }
    }, 800); // Wait 800ms after user stops typing

    // Cleanup function
    return () => {
      if (customerSearchTimeoutRef.current) {
        clearTimeout(customerSearchTimeoutRef.current);
      }
    };
  }, [customerSearch]);

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setFormData(prev => ({
      ...prev,
      name: customer.name,
      email: customer.email,
      phone: customer.phone || '',
      address: customer.location || ''
    }));
    setCustomerSearch('');
    setCustomerResults([]);
    setShowCustomerSearch(false);
  };

  const handleRemoveCustomer = () => {
    setSelectedCustomer(null);
    setFormData(prev => ({
      ...prev,
      name: '',
      email: '',
      phone: '',
      address: ''
    }));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    const maxSizeBytes = fileUploadSettings.maxUploadSize * 1024 * 1024;
    const allowedTypes = fileUploadSettings.allowedFileTypes;

    files.forEach(file => {
      // Check file size
      if (file.size > maxSizeBytes) {
        setStatus({ type: 'error', message: `File ${file.name} is too large. Max size is ${fileUploadSettings.maxUploadSize}MB.` });
        return;
      }

      // Check file type if allowed types are configured
      if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
        setStatus({ type: 'error', message: `File ${file.name} type (${file.type}) is not allowed.` });
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result;
        setAttachments(prev => [...prev, {
          id: Date.now() + Math.random(),
          filename: file.name,
          mimeType: file.type,
          size: file.size,
          base64
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleInvoiceChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSizeBytes = fileUploadSettings.maxUploadSize * 1024 * 1024;
    const allowedTypes = fileUploadSettings.allowedFileTypes;

    if (file.size > maxSizeBytes) {
      setStatus({ type: 'error', message: `Invoice file is too large. Max size is ${fileUploadSettings.maxUploadSize}MB.` });
      return;
    }

    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      setStatus({ type: 'error', message: `Invoice file type (${file.type}) is not allowed.` });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result;
      setInvoiceAttachment({
        filename: file.name,
        mimeType: file.type,
        size: file.size,
        base64
      });
    };
    reader.readAsDataURL(file);
  };

  const removeInvoice = () => {
    setInvoiceAttachment(null);
    if (invoiceInputRef.current) {
      invoiceInputRef.current.value = '';
    }
  };

  const removeAttachment = (id) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setStatus({ type: null, message: '' });

    // Validate mandatory fields - Product is required
    if (!formData.productId || formData.productId.trim() === '') {
      setStatus({ type: 'error', message: 'Product is required' });
      setSubmitting(false);
      return;
    }

    // Accessory is optional - no validation needed

    if (!formData.category || formData.category.trim() === '') {
      setStatus({ type: 'error', message: 'Issue Category is required' });
      setSubmitting(false);
      return;
    }

    // If "Other" is selected, validate the custom input
    if (formData.category === 'Other' && (!formData.categoryOther || formData.categoryOther.trim() === '')) {
      setStatus({ type: 'error', message: 'Please specify the category name' });
      setSubmitting(false);
      return;
    }

    if (!invoiceAttachment) {
      setStatus({ type: 'error', message: 'Invoice attachment is required' });
      setSubmitting(false);
      return;
    }

    // Validate captcha only if enabled
    if (captchaSettings.enabledPlacements?.customerTicket) {
      if (!captcha || !captcha.trim()) {
        setStatus({ type: 'error', message: 'Captcha not loaded. Please refresh the page.' });
        setSubmitting(false);
        return;
      }

      if (!captchaInput || !captchaInput.trim()) {
        setCaptchaError('Please enter the captcha code');
        setSubmitting(false);
        return;
      }

      if (captchaInput.trim().toUpperCase() !== captcha.toUpperCase()) {
        setCaptchaError('Invalid captcha code. Please try again.');
        setCaptchaInput('');
        refreshCaptcha();
        setSubmitting(false);
        return;
      }
    }

    try {
      const allAttachments = [
        // Invoice attachment first (mandatory)
        {
          filename: invoiceAttachment.filename,
          mimeType: invoiceAttachment.mimeType,
          base64: invoiceAttachment.base64
        },
        // Other attachments
        ...attachments.map(a => ({
          filename: a.filename,
          mimeType: a.mimeType,
          base64: a.base64
        }))
      ];

      // Use custom value if "Other" is selected for category
      const finalCategory = formData.category === 'Other' ? formData.categoryOther : formData.category;

      const payload = {
        ...formData,
        category: finalCategory,
        customerId: selectedCustomer?.id,
        attachments: allAttachments,
        invoice: invoiceAttachment.filename, // Store invoice filename
        // Use productId and accessoryId (accessoryId is optional)
        productId: formData.productId,
        accessoryId: formData.accessoryId || null
      };

      let res;
      try {
        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

        res = await fetch('/api/admin/tickets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
      } catch (fetchError) {
        console.error('Network error:', fetchError);
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timeout: The file upload is taking too long. Please try with smaller files or check your connection.');
        }
        throw new Error('Network error: Unable to connect to server. Please check your internet connection and try again.');
      }

      // Check if response is JSON
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        console.error('Non-JSON response received:', contentType, text.substring(0, 200));
        throw new Error('Server returned an invalid response. Please try again.');
      }

      const data = await res.json();

      if (res.status === 409) {
        // Customer has existing open tickets
        setExistingTicketsPopup(data.existingTickets);
        return;
      }

      if (!res.ok) {
        throw new Error(data.message || 'Failed to create ticket');
      }

      setStatus({ type: 'success', message: 'Ticket created successfully!' });
      setTimeout(() => {
        router.push(`/admin/tickets/${data.ticket.ticketNumber || data.ticket.id}`);
      }, 1500);
    } catch (error) {
      let errorMessage = 'Failed to create ticket. Please try again.';
      if (error.message) {
        errorMessage = error.message;
      } else if (error.name === 'SyntaxError' && error.message.includes('JSON')) {
        errorMessage = 'Server returned an invalid response. Please check your connection and try again.';
      }
      setStatus({ type: 'error', message: errorMessage });
      console.error('Ticket creation error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleContinueWithExistingTickets = async () => {
    // User chose to continue despite existing tickets
    setExistingTicketsPopup(null);
    // Submit again but without customerId to create new customer
    setSubmitting(true);

    // Validate mandatory fields - Product is required
    if (!formData.productId || formData.productId.trim() === '') {
      setStatus({ type: 'error', message: 'Product is required' });
      setSubmitting(false);
      return;
    }

    // Accessory is optional - no validation needed

    if (!formData.category || formData.category.trim() === '') {
      setStatus({ type: 'error', message: 'Issue Category is required' });
      setSubmitting(false);
      return;
    }

    if (formData.category === 'Other' && (!formData.categoryOther || formData.categoryOther.trim() === '')) {
      setStatus({ type: 'error', message: 'Please specify the category name' });
      setSubmitting(false);
      return;
    }

    if (!invoiceAttachment) {
      setStatus({ type: 'error', message: 'Invoice attachment is required' });
      setSubmitting(false);
      return;
    }

    // Validate captcha only if enabled
    if (captchaSettings.enabledPlacements?.customerTicket) {
      if (!captcha || !captcha.trim()) {
        setStatus({ type: 'error', message: 'Captcha not loaded. Please refresh the page.' });
        setSubmitting(false);
        return;
      }

      if (!captchaInput || !captchaInput.trim()) {
        setCaptchaError('Please enter the captcha code');
        setSubmitting(false);
        return;
      }

      if (captchaInput.trim().toUpperCase() !== captcha.toUpperCase()) {
        setCaptchaError('Invalid captcha code. Please try again.');
        setCaptchaInput('');
        refreshCaptcha();
        setSubmitting(false);
        return;
      }
    }

    try {
      // Use custom value if "Other" is selected for category
      const finalCategory = formData.category === 'Other' ? formData.categoryOther : formData.category;

      const allAttachments = [
        // Invoice attachment first (mandatory)
        {
          filename: invoiceAttachment.filename,
          mimeType: invoiceAttachment.mimeType,
          base64: invoiceAttachment.base64
        },
        // Other attachments
        ...attachments.map(a => ({
          filename: a.filename,
          mimeType: a.mimeType,
          base64: a.base64
        }))
      ];

      const payload = {
        ...formData,
        category: finalCategory,
        attachments: allAttachments,
        invoice: invoiceAttachment.filename,
        // Use productId and accessoryId (accessoryId is optional)
        productId: formData.productId,
        accessoryId: formData.accessoryId || null
      };

      let res;
      try {
        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

        res = await fetch('/api/admin/tickets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
      } catch (fetchError) {
        console.error('Network error:', fetchError);
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timeout: The file upload is taking too long. Please try with smaller files or check your connection.');
        }
        throw new Error('Network error: Unable to connect to server. Please check your internet connection and try again.');
      }

      // Check if response is JSON
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        console.error('Non-JSON response received:', contentType, text.substring(0, 200));
        throw new Error('Server returned an invalid response. Please try again.');
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to create ticket');
      }

      setStatus({ type: 'success', message: 'Ticket created successfully!' });
      setTimeout(() => {
        router.push(`/admin/tickets/${data.ticket.ticketNumber || data.ticket.id}`);
      }, 1500);
    } catch (error) {
      let errorMessage = 'Failed to create ticket. Please try again.';
      if (error.message) {
        errorMessage = error.message;
      } else if (error.name === 'SyntaxError' && error.message.includes('JSON')) {
        errorMessage = 'Server returned an invalid response. Please check your connection and try again.';
      }
      setStatus({ type: 'error', message: errorMessage });
      console.error('Ticket creation error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>New Ticket - Admin</title>
      </Head>
      <AdminLayout currentPage="Tickets">
        <div className="p-2 sm:p-4">
          <div className="w-full">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Create New Ticket</h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">Fill in the details below to create a new support ticket</p>
            </div>

            {/* Status Message */}
            {status.type && (
              <div className={`flex items-center gap-3 p-4 rounded-2xl border mb-6 ${status.type === 'success'
                  ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300'
                  : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
                }`}>
                {status.type === 'success' ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <XCircle className="w-5 h-5" />
                )}
                <span>{status.message}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Customer Selection */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm p-4">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <User className="w-5 h-5 text-violet-600" />
                  Customer Information
                </h2>

                {selectedCustomer ? (
                  <div className="p-4 rounded-xl bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{selectedCustomer.name}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{selectedCustomer.email}</p>
                        {selectedCustomer.openTicketsCount > 0 && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                            {selectedCustomer.openTicketsCount} open ticket(s)
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveCustomer}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Search Existing Customer (Optional)
                    </label>
                    <div className="relative">
                      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        onFocus={() => setShowCustomerSearch(true)}
                        placeholder="Search by name, email, or phone..."
                        className="w-full pl-9 pr-4 h-9 text-sm rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      />
                    </div>
                    {showCustomerSearch && (
                      <div className="absolute z-10 w-full mt-2 bg-white dark:bg-slate-800 border border-violet-200 dark:border-slate-700 rounded-xl shadow-lg max-h-60 overflow-auto">
                        {customerResults.length > 0 ? (
                          customerResults.map(customer => (
                            <button
                              key={customer.id}
                              type="button"
                              onClick={() => handleSelectCustomer(customer)}
                              className="w-full px-4 py-3 text-left hover:bg-violet-50 dark:hover:bg-slate-700 transition-colors border-b border-violet-100 dark:border-slate-700 last:border-0"
                            >
                              <p className="font-medium text-slate-900 dark:text-white">{customer.name}</p>
                              <p className="text-sm text-slate-600 dark:text-slate-400">{customer.email}</p>
                              {customer.openTicketsCount > 0 && (
                                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                  ⚠️ {customer.openTicketsCount} open ticket(s)
                                </p>
                              )}
                            </button>
                          ))
                        ) : (
                          customerSearch.trim().length >= 2 && (
                            <div className="px-4 py-6 text-center">
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                Customer not found
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                                A new customer will be created when you submit the ticket
                              </p>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Customer Details Form */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm p-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-violet-600" />
                  Customer Details
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full h-11 px-4 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      placeholder="Customer name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full h-11 px-4 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      placeholder="customer@email.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full h-11 px-4 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Address
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      className="w-full h-11 px-4 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      placeholder="Street address, city, state, zip"
                    />
                  </div>
                </div>
              </div>

              {/* Ticket Information */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm p-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-violet-600" />
                  Ticket Information
                </h2>

                <div className="space-y-4">
                  {/* Template Selector */}
                  {filteredTemplates.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Use Template (Optional)
                      </label>
                      <StyledSelect
                        value={selectedTemplateId}
                        onChange={(value) => handleTemplateSelect(value)}
                        placeholder="Select a template..."
                        options={[
                          { value: '', name: 'Select a template...' },
                          ...filteredTemplates.map((template) => ({
                            value: template.id,
                            name: `${template.name}${template.category ? ` (${template.category})` : ''}`
                          }))
                        ]}
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Select a template to pre-fill the ticket subject and message
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Subject *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.subject}
                      onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                      className="w-full h-11 px-4 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      placeholder="Brief description of the issue"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Message *
                    </label>
                    <textarea
                      required
                      rows={6}
                      value={formData.message}
                      onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                      placeholder="Detailed description of the issue..."
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Product *
                      </label>
                      <StyledSelect
                        required={true}
                        value={formData.productId}
                        onChange={(e) => setFormData(prev => ({ ...prev, productId: e.target.value, accessoryId: '' }))}
                        placeholder="Select Product"
                        options={[
                          { value: '', name: 'Select Product' },
                          ...products.map(product => ({ value: product.id, name: product.name }))
                        ]}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Accessory (Optional)
                      </label>
                      <StyledSelect
                        value={formData.accessoryId}
                        onChange={(e) => setFormData(prev => ({ ...prev, accessoryId: e.target.value }))}
                        disabled={!formData.productId}
                        placeholder="Select Accessory (Optional)"
                        options={[
                          { value: '', name: 'Select Accessory (Optional)' },
                          ...filteredAccessories.map(accessory => ({ value: accessory.id, name: accessory.name }))
                        ]}
                      />
                      {!formData.productId && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Please select a product first</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                        <Tag className="w-4 h-4" />
                        Issue Category *
                      </label>
                      <StyledSelect
                        required={true}
                        value={formData.category}
                        onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                        placeholder="Select Category"
                        options={
                          issueCategories.length > 0
                            ? issueCategories.map((cat) => ({ value: cat.name, name: cat.name }))
                            : [
                                { value: 'WZATCO', name: 'WZATCO' },
                                { value: 'Technical', name: 'Technical' },
                                { value: 'Billing', name: 'Billing' },
                                { value: 'General', name: 'General' },
                                { value: 'Other', name: 'Other' }
                              ]
                        }
                      />
                    </div>
                    {!ticketSettings.hidePriorityCustomer && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          Priority
                        </label>
                        <StyledSelect
                          value={formData.priority}
                          onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                          placeholder="Select Priority"
                          options={[
                            { value: 'low', name: 'Low' },
                            { value: 'medium', name: 'Medium' },
                            { value: 'high', name: 'High' },
                            { value: 'urgent', name: 'Urgent' }
                          ]}
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Invoice Attachment *
                      </label>
                      <input
                        ref={invoiceInputRef}
                        type="file"
                        required
                        onChange={handleInvoiceChange}
                        accept="image/*,.pdf"
                        className="hidden"
                      />
                      {invoiceAttachment ? (
                        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-violet-200 dark:border-slate-700">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-violet-600" />
                            <div>
                              <p className="text-sm font-medium text-slate-900 dark:text-white">{invoiceAttachment.filename}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {(invoiceAttachment.size / 1024).toFixed(2)} KB
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={removeInvoice}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => invoiceInputRef.current?.click()}
                          className="w-full h-11 px-4 rounded-xl border-2 border-dashed border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-950/20 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-950/30 transition-colors flex items-center justify-center gap-2 font-medium"
                        >
                          <Upload className="w-4 h-4" />
                          Upload Invoice Copy
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional File Attachments */}
              {fileUploadSettings.ticketFileUpload && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Upload className="w-5 h-5 text-violet-600" />
                    Additional File Attachments (Optional)
                  </h2>

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-11 px-4 rounded-xl border border-violet-200 dark:border-slate-700 bg-violet-50 dark:bg-violet-950/20 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-950/30 transition-colors flex items-center justify-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Upload Files
                  </button>

                  {attachments.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {attachments.map(attachment => (
                        <div key={attachment.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-violet-600" />
                            <div>
                              <p className="text-sm font-medium text-slate-900 dark:text-white">{attachment.filename}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {(attachment.size / 1024).toFixed(2)} KB
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAttachment(attachment.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Captcha - Only show if enabled */}
              {captchaSettings.enabledPlacements?.customerTicket && (
              <div className={`bg-white dark:bg-slate-800 rounded-2xl border shadow-sm p-6 ${captchaError
                  ? 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-950/20'
                  : 'border-violet-200 dark:border-slate-700'
                }`}>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                  Security Verification * <span className="text-red-500">(Required)</span>
                </label>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-32 h-12 bg-gradient-to-r from-violet-100 to-purple-100 dark:from-slate-700 dark:to-slate-600 rounded-lg flex items-center justify-center border-2 border-violet-300 dark:border-slate-500">
                        <span className="text-2xl font-bold text-violet-700 dark:text-violet-300 tracking-wider select-none">
                          {captcha || '...'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={refreshCaptcha}
                        className="px-4 py-2 text-sm text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 font-medium"
                        title="Refresh captcha"
                      >
                        ↻ Refresh
                      </button>
                    </div>
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={captchaInput}
                      onChange={(e) => {
                        setCaptchaInput(e.target.value);
                        setCaptchaError('');
                      }}
                      onBlur={() => {
                        // Validate on blur if captcha is entered
                        if (captchaInput && captcha && captchaInput.trim().toUpperCase() !== captcha.toUpperCase()) {
                          setCaptchaError('Invalid captcha code');
                        }
                      }}
                      placeholder="Enter the code above"
                      className={`w-full h-12 px-4 rounded-lg border ${captchaError
                          ? 'border-red-300 dark:border-red-700 focus:ring-red-500'
                          : 'border-slate-300 dark:border-slate-600 focus:ring-violet-500'
                        } bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2`}
                      required
                      autoComplete="off"
                    />
                    {captchaError && (
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1 font-medium">{captchaError}</p>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Please enter the code shown above to verify you're not a robot. The code is case-insensitive.
                </p>
                {captchaError && (
                  <div className="mt-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <p className="text-sm text-red-700 dark:text-red-300 font-medium flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {captchaError}
                    </p>
                  </div>
                )}
              </div>
              )}

              {/* Submit Button */}
              <div className="flex items-center justify-end gap-4">
                <button
                  type="button"
                  onClick={() => router.push('/admin/tickets')}
                  className="h-12 px-6 rounded-xl border border-violet-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-12 px-8 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                >
                  {submitting ? 'Creating...' : 'Create Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Existing Tickets Popup */}
        {existingTicketsPopup && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-xl max-w-2xl w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="w-6 h-6 text-amber-600" />
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Customer Has Existing Open Tickets
                </h3>
              </div>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                This customer already has {existingTicketsPopup.length} open ticket(s). Do you want to continue creating a new ticket?
              </p>

              <div className="space-y-2 mb-6 max-h-60 overflow-auto">
                {existingTicketsPopup.map(ticket => (
                  <div key={ticket.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{ticket.subject}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {new Date(ticket.createdAt).toLocaleDateString()} - {ticket.status}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => router.push(`/admin/tickets/${ticket.ticketNumber || ticket.id}`)}
                        className="text-violet-600 hover:text-violet-700 text-sm font-medium"
                      >
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setExistingTicketsPopup(null)}
                  className="h-11 px-6 rounded-xl border border-violet-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleContinueWithExistingTickets}
                  className="h-11 px-6 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium hover:shadow-lg transition-all"
                >
                  Continue Creating New Ticket
                </button>
              </div>
            </div>
          </div>
        )}
      </AdminLayout>
    </>
  );
}

export const getServerSideProps = withAuth();


