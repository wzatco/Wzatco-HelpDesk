import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/admin/universal/AdminLayout';
import PageHead from '../../../components/admin/PageHead';
import NotificationToast from '../../../components/ui/NotificationToast';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { withAuth } from '../../../lib/withAuth';
import { 
  Package, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  ChevronDown, 
  ChevronRight,
  FileText,
  X,
  Check,
  AlertCircle,
  Upload,
  Download,
  Image as ImageIcon,
  XCircle,
  Ticket,
  ExternalLink,
  Loader2
} from 'lucide-react';

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [accessories, setAccessories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showEditProductModal, setShowEditProductModal] = useState(false);
  const [showDeleteProductModal, setShowDeleteProductModal] = useState(false);
  const [showProductDetailModal, setShowProductDetailModal] = useState(false);
  const [selectedProductForDetail, setSelectedProductForDetail] = useState(null);
  const [showAccessoryDetailModal, setShowAccessoryDetailModal] = useState(false);
  const [selectedAccessoryForDetail, setSelectedAccessoryForDetail] = useState(null);
  const [showAddAccessoryModal, setShowAddAccessoryModal] = useState(false);
  const [showEditAccessoryModal, setShowEditAccessoryModal] = useState(false);
  const [showDeleteAccessoryModal, setShowDeleteAccessoryModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedAccessory, setSelectedAccessory] = useState(null);
  const [expandedProducts, setExpandedProducts] = useState(new Set());
  const [productFormData, setProductFormData] = useState({
    name: '',
    description: '',
    category: '',
    imageUrl: '',
    isActive: true
  });
  const [productImageFile, setProductImageFile] = useState(null);
  const [productImagePreview, setProductImagePreview] = useState(null);
  const [accessoryFormData, setAccessoryFormData] = useState({
    productId: '',
    name: '',
    description: '',
    imageUrl: '',
    specifications: {},
    isActive: true
  });
  const [accessoryImageFile, setAccessoryImageFile] = useState(null);
  const [accessoryImagePreview, setAccessoryImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState({ type: null, message: '' });
  const [isMounted, setIsMounted] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showEditCategoryDropdown, setShowEditCategoryDropdown] = useState(false);
  const [productDocuments, setProductDocuments] = useState([]);
  const [pendingDocuments, setPendingDocuments] = useState([]); // Documents to upload after product creation
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [documentFile, setDocumentFile] = useState(null);
  const [documentName, setDocumentName] = useState('');
  const [documentDescription, setDocumentDescription] = useState('');
  const [showTicketsModal, setShowTicketsModal] = useState(false);
  const [selectedProductForTickets, setSelectedProductForTickets] = useState(null);
  const [productTickets, setProductTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [showAccessoryTicketsModal, setShowAccessoryTicketsModal] = useState(false);
  const [selectedAccessoryForTickets, setSelectedAccessoryForTickets] = useState(null);
  const [accessoryTickets, setAccessoryTickets] = useState([]);
  const [loadingAccessoryTickets, setLoadingAccessoryTickets] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    fetchProducts();
    fetchAccessories();
  }, []);

  // Close category dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.category-dropdown-container')) {
        setShowCategoryDropdown(false);
        setShowEditCategoryDropdown(false);
      }
    };

    if (showCategoryDropdown || showEditCategoryDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showCategoryDropdown, showEditCategoryDropdown]);

  // Reset dropdowns when modals close
  useEffect(() => {
    if (!showAddProductModal) {
      setShowCategoryDropdown(false);
    }
  }, [showAddProductModal]);

  useEffect(() => {
    if (!showEditProductModal) {
      setShowEditCategoryDropdown(false);
    }
  }, [showEditProductModal]);

  // Fetch documents when edit product modal opens
  useEffect(() => {
    if (showEditProductModal && selectedProduct) {
      fetchProductDocuments(selectedProduct.id);
    } else {
      setProductDocuments([]);
    }
  }, [showEditProductModal, selectedProduct]);

  // Reset pending documents when Add Product modal closes
  useEffect(() => {
    if (!showAddProductModal) {
      setPendingDocuments([]);
      setDocumentFile(null);
      setDocumentName('');
      setDocumentDescription('');
      const fileInput = document.querySelector('#addProductDocumentFileInput');
      if (fileInput) fileInput.value = '';
    }
  }, [showAddProductModal]);

  const fetchProductTickets = async (productId) => {
    try {
      setLoadingTickets(true);
      const response = await fetch(`/api/admin/products/${productId}/tickets`);
      const data = await response.json();
      
      if (response.ok && data.success) {
        setProductTickets(data.tickets || []);
        setSelectedProductForTickets(data.product);
      } else {
        showNotification('error', data.message || 'Failed to fetch tickets');
        setProductTickets([]);
      }
    } catch (error) {
      console.error('Error fetching product tickets:', error);
      showNotification('error', 'An error occurred while fetching tickets');
      setProductTickets([]);
    } finally {
      setLoadingTickets(false);
    }
  };

  const fetchAccessoryTickets = async (accessoryId) => {
    try {
      setLoadingAccessoryTickets(true);
      const response = await fetch(`/api/admin/accessories/${accessoryId}/tickets`);
      const data = await response.json();
      
      if (response.ok && data.success) {
        setAccessoryTickets(data.tickets || []);
        setSelectedAccessoryForTickets(data.accessory);
      } else {
        showNotification('error', data.message || 'Failed to fetch tickets');
        setAccessoryTickets([]);
      }
    } catch (error) {
      console.error('Error fetching accessory tickets:', error);
      showNotification('error', 'An error occurred while fetching tickets');
      setAccessoryTickets([]);
    } finally {
      setLoadingAccessoryTickets(false);
    }
  };

  const handleTicketBadgeClick = (e, product) => {
    e.stopPropagation();
    if (product._count?.conversations > 0) {
      setSelectedProductForTickets({ id: product.id, name: product.name });
      setShowTicketsModal(true);
      fetchProductTickets(product.id);
    }
  };

  const handleAccessoryTicketBadgeClick = (e, accessory) => {
    e.stopPropagation();
    if (accessory._count?.conversations > 0) {
      setSelectedAccessoryForTickets({ id: accessory.id, name: accessory.name });
      setShowAccessoryTicketsModal(true);
      fetchAccessoryTickets(accessory.id);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/products');
      const data = await response.json();
      
      if (response.ok) {
        setProducts(data.products || []);
      } else {
        showNotification('error', data.message || 'Failed to fetch products');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      showNotification('error', 'An error occurred while fetching products');
    } finally {
      setLoading(false);
    }
  };

  const fetchAccessories = async () => {
    try {
      const response = await fetch('/api/admin/accessories');
      const data = await response.json();
      
      if (response.ok) {
        setAccessories(data.accessories || []);
      }
    } catch (error) {
      console.error('Error fetching accessories:', error);
    }
  };

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: null, message: '' }), 5000);
  };

  const toggleProductExpanded = (productId) => {
    setExpandedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let imageUrl = productFormData.imageUrl;

      // Upload image if a new file is selected
      if (productImageFile) {
        const reader = new FileReader();
        const base64 = await new Promise((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(productImageFile);
        });

        const uploadResponse = await fetch('/api/admin/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64,
            filename: productImageFile.name,
            mimeType: productImageFile.type,
            type: 'product',
            id: 'temp' // Will be updated after product creation
          })
        });

        const uploadData = await uploadResponse.json();
        if (uploadResponse.ok) {
          imageUrl = uploadData.url;
        } else {
          showNotification('error', uploadData.message || 'Failed to upload image');
          setSubmitting(false);
          return;
        }
      }

      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...productFormData,
          imageUrl
        })
      });

      const data = await response.json();

      if (response.ok) {
        const newProductId = data.product.id;
        
        // Upload pending documents if any
        if (pendingDocuments.length > 0) {
          try {
            for (const doc of pendingDocuments) {
              await fetch('/api/admin/upload-document', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  base64: doc.base64,
                  filename: doc.filename,
                  mimeType: doc.mimeType,
                  productId: newProductId,
                  name: doc.name,
                  description: doc.description || null
                })
              });
            }
          } catch (docError) {
            console.error('Error uploading documents:', docError);
            // Don't fail the entire operation if document upload fails
            showNotification('error', 'Product created but some documents failed to upload');
          }
        }
        
        showNotification('success', 'Product created successfully');
        setShowAddProductModal(false);
        setProductFormData({ name: '', description: '', category: '', imageUrl: '', isActive: true });
        setProductImageFile(null);
        setProductImagePreview(null);
        setPendingDocuments([]);
        setDocumentFile(null);
        setDocumentName('');
        setDocumentDescription('');
        const fileInput = document.querySelector('#addProductDocumentFileInput');
        if (fileInput) fileInput.value = '';
        fetchProducts();
      } else {
        showNotification('error', data.message || 'Failed to create product');
      }
    } catch (error) {
      console.error('Error creating product:', error);
      showNotification('error', 'An error occurred while creating product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditProduct = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let imageUrl = productFormData.imageUrl;

      // Upload image if a new file is selected
      if (productImageFile) {
        const reader = new FileReader();
        const base64 = await new Promise((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(productImageFile);
        });

        const uploadResponse = await fetch('/api/admin/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64,
            filename: productImageFile.name,
            mimeType: productImageFile.type,
            type: 'product',
            id: selectedProduct.id
          })
        });

        const uploadData = await uploadResponse.json();
        if (uploadResponse.ok) {
          imageUrl = uploadData.url;
        } else {
          showNotification('error', uploadData.message || 'Failed to upload image');
          setSubmitting(false);
          return;
        }
      }

      const response = await fetch(`/api/admin/products/${selectedProduct.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...productFormData,
          imageUrl
        })
      });

      const data = await response.json();

      if (response.ok) {
        showNotification('success', 'Product updated successfully');
        setShowEditProductModal(false);
        setSelectedProduct(null);
        setProductFormData({ name: '', description: '', category: '', imageUrl: '', isActive: true });
        setProductImageFile(null);
        setProductImagePreview(null);
        fetchProducts();
      } else {
        showNotification('error', data.message || 'Failed to update product');
      }
    } catch (error) {
      console.error('Error updating product:', error);
      showNotification('error', 'An error occurred while updating product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async () => {
    setSubmitting(true);

    try {
      const response = await fetch(`/api/admin/products/${selectedProduct.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (response.ok) {
        showNotification('success', 'Product deleted successfully');
        setShowDeleteProductModal(false);
        setSelectedProduct(null);
        fetchProducts();
        fetchAccessories();
      } else {
        showNotification('error', data.message || 'Failed to delete product');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      showNotification('error', 'An error occurred while deleting product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddAccessory = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let imageUrl = accessoryFormData.imageUrl;

      // Upload image if a new file is selected
      if (accessoryImageFile) {
        const reader = new FileReader();
        const base64 = await new Promise((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(accessoryImageFile);
        });

        const uploadResponse = await fetch('/api/admin/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64,
            filename: accessoryImageFile.name,
            mimeType: accessoryImageFile.type,
            type: 'accessory',
            id: 'temp' // Will be updated after accessory creation
          })
        });

        const uploadData = await uploadResponse.json();
        if (uploadResponse.ok) {
          imageUrl = uploadData.url;
        } else {
          showNotification('error', uploadData.message || 'Failed to upload image');
          setSubmitting(false);
          return;
        }
      }

      const response = await fetch('/api/admin/accessories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...accessoryFormData,
          imageUrl,
          specifications: Object.keys(accessoryFormData.specifications).length > 0 ? accessoryFormData.specifications : null
        })
      });

      const data = await response.json();

      if (response.ok) {
        showNotification('success', 'Accessory created successfully');
        setShowAddAccessoryModal(false);
        setAccessoryFormData({ productId: '', name: '', description: '', imageUrl: '', specifications: {}, isActive: true });
        setAccessoryImageFile(null);
        setAccessoryImagePreview(null);
        fetchAccessories();
        fetchProducts();
      } else {
        showNotification('error', data.message || 'Failed to create accessory');
      }
    } catch (error) {
      console.error('Error creating accessory:', error);
      showNotification('error', 'An error occurred while creating accessory');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditAccessory = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let imageUrl = accessoryFormData.imageUrl;

      // Upload image if a new file is selected
      if (accessoryImageFile) {
        const reader = new FileReader();
        const base64 = await new Promise((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(accessoryImageFile);
        });

        const uploadResponse = await fetch('/api/admin/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64,
            filename: accessoryImageFile.name,
            mimeType: accessoryImageFile.type,
            type: 'accessory',
            id: selectedAccessory.id
          })
        });

        const uploadData = await uploadResponse.json();
        if (uploadResponse.ok) {
          imageUrl = uploadData.url;
        } else {
          showNotification('error', uploadData.message || 'Failed to upload image');
          setSubmitting(false);
          return;
        }
      }

      const response = await fetch(`/api/admin/accessories/${selectedAccessory.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...accessoryFormData,
          imageUrl,
          specifications: Object.keys(accessoryFormData.specifications).length > 0 ? accessoryFormData.specifications : null
        })
      });

      const data = await response.json();

      if (response.ok) {
        showNotification('success', 'Accessory updated successfully');
        setShowEditAccessoryModal(false);
        setSelectedAccessory(null);
        setAccessoryFormData({ productId: '', name: '', description: '', imageUrl: '', specifications: {}, isActive: true });
        setAccessoryImageFile(null);
        setAccessoryImagePreview(null);
        fetchAccessories();
        fetchProducts();
      } else {
        showNotification('error', data.message || 'Failed to update accessory');
      }
    } catch (error) {
      console.error('Error updating accessory:', error);
      showNotification('error', 'An error occurred while updating accessory');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAccessory = async () => {
    setSubmitting(true);

    try {
      const response = await fetch(`/api/admin/accessories/${selectedAccessory.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (response.ok) {
        showNotification('success', 'Accessory deleted successfully');
        setShowDeleteAccessoryModal(false);
        setSelectedAccessory(null);
        fetchAccessories();
        fetchProducts();
      } else {
        showNotification('error', data.message || 'Failed to delete accessory');
      }
    } catch (error) {
      console.error('Error deleting accessory:', error);
      showNotification('error', 'An error occurred while deleting accessory');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchProductDocuments = async (productId) => {
    try {
      const response = await fetch(`/api/admin/products/${productId}/documents`);
      const data = await response.json();
      if (response.ok) {
        setProductDocuments(data.documents || []);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const handleAddPendingDocument = async () => {
    if (!documentFile || !documentName) {
      showNotification('error', 'Please select a file and enter a name');
      return;
    }

    try {
      // Convert file to base64
      const reader = new FileReader();
      const base64 = await new Promise((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(documentFile);
      });

      // Add to pending documents
      const pendingDoc = {
        base64,
        filename: documentFile.name,
        mimeType: documentFile.type,
        name: documentName,
        description: documentDescription || null,
        fileSize: documentFile.size
      };

      setPendingDocuments([...pendingDocuments, pendingDoc]);
      setDocumentFile(null);
      setDocumentName('');
      setDocumentDescription('');
      // Reset file input
      const fileInput = document.querySelector('#addProductDocumentFileInput');
      if (fileInput) fileInput.value = '';
      showNotification('success', 'Document added. It will be uploaded when you create the product.');
    } catch (error) {
      console.error('Error processing document:', error);
      showNotification('error', 'An error occurred while processing document');
    }
  };

  const handleRemovePendingDocument = (index) => {
    setPendingDocuments(pendingDocuments.filter((_, i) => i !== index));
  };

  const handleUploadDocument = async () => {
    if (!documentFile || !documentName || !selectedProduct) {
      showNotification('error', 'Please select a file and enter a name');
      return;
    }

    setUploadingDocument(true);
    try {
      // Convert file to base64
      const reader = new FileReader();
      const base64 = await new Promise((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(documentFile);
      });

      const response = await fetch('/api/admin/upload-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64,
          filename: documentFile.name,
          mimeType: documentFile.type,
          productId: selectedProduct.id,
          name: documentName,
          description: documentDescription || null
        })
      });

      const data = await response.json();

      if (response.ok) {
        showNotification('success', 'Document uploaded successfully');
        setDocumentFile(null);
        setDocumentName('');
        setDocumentDescription('');
        // Reset file input
        const fileInput = document.querySelector('#documentFileInput');
        if (fileInput) fileInput.value = '';
        fetchProductDocuments(selectedProduct.id);
      } else {
        showNotification('error', data.message || 'Failed to upload document');
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      showNotification('error', 'An error occurred while uploading document');
    } finally {
      setUploadingDocument(false);
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!selectedProduct) return;
    
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/products/${selectedProduct.id}/documents/${docId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (response.ok) {
        showNotification('success', 'Document deleted successfully');
        fetchProductDocuments(selectedProduct.id);
      } else {
        showNotification('error', data.message || 'Failed to delete document');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      showNotification('error', 'An error occurred while deleting document');
    }
  };

  const filteredProducts = products.filter(product => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      product.name.toLowerCase().includes(query) ||
      product.description?.toLowerCase().includes(query) ||
      product.category?.toLowerCase().includes(query) ||
      product.accessories?.some(accessory => 
        accessory.name.toLowerCase().includes(query) ||
        accessory.description?.toLowerCase().includes(query)
      )
    );
  });

  const getAccessoriesForProduct = (productId) => {
    return accessories.filter(accessory => accessory.productId === productId);
  };

  // Get unique categories from existing products
  const getUniqueCategories = () => {
    const categories = products
      .map(product => product.category)
      .filter(category => category && category.trim() !== '')
      .map(category => category.trim());
    return [...new Set(categories)].sort();
  };

  return (
    <>
      <PageHead title="Products & Accessories" />
      <AdminLayout currentPage="Products & Accessories">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <Package className="w-8 h-8 text-violet-600 dark:text-violet-400" />
                Products & Accessories
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">Manage products and their accessories</p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setAccessoryFormData({ productId: '', name: '', description: '', imageUrl: '', specifications: {}, isActive: true });
        setAccessoryImageFile(null);
        setAccessoryImagePreview(null);
                  setShowAddAccessoryModal(true);
                }}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Accessory
              </Button>
              <Button
                onClick={() => {
                  setProductFormData({ name: '', description: '', category: '', isActive: true });
                  setShowAddProductModal(true);
                }}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            </div>
          </div>

          {/* Notification Toast */}
          <NotificationToast 
            notification={notification} 
            onClose={() => setNotification({ type: null, message: '' })} 
          />

          {/* Search */}
          <Card className="border-0 shadow-xl dark:bg-slate-800 bg-white rounded-2xl">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search products or accessories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 border-2 border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>
            </CardContent>
          </Card>

          {/* Products List */}
          {loading ? (
            <Card className="border-0 shadow-xl dark:bg-slate-800 bg-white rounded-2xl">
              <CardContent className="p-12">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
                </div>
              </CardContent>
            </Card>
          ) : filteredProducts.length === 0 ? (
            <Card className="border-0 shadow-xl dark:bg-slate-800 bg-white rounded-2xl">
              <CardContent className="p-12">
                <div className="flex flex-col items-center justify-center text-center">
                  <Package className="w-16 h-16 text-slate-400 dark:text-slate-600 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">No products found</h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-4">Get started by creating your first product</p>
                  <Button
                    onClick={() => {
                      setProductFormData({ name: '', description: '', category: '', isActive: true });
                      setShowAddProductModal(true);
                    }}
                    className="bg-violet-600 hover:bg-violet-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Product
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredProducts.map(product => {
                const productAccessories = getAccessoriesForProduct(product.id);
                const isExpanded = expandedProducts.has(product.id);

                return (
                  <Card 
                    key={product.id} 
                    className="border-0 shadow-xl dark:bg-slate-800 bg-white rounded-2xl overflow-hidden hover:shadow-2xl transition-shadow duration-200 cursor-pointer"
                    onClick={(e) => {
                      // Don't open if clicking on buttons or expand button
                      if (!e.target.closest('button') && !e.target.closest('.no-click')) {
                        setSelectedProductForDetail(product);
                        fetchProductDocuments(product.id);
                        setShowProductDetailModal(true);
                      }
                    }}
                  >
                    <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleProductExpanded(product.id);
                            }}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors flex-shrink-0 no-click"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                            )}
                          </button>
                          {product.imageUrl ? (
                            <img 
                              src={product.imageUrl} 
                              alt={product.name}
                              className="w-20 h-20 rounded-xl object-cover border-2 border-slate-200 dark:border-slate-700 shadow-lg flex-shrink-0"
                              onError={(e) => { 
                                e.target.style.display = 'none';
                                const fallback = e.target.nextElementSibling;
                                if (fallback) fallback.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          {(!product.imageUrl || !product.imageUrl.trim()) && (
                            <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 border-2 border-violet-200 dark:border-violet-700 flex items-center justify-center flex-shrink-0 shadow-lg">
                              <Package className="w-10 h-10 text-violet-600 dark:text-violet-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg font-bold text-slate-900 dark:text-white truncate">
                              {product.name}
                            </CardTitle>
                            {product.category && (
                              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                Category: {product.category}
                              </p>
                            )}
                            {product.description && (
                              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 line-clamp-1">
                                {product.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 no-click">
                          <Badge className={`${product.isActive ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'} text-xs font-semibold px-2.5 py-1`}>
                            {product.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          <Badge className="bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-semibold px-2.5 py-1">
                            {productAccessories.length} {productAccessories.length === 1 ? 'Accessory' : 'Accessories'}
                          </Badge>
                          <Badge 
                            className={`bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold px-2.5 py-1 ${product._count?.conversations > 0 ? 'cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors' : ''}`}
                            onClick={(e) => handleTicketBadgeClick(e, product)}
                          >
                            {product._count?.conversations || 0} {product._count?.conversations === 1 ? 'Ticket' : 'Tickets'}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProduct(product);
                              setProductFormData({
                                name: product.name,
                                description: product.description || '',
                                category: product.category || '',
                                imageUrl: product.imageUrl || '',
                                isActive: product.isActive
                              });
                              // Set preview from existing imageUrl if available
                              if (product.imageUrl) {
                                setProductImagePreview(product.imageUrl);
                              } else {
                                setProductImagePreview(null);
                              }
                              setProductImageFile(null);
                              setShowEditProductModal(true);
                            }}
                            className="h-9 w-9 p-0 hover:bg-slate-100 dark:hover:bg-slate-700"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProduct(product);
                              setShowDeleteProductModal(true);
                            }}
                            className="h-9 w-9 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    {isExpanded && (
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                              Accessories ({productAccessories.length})
                            </h4>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setAccessoryFormData({ 
                                  productId: product.id, 
                                  name: '', 
                                  description: '', 
                                  specifications: {}, 
                                  isActive: true 
                                });
                                setShowAddAccessoryModal(true);
                              }}
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Add Accessory
                            </Button>
                          </div>
                          {productAccessories.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                              <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">No accessories for this product</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {productAccessories.map(accessory => (
                                <Card 
                                  key={accessory.id} 
                                  className="border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-200 hover:border-violet-300 dark:hover:border-violet-600 cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation(); // Prevent bubbling to parent product card
                                    // Don't open if clicking on buttons
                                    if (!e.target.closest('button')) {
                                      setSelectedAccessoryForDetail(accessory);
                                      setShowAccessoryDetailModal(true);
                                    }
                                  }}
                                >
                                  <div className="relative">
                                    {accessory.imageUrl ? (
                                      <div className="w-full aspect-square bg-slate-100 dark:bg-slate-900 overflow-hidden">
                                        <img 
                                          src={accessory.imageUrl} 
                                          alt={accessory.name}
                                          className="w-full h-full object-cover"
                                          onError={(e) => { 
                                            e.target.style.display = 'none';
                                            const fallback = e.target.nextElementSibling;
                                            if (fallback) fallback.style.display = 'flex';
                                          }}
                                        />
                                        <div className="hidden w-full h-full bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 items-center justify-center">
                                          <Package className="w-12 h-12 text-violet-600 dark:text-violet-400" />
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="w-full aspect-square bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 flex items-center justify-center">
                                        <Package className="w-12 h-12 text-violet-600 dark:text-violet-400" />
                                      </div>
                                    )}
                                    <div className="absolute top-2 right-2">
                                      <Badge className={`${accessory.isActive ? 'bg-green-500 dark:bg-green-600' : 'bg-slate-500 dark:bg-slate-600'} text-white text-xs font-semibold px-2 py-0.5 shadow-lg`}>
                                        {accessory.isActive ? 'Active' : 'Inactive'}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div className="p-4">
                                    <div className="mb-3">
                                      <h5 className="font-bold text-slate-900 dark:text-white text-base mb-1 line-clamp-1">
                                        {accessory.name}
                                      </h5>
                                      {accessory.description && (
                                        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                          {accessory.description}
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
                                      <Badge 
                                        className={`bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold px-2 py-1 ${accessory._count?.conversations > 0 ? 'cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors' : ''}`}
                                        onClick={(e) => handleAccessoryTicketBadgeClick(e, accessory)}
                                      >
                                        {accessory._count?.conversations || 0} {accessory._count?.conversations === 1 ? 'Ticket' : 'Tickets'}
                                      </Badge>
                                      <div className="flex gap-1.5">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 w-8 p-0 hover:bg-violet-50 dark:hover:bg-violet-900/20 no-click"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedAccessory(accessory);
                                            setAccessoryFormData({
                                              productId: accessory.productId,
                                              name: accessory.name,
                                              description: accessory.description || '',
                                              imageUrl: accessory.imageUrl || '',
                                              specifications: accessory.specifications || {},
                                              isActive: accessory.isActive
                                            });
                                            // Set preview from existing imageUrl if available
                                            if (accessory.imageUrl) {
                                              setAccessoryImagePreview(accessory.imageUrl);
                                            } else {
                                              setAccessoryImagePreview(null);
                                            }
                                            setAccessoryImageFile(null);
                                            setShowEditAccessoryModal(true);
                                          }}
                                        >
                                          <Edit className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 no-click"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedAccessory(accessory);
                                            setShowDeleteAccessoryModal(true);
                                          }}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          {/* Add Product Modal */}
          {showAddProductModal && isMounted && typeof window !== 'undefined' && typeof document !== 'undefined' && document.body ? createPortal(
            <div 
              className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setShowAddProductModal(false);
                  setProductFormData({ name: '', description: '', category: '', imageUrl: '', isActive: true });
                  setProductImageFile(null);
                  setProductImagePreview(null);
                }
              }}
            >
              <Card 
                className="w-full max-w-md border-0 shadow-2xl dark:bg-slate-800 bg-white rounded-2xl max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <CardHeader className="border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
                      Add Product
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowAddProductModal(false);
                        setProductFormData({ name: '', description: '', category: '', imageUrl: '', isActive: true });
                        setProductImageFile(null);
                        setProductImagePreview(null);
                      }}
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 overflow-y-auto flex-1 hide-scrollbar">
                  <form onSubmit={handleAddProduct} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Product Name *
                      </label>
                      <Input
                        type="text"
                        value={productFormData.name}
                        onChange={(e) => setProductFormData({ ...productFormData, name: e.target.value })}
                        required
                        className="w-full"
                        placeholder="e.g., Yuva Blaze Plus"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Category
                      </label>
                      <div className="relative category-dropdown-container">
                        <div className="flex items-center gap-2">
                          <Input
                            type="text"
                            value={productFormData.category}
                            onChange={(e) => {
                              setProductFormData({ ...productFormData, category: e.target.value });
                              setShowCategoryDropdown(true);
                            }}
                            onFocus={() => setShowCategoryDropdown(true)}
                            className="w-full flex-1"
                            placeholder="Select or type a category"
                          />
                          {getUniqueCategories().length > 0 && (
                            <button
                              type="button"
                              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                              className="p-2 border-2 border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            >
                              <ChevronDown className={`w-4 h-4 text-slate-600 dark:text-slate-400 transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} />
                            </button>
                          )}
                        </div>
                        {showCategoryDropdown && getUniqueCategories().length > 0 && (
                          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-48 overflow-y-auto hide-scrollbar">
                            {getUniqueCategories()
                              .filter(cat => !productFormData.category || cat.toLowerCase().includes(productFormData.category.toLowerCase()))
                              .map((category, index) => (
                                <button
                                  key={index}
                                  type="button"
                                  onClick={() => {
                                    setProductFormData({ ...productFormData, category });
                                    setShowCategoryDropdown(false);
                                  }}
                                  className="w-full text-left px-4 py-2.5 hover:bg-violet-50 dark:hover:bg-violet-900/20 text-slate-700 dark:text-slate-300 transition-colors first:rounded-t-xl last:rounded-b-xl"
                                >
                                  {category}
                                </button>
                              ))}
                            {getUniqueCategories().filter(cat => !productFormData.category || cat.toLowerCase().includes(productFormData.category.toLowerCase())).length === 0 && (
                              <div className="px-4 py-2.5 text-sm text-slate-500 dark:text-slate-400">
                                No matching categories
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {getUniqueCategories().length > 0 && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Select from existing categories or type a new one
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Description
                      </label>
                      <textarea
                        value={productFormData.description}
                        onChange={(e) => setProductFormData({ ...productFormData, description: e.target.value })}
                        className="w-full border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 min-h-[100px] resize-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 dark:bg-slate-900 dark:text-white"
                        placeholder="e.g., High-performance LED projector with 4K resolution, 3000 lumens brightness, and smart connectivity features..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Product Image
                      </label>
                      <div className="space-y-3">
                        {(productImagePreview || productFormData.imageUrl) ? (
                          <div className="relative w-full h-48 rounded-xl border-2 border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-900">
                            <img
                              src={productImagePreview || productFormData.imageUrl}
                              alt="Product preview"
                              className="w-full h-full object-cover"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setProductImageFile(null);
                                setProductImagePreview(null);
                                setProductFormData({ ...productFormData, imageUrl: '' });
                              }}
                              className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-lg z-10"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <ImageIcon className="w-8 h-8 mb-2 text-slate-400" />
                              <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">
                                <span className="font-semibold">Click to upload</span> or drag and drop
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">PNG, JPG, GIF, WebP (MAX. 5MB)</p>
                            </div>
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) {
                                  if (file.size > 5 * 1024 * 1024) {
                                    showNotification('error', 'Image size must be less than 5MB');
                                    return;
                                  }
                                  setProductImageFile(file);
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setProductImagePreview(reader.result);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                      <div className="relative flex items-center">
                        <input
                          type="checkbox"
                          id="productActive"
                          checked={productFormData.isActive}
                          onChange={(e) => setProductFormData({ ...productFormData, isActive: e.target.checked })}
                          className="w-5 h-5 rounded-md border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-violet-600 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 cursor-pointer transition-all duration-200 checked:bg-violet-600 checked:border-violet-600 dark:checked:bg-violet-600 dark:checked:border-violet-600"
                        />
                      </div>
                      <label htmlFor="productActive" className="text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                        Active
                      </label>
                    </div>
                    
                    {/* Documents Section */}
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                        Documents (Optional)
                      </label>
                      
                      {/* Upload Document Form */}
                      <div className="mb-4 p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                              Document Name *
                            </label>
                            <Input
                              type="text"
                              value={documentName}
                              onChange={(e) => setDocumentName(e.target.value)}
                              className="w-full"
                              placeholder="e.g., User Manual"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                              Description (Optional)
                            </label>
                            <Input
                              type="text"
                              value={documentDescription}
                              onChange={(e) => setDocumentDescription(e.target.value)}
                              className="w-full"
                              placeholder="e.g., Complete user guide for setup and operation"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                              File *
                            </label>
                            <label className="flex flex-col items-center justify-center w-full border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors p-4">
                              <div className="flex flex-col items-center justify-center">
                                <Upload className="w-6 h-6 mb-2 text-slate-400" />
                                <p className="mb-1 text-sm text-slate-500 dark:text-slate-400">
                                  <span className="font-semibold">Click to upload</span> or drag and drop
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">PDF, DOC, DOCX, XLS, XLSX, Images, Videos (MAX. 50MB)</p>
                                {documentFile && (
                                  <p className="text-xs text-violet-600 dark:text-violet-400 mt-1 font-medium">
                                    Selected: {documentFile.name}
                                  </p>
                                )}
                              </div>
                              <input
                                id="addProductDocumentFileInput"
                                type="file"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files[0];
                                  if (file) {
                                    if (file.size > 50 * 1024 * 1024) {
                                      showNotification('error', 'File size must be less than 50MB');
                                      return;
                                    }
                                    setDocumentFile(file);
                                    if (!documentName) {
                                      setDocumentName(file.name.replace(/\.[^/.]+$/, ''));
                                    }
                                  }
                                }}
                              />
                            </label>
                          </div>
                          <Button
                            type="button"
                            onClick={handleAddPendingDocument}
                            disabled={!documentFile || !documentName}
                            className="w-full bg-violet-600 hover:bg-violet-700 text-white"
                          >
                            Add Document
                          </Button>
                        </div>
                      </div>

                      {/* Pending Documents List */}
                      <div className="space-y-2 max-h-48 overflow-y-auto hide-scrollbar">
                        {pendingDocuments.length === 0 ? (
                          <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                            No documents added yet. Documents will be uploaded when you create the product.
                          </p>
                        ) : (
                          pendingDocuments.map((doc, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <FileText className="w-5 h-5 text-violet-600 dark:text-violet-400 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">
                                    {doc.name}
                                  </p>
                                  {doc.description && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                      {doc.description}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                      {doc.filename}
                                    </span>
                                    {doc.fileSize && (
                                      <span className="text-xs text-slate-500 dark:text-slate-400">
                                        • {(doc.fileSize / 1024 / 1024).toFixed(2)} MB
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemovePendingDocument(index)}
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-3 pt-4">
                      <Button
                        type="submit"
                        className="flex-1 bg-violet-600 hover:bg-violet-700 text-white"
                        disabled={submitting}
                      >
                        {submitting ? 'Creating...' : 'Create Product'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowAddProductModal(false);
                          setProductFormData({ name: '', description: '', category: '', isActive: true });
                        }}
                        disabled={submitting}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>,
            document.body
          ) : null}

          {/* Edit Product Modal */}
          {showEditProductModal && selectedProduct && isMounted && typeof window !== 'undefined' && typeof document !== 'undefined' && document.body ? createPortal(
            <div 
              className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setShowEditProductModal(false);
                  setSelectedProduct(null);
                  setProductFormData({ name: '', description: '', category: '', imageUrl: '', isActive: true });
                  setProductImageFile(null);
                  setProductImagePreview(null);
                }
              }}
            >
              <Card 
                className="w-full max-w-md border-0 shadow-2xl dark:bg-slate-800 bg-white rounded-2xl max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <CardHeader className="border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
                      Edit Product
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowEditProductModal(false);
                        setSelectedProduct(null);
                        setProductFormData({ name: '', description: '', category: '', imageUrl: '', isActive: true });
                        setProductImageFile(null);
                        setProductImagePreview(null);
                      }}
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 overflow-y-auto flex-1 hide-scrollbar">
                  <form onSubmit={handleEditProduct} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Product Name *
                      </label>
                      <Input
                        type="text"
                        value={productFormData.name}
                        onChange={(e) => setProductFormData({ ...productFormData, name: e.target.value })}
                        required
                        className="w-full"
                        placeholder="e.g., Legend Optimus"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Category
                      </label>
                      <div className="relative category-dropdown-container">
                        <div className="flex items-center gap-2">
                          <Input
                            type="text"
                            value={productFormData.category}
                            onChange={(e) => {
                              setProductFormData({ ...productFormData, category: e.target.value });
                              setShowEditCategoryDropdown(true);
                            }}
                            onFocus={() => setShowEditCategoryDropdown(true)}
                            className="w-full flex-1"
                            placeholder="Select or type a category"
                          />
                          {getUniqueCategories().length > 0 && (
                            <button
                              type="button"
                              onClick={() => setShowEditCategoryDropdown(!showEditCategoryDropdown)}
                              className="p-2 border-2 border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            >
                              <ChevronDown className={`w-4 h-4 text-slate-600 dark:text-slate-400 transition-transform ${showEditCategoryDropdown ? 'rotate-180' : ''}`} />
                            </button>
                          )}
                        </div>
                        {showEditCategoryDropdown && getUniqueCategories().length > 0 && (
                          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-48 overflow-y-auto hide-scrollbar">
                            {getUniqueCategories()
                              .filter(cat => !productFormData.category || cat.toLowerCase().includes(productFormData.category.toLowerCase()))
                              .map((category, index) => (
                                <button
                                  key={index}
                                  type="button"
                                  onClick={() => {
                                    setProductFormData({ ...productFormData, category });
                                    setShowEditCategoryDropdown(false);
                                  }}
                                  className="w-full text-left px-4 py-2.5 hover:bg-violet-50 dark:hover:bg-violet-900/20 text-slate-700 dark:text-slate-300 transition-colors first:rounded-t-xl last:rounded-b-xl"
                                >
                                  {category}
                                </button>
                              ))}
                            {getUniqueCategories().filter(cat => !productFormData.category || cat.toLowerCase().includes(productFormData.category.toLowerCase())).length === 0 && (
                              <div className="px-4 py-2.5 text-sm text-slate-500 dark:text-slate-400">
                                No matching categories
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {getUniqueCategories().length > 0 && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Select from existing categories or type a new one
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Description
                      </label>
                      <textarea
                        value={productFormData.description}
                        onChange={(e) => setProductFormData({ ...productFormData, description: e.target.value })}
                        className="w-full border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 min-h-[100px] resize-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 dark:bg-slate-900 dark:text-white"
                        placeholder="e.g., High-performance LED projector with 4K resolution, 3000 lumens brightness, and smart connectivity features..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Product Image
                      </label>
                      <div className="space-y-3">
                        {(productImagePreview || productFormData.imageUrl) ? (
                          <div className="relative w-full h-48 rounded-xl border-2 border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-900">
                            <img
                              src={productImagePreview || productFormData.imageUrl}
                              alt="Product preview"
                              className="w-full h-full object-cover"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setProductImageFile(null);
                                setProductImagePreview(null);
                                setProductFormData({ ...productFormData, imageUrl: '' });
                              }}
                              className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-lg z-10"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <ImageIcon className="w-8 h-8 mb-2 text-slate-400" />
                              <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">
                                <span className="font-semibold">Click to upload</span> or drag and drop
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">PNG, JPG, GIF, WebP (MAX. 5MB)</p>
                            </div>
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) {
                                  if (file.size > 5 * 1024 * 1024) {
                                    showNotification('error', 'Image size must be less than 5MB');
                                    return;
                                  }
                                  setProductImageFile(file);
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setProductImagePreview(reader.result);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                      <div className="relative flex items-center">
                        <input
                          type="checkbox"
                          id="editProductActive"
                          checked={productFormData.isActive}
                          onChange={(e) => setProductFormData({ ...productFormData, isActive: e.target.checked })}
                          className="w-5 h-5 rounded-md border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-violet-600 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 cursor-pointer transition-all duration-200 checked:bg-violet-600 checked:border-violet-600 dark:checked:bg-violet-600 dark:checked:border-violet-600"
                        />
                      </div>
                      <label htmlFor="editProductActive" className="text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                        Active
                      </label>
                    </div>
                    
                    {/* Documents Section */}
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                        Documents
                      </label>
                      
                      {/* Upload Document Form */}
                      <div className="mb-4 p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                              Document Name *
                            </label>
                            <Input
                              type="text"
                              value={documentName}
                              onChange={(e) => setDocumentName(e.target.value)}
                              className="w-full"
                              placeholder="e.g., User Manual"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                              Description (Optional)
                            </label>
                            <Input
                              type="text"
                              value={documentDescription}
                              onChange={(e) => setDocumentDescription(e.target.value)}
                              className="w-full"
                              placeholder="e.g., Complete user guide for setup and operation"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                              File *
                            </label>
                            <label className="flex flex-col items-center justify-center w-full border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors p-4">
                              <div className="flex flex-col items-center justify-center">
                                <Upload className="w-6 h-6 mb-2 text-slate-400" />
                                <p className="mb-1 text-sm text-slate-500 dark:text-slate-400">
                                  <span className="font-semibold">Click to upload</span> or drag and drop
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">PDF, DOC, DOCX, XLS, XLSX, Images, Videos (MAX. 50MB)</p>
                                {documentFile && (
                                  <p className="text-xs text-violet-600 dark:text-violet-400 mt-1 font-medium">
                                    Selected: {documentFile.name}
                                  </p>
                                )}
                              </div>
                              <input
                                id="documentFileInput"
                                type="file"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files[0];
                                  if (file) {
                                    if (file.size > 50 * 1024 * 1024) {
                                      showNotification('error', 'File size must be less than 50MB');
                                      return;
                                    }
                                    setDocumentFile(file);
                                    if (!documentName) {
                                      setDocumentName(file.name.replace(/\.[^/.]+$/, ''));
                                    }
                                  }
                                }}
                              />
                            </label>
                          </div>
                          <Button
                            type="button"
                            onClick={handleUploadDocument}
                            disabled={uploadingDocument || !documentFile || !documentName}
                            className="w-full bg-violet-600 hover:bg-violet-700 text-white"
                          >
                            {uploadingDocument ? 'Uploading...' : 'Upload Document'}
                          </Button>
                        </div>
                      </div>

                      {/* Documents List */}
                      <div className="space-y-2 max-h-64 overflow-y-auto hide-scrollbar">
                        {productDocuments.length === 0 ? (
                          <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                            No documents uploaded yet
                          </p>
                        ) : (
                          productDocuments.map((doc) => (
                            <div
                              key={doc.id}
                              className="flex items-center justify-between p-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <FileText className="w-5 h-5 text-violet-600 dark:text-violet-400 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">
                                    {doc.name}
                                  </p>
                                  {doc.description && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                      {doc.description}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                      {doc.fileType}
                                    </span>
                                    {doc.fileSize && (
                                      <span className="text-xs text-slate-500 dark:text-slate-400">
                                        • {(doc.fileSize / 1024 / 1024).toFixed(2)} MB
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.open(doc.fileUrl, '_blank')}
                                  className="h-8 w-8 p-0 hover:bg-violet-50 dark:hover:bg-violet-900/20"
                                >
                                  <Download className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteDocument(doc.id)}
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-3 pt-4">
                      <Button
                        type="submit"
                        className="flex-1 bg-violet-600 hover:bg-violet-700 text-white"
                        disabled={submitting}
                      >
                        {submitting ? 'Updating...' : 'Update Product'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowEditProductModal(false);
                          setSelectedProduct(null);
                          setProductFormData({ name: '', description: '', category: '', isActive: true });
                        }}
                        disabled={submitting}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>,
            document.body
          ) : null}

          {/* Delete Product Modal */}
          {showDeleteProductModal && selectedProduct && isMounted && typeof window !== 'undefined' && typeof document !== 'undefined' && document.body ? createPortal(
            <div 
              className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setShowDeleteProductModal(false);
                  setSelectedProduct(null);
                }
              }}
            >
              <Card 
                className="w-full max-w-md border-0 shadow-2xl dark:bg-slate-800 bg-white rounded-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <CardHeader className="border-b border-slate-200 dark:border-slate-700">
                  <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
                    Delete Product
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <p className="text-slate-700 dark:text-slate-300 mb-6">
                    Are you sure you want to delete <strong>{selectedProduct.name}</strong>? 
                    {getAccessoriesForProduct(selectedProduct.id).length > 0 && (
                      <span className="block mt-2 text-red-600 dark:text-red-400">
                        This product has {getAccessoriesForProduct(selectedProduct.id).length} accessory(ies). 
                        You must delete or reassign them first.
                      </span>
                    )}
                  </p>
                  <div className="flex gap-3">
                    <Button
                      onClick={handleDeleteProduct}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                      disabled={submitting || getAccessoriesForProduct(selectedProduct.id).length > 0}
                    >
                      {submitting ? 'Deleting...' : 'Delete'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowDeleteProductModal(false);
                        setSelectedProduct(null);
                      }}
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>,
            document.body
          ) : null}

          {/* Product Detail Modal */}
          {showProductDetailModal && selectedProductForDetail && isMounted && typeof window !== 'undefined' && typeof document !== 'undefined' && document.body ? createPortal(
            <div 
              className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setShowProductDetailModal(false);
                  setSelectedProductForDetail(null);
                }
              }}
            >
              <Card 
                className="w-full max-w-3xl border-0 shadow-2xl dark:bg-slate-800 bg-white rounded-2xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
                  <div>
                    <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                      <Package className="w-6 h-6 text-violet-600" />
                      {selectedProductForDetail.name}
                    </CardTitle>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      Product Details
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowProductDetailModal(false);
                      setSelectedProductForDetail(null);
                    }}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    {/* Product Image */}
                    <div className="flex justify-center">
                      {selectedProductForDetail.imageUrl ? (
                        <img 
                          src={selectedProductForDetail.imageUrl} 
                          alt={selectedProductForDetail.name}
                          className="w-48 h-48 rounded-2xl object-cover border-4 border-violet-200 dark:border-violet-700 shadow-xl"
                          onError={(e) => { 
                            e.target.style.display = 'none';
                            const fallback = e.target.nextElementSibling;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      {(!selectedProductForDetail.imageUrl || !selectedProductForDetail.imageUrl.trim()) && (
                        <div className="w-48 h-48 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 border-4 border-violet-200 dark:border-violet-700 flex items-center justify-center shadow-xl">
                          <Package className="w-24 h-24 text-violet-600 dark:text-violet-400" />
                        </div>
                      )}
                    </div>

                    {/* Product Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">
                          Product Name
                        </label>
                        <p className="text-base font-semibold text-slate-900 dark:text-white">
                          {selectedProductForDetail.name}
                        </p>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">
                          Category
                        </label>
                        <p className="text-base font-semibold text-slate-900 dark:text-white">
                          {selectedProductForDetail.category || 'Not specified'}
                        </p>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">
                          Status
                        </label>
                        <Badge className={`${selectedProductForDetail.isActive ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'} text-sm font-semibold px-3 py-1`}>
                          {selectedProductForDetail.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>

                      <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/30 dark:to-purple-900/30 rounded-xl p-4 border-2 border-violet-200 dark:border-violet-700">
                        <label className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wide mb-2 block">
                          Product ID
                        </label>
                        <p className="text-base font-mono font-bold text-violet-900 dark:text-violet-100 break-all bg-white/50 dark:bg-slate-800/50 px-3 py-2 rounded-lg border border-violet-200 dark:border-violet-700">
                          {selectedProductForDetail.id}
                        </p>
                      </div>
                    </div>

                    {/* Description */}
                    {selectedProductForDetail.description && (
                      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 block">
                          Description
                        </label>
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                          {selectedProductForDetail.description}
                        </p>
                      </div>
                    )}

                    {/* Statistics */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/30 dark:to-purple-900/30 rounded-xl p-4 border border-violet-200 dark:border-violet-700">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                            Accessories
                          </label>
                        </div>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">
                          {getAccessoriesForProduct(selectedProductForDetail.id).length}
                        </p>
                      </div>

                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl p-4 border border-blue-200 dark:border-blue-700">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                            Tickets
                          </label>
                        </div>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">
                          {selectedProductForDetail._count?.conversations || 0}
                        </p>
                      </div>

                      <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-green-900/30 rounded-xl p-4 border border-emerald-200 dark:border-emerald-700">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                            Documents
                          </label>
                        </div>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">
                          {productDocuments.length}
                        </p>
                      </div>
                    </div>

                    {/* Documents Section */}
                    {productDocuments.length > 0 && (
                      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3 block">
                          Documents ({productDocuments.length})
                        </label>
                        <div className="space-y-2">
                          {productDocuments.map((doc) => (
                            <button
                              key={doc.id}
                              onClick={() => {
                                if (doc.fileUrl) {
                                  window.open(doc.fileUrl, '_blank');
                                }
                              }}
                              disabled={!doc.fileUrl}
                              className={`w-full flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border-2 transition-all ${
                                doc.fileUrl 
                                  ? 'border-slate-200 dark:border-slate-700 hover:border-violet-400 dark:hover:border-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 cursor-pointer' 
                                  : 'border-slate-200 dark:border-slate-700 opacity-50 cursor-not-allowed'
                              }`}
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <FileText className={`w-5 h-5 flex-shrink-0 ${doc.fileUrl ? 'text-violet-600 dark:text-violet-400' : 'text-slate-500 dark:text-slate-400'}`} />
                                <div className="flex-1 min-w-0">
                                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300 block truncate">{doc.name}</span>
                                  {doc.description && (
                                    <span className="text-xs text-slate-500 dark:text-slate-400 block truncate mt-0.5">{doc.description}</span>
                                  )}
                                </div>
                              </div>
                              {doc.fileUrl && (
                                <Download className="w-4 h-4 text-violet-600 dark:text-violet-400 flex-shrink-0 ml-2" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowProductDetailModal(false);
                          setSelectedProductForDetail(null);
                        }}
                        className="border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                      >
                        Close
                      </Button>
                      <Button
                        onClick={() => {
                          setSelectedProduct(selectedProductForDetail);
                          setProductFormData({
                            name: selectedProductForDetail.name,
                            description: selectedProductForDetail.description || '',
                            category: selectedProductForDetail.category || '',
                            imageUrl: selectedProductForDetail.imageUrl || '',
                            isActive: selectedProductForDetail.isActive
                          });
                          if (selectedProductForDetail.imageUrl) {
                            setProductImagePreview(selectedProductForDetail.imageUrl);
                          } else {
                            setProductImagePreview(null);
                          }
                          setProductImageFile(null);
                          setShowProductDetailModal(false);
                          setSelectedProductForDetail(null);
                          setShowEditProductModal(true);
                        }}
                        className="bg-violet-600 hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-500 text-white shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Edit Product
                      </Button>
                      <Button
                        onClick={() => {
                          setSelectedProduct(selectedProductForDetail);
                          setShowProductDetailModal(false);
                          setSelectedProductForDetail(null);
                          setShowDeleteProductModal(true);
                        }}
                        className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500 text-white shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Product
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>,
            document.body
          ) : null}

          {/* Add Accessory Modal */}
          {showAddAccessoryModal && isMounted && typeof window !== 'undefined' && typeof document !== 'undefined' && document.body ? createPortal(
            <div 
              className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setShowAddAccessoryModal(false);
                  setAccessoryFormData({ productId: '', name: '', description: '', imageUrl: '', specifications: {}, isActive: true });
                  setAccessoryImageFile(null);
                  setAccessoryImagePreview(null);
                }
              }}
            >
              <Card 
                className="w-full max-w-md border-0 shadow-2xl dark:bg-slate-800 bg-white rounded-2xl max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <CardHeader className="border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
                      Add Accessory
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowAddAccessoryModal(false);
                        setAccessoryFormData({ productId: '', name: '', description: '', imageUrl: '', specifications: {}, isActive: true });
        setAccessoryImageFile(null);
        setAccessoryImagePreview(null);
                      }}
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 overflow-y-auto flex-1 hide-scrollbar">
                  <form onSubmit={handleAddAccessory} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Product *
                      </label>
                      <select
                        value={accessoryFormData.productId}
                        onChange={(e) => setAccessoryFormData({ ...accessoryFormData, productId: e.target.value })}
                        required
                        className="w-full border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 h-11 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 dark:bg-slate-900 dark:text-white"
                      >
                        <option value="">Select a product</option>
                        {products.filter(p => p.isActive).map(product => (
                          <option key={product.id} value={product.id}>{product.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Accessory Name *
                      </label>
                      <Input
                        type="text"
                        value={accessoryFormData.name}
                        onChange={(e) => setAccessoryFormData({ ...accessoryFormData, name: e.target.value })}
                        required
                        className="w-full"
                        placeholder="e.g., AC-5000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Description
                      </label>
                      <textarea
                        value={accessoryFormData.description}
                        onChange={(e) => setAccessoryFormData({ ...accessoryFormData, description: e.target.value })}
                        className="w-full border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 min-h-[100px] resize-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 dark:bg-slate-900 dark:text-white"
                        placeholder="e.g., Universal remote control with backlit buttons, supports multiple projector models..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Accessory Image
                      </label>
                      <div className="space-y-3">
                        {(accessoryImagePreview || accessoryFormData.imageUrl) ? (
                          <div className="relative w-full h-48 rounded-xl border-2 border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-900">
                            <img
                              src={accessoryImagePreview || accessoryFormData.imageUrl}
                              alt="Accessory preview"
                              className="w-full h-full object-cover"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setAccessoryImageFile(null);
                                setAccessoryImagePreview(null);
                                setAccessoryFormData({ ...accessoryFormData, imageUrl: '' });
                              }}
                              className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-lg z-10"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <ImageIcon className="w-8 h-8 mb-2 text-slate-400" />
                              <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">
                                <span className="font-semibold">Click to upload</span> or drag and drop
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">PNG, JPG, GIF, WebP (MAX. 5MB)</p>
                            </div>
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) {
                                  if (file.size > 5 * 1024 * 1024) {
                                    showNotification('error', 'Image size must be less than 5MB');
                                    return;
                                  }
                                  setAccessoryImageFile(file);
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setAccessoryImagePreview(reader.result);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                      <div className="relative flex items-center">
                        <input
                          type="checkbox"
                          id="accessoryActive"
                          checked={accessoryFormData.isActive}
                          onChange={(e) => setAccessoryFormData({ ...accessoryFormData, isActive: e.target.checked })}
                          className="w-5 h-5 rounded-md border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-violet-600 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 cursor-pointer transition-all duration-200 checked:bg-violet-600 checked:border-violet-600 dark:checked:bg-violet-600 dark:checked:border-violet-600"
                        />
                      </div>
                      <label htmlFor="accessoryActive" className="text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                        Active
                      </label>
                    </div>
                    <div className="flex gap-3 pt-4">
                      <Button
                        type="submit"
                        className="flex-1 bg-violet-600 hover:bg-violet-700 text-white"
                        disabled={submitting}
                      >
                        {submitting ? 'Creating...' : 'Create Accessory'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowAddAccessoryModal(false);
                          setAccessoryFormData({ productId: '', name: '', description: '', imageUrl: '', specifications: {}, isActive: true });
        setAccessoryImageFile(null);
        setAccessoryImagePreview(null);
                        }}
                        disabled={submitting}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>,
            document.body
          ) : null}

          {/* Edit Accessory Modal */}
          {showEditAccessoryModal && selectedAccessory && isMounted && typeof window !== 'undefined' && typeof document !== 'undefined' && document.body ? createPortal(
            <div 
              className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setShowEditAccessoryModal(false);
                  setSelectedAccessory(null);
                  setAccessoryFormData({ productId: '', name: '', description: '', imageUrl: '', specifications: {}, isActive: true });
                  setAccessoryImageFile(null);
                  setAccessoryImagePreview(null);
                }
              }}
            >
              <Card 
                className="w-full max-w-md border-0 shadow-2xl dark:bg-slate-800 bg-white rounded-2xl max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <CardHeader className="border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
                      Edit Accessory
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowEditAccessoryModal(false);
                        setSelectedAccessory(null);
                        setAccessoryFormData({ productId: '', name: '', description: '', imageUrl: '', specifications: {}, isActive: true });
        setAccessoryImageFile(null);
        setAccessoryImagePreview(null);
                      }}
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 overflow-y-auto flex-1 hide-scrollbar">
                  <form onSubmit={handleEditAccessory} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Product *
                      </label>
                      <select
                        value={accessoryFormData.productId}
                        onChange={(e) => setAccessoryFormData({ ...accessoryFormData, productId: e.target.value })}
                        required
                        className="w-full border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 h-11 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 dark:bg-slate-900 dark:text-white"
                      >
                        {products.map(product => (
                          <option key={product.id} value={product.id}>{product.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Accessory Name *
                      </label>
                      <Input
                        type="text"
                        value={accessoryFormData.name}
                        onChange={(e) => setAccessoryFormData({ ...accessoryFormData, name: e.target.value })}
                        required
                        className="w-full"
                        placeholder="e.g., Alpha Xtreme"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Description
                      </label>
                      <textarea
                        value={accessoryFormData.description}
                        onChange={(e) => setAccessoryFormData({ ...accessoryFormData, description: e.target.value })}
                        className="w-full border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 min-h-[100px] resize-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 dark:bg-slate-900 dark:text-white"
                        placeholder="e.g., Universal remote control with backlit buttons, supports multiple projector models..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Accessory Image
                      </label>
                      <div className="space-y-3">
                        {(accessoryImagePreview || accessoryFormData.imageUrl) ? (
                          <div className="relative w-full h-48 rounded-xl border-2 border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-900">
                            <img
                              src={accessoryImagePreview || accessoryFormData.imageUrl}
                              alt="Accessory preview"
                              className="w-full h-full object-cover"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setAccessoryImageFile(null);
                                setAccessoryImagePreview(null);
                                setAccessoryFormData({ ...accessoryFormData, imageUrl: '' });
                              }}
                              className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-lg z-10"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <ImageIcon className="w-8 h-8 mb-2 text-slate-400" />
                              <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">
                                <span className="font-semibold">Click to upload</span> or drag and drop
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">PNG, JPG, GIF, WebP (MAX. 5MB)</p>
                            </div>
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) {
                                  if (file.size > 5 * 1024 * 1024) {
                                    showNotification('error', 'Image size must be less than 5MB');
                                    return;
                                  }
                                  setAccessoryImageFile(file);
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setAccessoryImagePreview(reader.result);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                      <div className="relative flex items-center">
                        <input
                          type="checkbox"
                          id="editAccessoryActive"
                          checked={accessoryFormData.isActive}
                          onChange={(e) => setAccessoryFormData({ ...accessoryFormData, isActive: e.target.checked })}
                          className="w-5 h-5 rounded-md border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-violet-600 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 cursor-pointer transition-all duration-200 checked:bg-violet-600 checked:border-violet-600 dark:checked:bg-violet-600 dark:checked:border-violet-600"
                        />
                      </div>
                      <label htmlFor="editAccessoryActive" className="text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                        Active
                      </label>
                    </div>
                    <div className="flex gap-3 pt-4">
                      <Button
                        type="submit"
                        className="flex-1 bg-violet-600 hover:bg-violet-700 text-white"
                        disabled={submitting}
                      >
                        {submitting ? 'Updating...' : 'Update Accessory'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowEditAccessoryModal(false);
                          setSelectedAccessory(null);
                          setAccessoryFormData({ productId: '', name: '', description: '', imageUrl: '', specifications: {}, isActive: true });
        setAccessoryImageFile(null);
        setAccessoryImagePreview(null);
                        }}
                        disabled={submitting}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>,
            document.body
          ) : null}

          {/* Delete Accessory Modal */}
          {showDeleteAccessoryModal && selectedAccessory && isMounted && typeof window !== 'undefined' && typeof document !== 'undefined' && document.body ? createPortal(
            <div 
              className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setShowDeleteAccessoryModal(false);
                  setSelectedAccessory(null);
                }
              }}
            >
              <Card 
                className="w-full max-w-md border-0 shadow-2xl dark:bg-slate-800 bg-white rounded-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <CardHeader className="border-b border-slate-200 dark:border-slate-700">
                  <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
                    Delete Accessory
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <p className="text-slate-700 dark:text-slate-300 mb-6">
                    Are you sure you want to delete <strong>{selectedAccessory.name}</strong>?
                    {selectedAccessory._count?.conversations > 0 && (
                      <span className="block mt-2 text-red-600 dark:text-red-400">
                        This accessory has {selectedAccessory._count.conversations} associated ticket(s). 
                        You must reassign them first.
                      </span>
                    )}
                  </p>
                  <div className="flex gap-3">
                    <Button
                      onClick={handleDeleteAccessory}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                      disabled={submitting || (selectedAccessory._count?.conversations > 0)}
                    >
                      {submitting ? 'Deleting...' : 'Delete'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowDeleteAccessoryModal(false);
                        setSelectedAccessory(null);
                      }}
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>,
            document.body
          ) : null}

          {/* Accessory Detail Modal */}
          {showAccessoryDetailModal && selectedAccessoryForDetail && isMounted && typeof window !== 'undefined' && typeof document !== 'undefined' && document.body ? createPortal(
            <div 
              className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setShowAccessoryDetailModal(false);
                  setSelectedAccessoryForDetail(null);
                }
              }}
            >
              <Card 
                className="w-full max-w-3xl border-0 shadow-2xl dark:bg-slate-800 bg-white rounded-2xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
                  <div>
                    <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                      <Package className="w-6 h-6 text-violet-600" />
                      {selectedAccessoryForDetail.name}
                    </CardTitle>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      Accessory Details
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowAccessoryDetailModal(false);
                      setSelectedAccessoryForDetail(null);
                    }}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    {/* Accessory Image */}
                    <div className="flex justify-center">
                      {selectedAccessoryForDetail.imageUrl ? (
                        <img 
                          src={selectedAccessoryForDetail.imageUrl} 
                          alt={selectedAccessoryForDetail.name}
                          className="w-48 h-48 rounded-2xl object-cover border-4 border-violet-200 dark:border-violet-700 shadow-xl"
                          onError={(e) => { 
                            e.target.style.display = 'none';
                            const fallback = e.target.nextElementSibling;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      {(!selectedAccessoryForDetail.imageUrl || !selectedAccessoryForDetail.imageUrl.trim()) && (
                        <div className="w-48 h-48 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 border-4 border-violet-200 dark:border-violet-700 flex items-center justify-center shadow-xl">
                          <Package className="w-24 h-24 text-violet-600 dark:text-violet-400" />
                        </div>
                      )}
                    </div>

                    {/* Accessory Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">
                          Accessory Name
                        </label>
                        <p className="text-base font-semibold text-slate-900 dark:text-white">
                          {selectedAccessoryForDetail.name}
                        </p>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">
                          Status
                        </label>
                        <Badge className={`${selectedAccessoryForDetail.isActive ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'} text-sm font-semibold px-3 py-1`}>
                          {selectedAccessoryForDetail.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>

                      <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/30 dark:to-purple-900/30 rounded-xl p-4 border-2 border-violet-200 dark:border-violet-700">
                        <label className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wide mb-2 block">
                          Accessory ID
                        </label>
                        <p className="text-base font-mono font-bold text-violet-900 dark:text-violet-100 break-all bg-white/50 dark:bg-slate-800/50 px-3 py-2 rounded-lg border border-violet-200 dark:border-violet-700">
                          {selectedAccessoryForDetail.id}
                        </p>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">
                          Product
                        </label>
                        <p className="text-base font-semibold text-slate-900 dark:text-white">
                          {products.find(p => p.id === selectedAccessoryForDetail.productId)?.name || 'Unknown Product'}
                        </p>
                      </div>
                    </div>

                    {/* Description */}
                    {selectedAccessoryForDetail.description && (
                      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 block">
                          Description
                        </label>
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                          {selectedAccessoryForDetail.description}
                        </p>
                      </div>
                    )}

                    {/* Specifications */}
                    {selectedAccessoryForDetail.specifications && Object.keys(selectedAccessoryForDetail.specifications).length > 0 && (
                      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3 block">
                          Specifications
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {Object.entries(selectedAccessoryForDetail.specifications).map(([key, value]) => (
                            <div key={key} className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">
                                {key}
                              </label>
                              <p className="text-sm text-slate-900 dark:text-white">
                                {String(value)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Statistics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl p-4 border border-blue-200 dark:border-blue-700">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                            Tickets
                          </label>
                        </div>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">
                          {selectedAccessoryForDetail._count?.conversations || 0}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowAccessoryDetailModal(false);
                          setSelectedAccessoryForDetail(null);
                        }}
                        className="border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                      >
                        Close
                      </Button>
                      <Button
                        onClick={() => {
                          setSelectedAccessory(selectedAccessoryForDetail);
                          setAccessoryFormData({
                            productId: selectedAccessoryForDetail.productId,
                            name: selectedAccessoryForDetail.name,
                            description: selectedAccessoryForDetail.description || '',
                            imageUrl: selectedAccessoryForDetail.imageUrl || '',
                            specifications: selectedAccessoryForDetail.specifications || {},
                            isActive: selectedAccessoryForDetail.isActive
                          });
                          if (selectedAccessoryForDetail.imageUrl) {
                            setAccessoryImagePreview(selectedAccessoryForDetail.imageUrl);
                          } else {
                            setAccessoryImagePreview(null);
                          }
                          setAccessoryImageFile(null);
                          setShowAccessoryDetailModal(false);
                          setSelectedAccessoryForDetail(null);
                          setShowEditAccessoryModal(true);
                        }}
                        className="bg-violet-600 hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-500 text-white shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Edit Accessory
                      </Button>
                      <Button
                        onClick={() => {
                          setSelectedAccessory(selectedAccessoryForDetail);
                          setShowAccessoryDetailModal(false);
                          setSelectedAccessoryForDetail(null);
                          setShowDeleteAccessoryModal(true);
                        }}
                        className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500 text-white shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Accessory
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>,
            document.body
          ) : null}

          {/* Product Tickets Modal */}
          {showTicketsModal && selectedProductForTickets && isMounted && typeof window !== 'undefined' && typeof document !== 'undefined' && document.body ? createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-700">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Ticket className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                        Tickets for {selectedProductForTickets.name}
                      </h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        {productTickets.length} {productTickets.length === 1 ? 'ticket' : 'tickets'} found
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowTicketsModal(false);
                      setSelectedProductForTickets(null);
                      setProductTickets([]);
                    }}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {loadingTickets ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                  ) : productTickets.length === 0 ? (
                    <div className="text-center py-12">
                      <Ticket className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                      <p className="text-slate-500 dark:text-slate-400">No tickets found for this product</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {productTickets.map((ticket) => (
                        <div
                          key={ticket.ticketNumber}
                          className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all cursor-pointer"
                          onClick={() => {
                            setShowTicketsModal(false);
                            setSelectedProductForTickets(null);
                            setProductTickets([]);
                            router.push(`/admin/tickets/${ticket.ticketNumber}`);
                          }}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400">
                                  #{ticket.ticketNumber}
                                </span>
                                <Badge
                                  className={`text-xs font-semibold px-2 py-0.5 ${
                                    ticket.status === 'open'
                                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                      : ticket.status === 'pending'
                                      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                                      : ticket.status === 'resolved'
                                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                                  }`}
                                >
                                  {ticket.status}
                                </Badge>
                                <Badge
                                  className={`text-xs font-semibold px-2 py-0.5 ${
                                    ticket.priority === 'high'
                                      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                                      : ticket.priority === 'medium'
                                      ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                                  }`}
                                >
                                  {ticket.priority}
                                </Badge>
                              </div>
                              <h3 className="font-semibold text-slate-900 dark:text-white mb-1 truncate">
                                {ticket.subject}
                              </h3>
                              <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                                <span>Customer: {ticket.customerName}</span>
                                {ticket.assignee && (
                                  <span>Assigned to: {ticket.assignee.name}</span>
                                )}
                                {ticket.department && (
                                  <span>Dept: {ticket.department.name}</span>
                                )}
                                <span>{ticket.messageCount} {ticket.messageCount === 1 ? 'message' : 'messages'}</span>
                              </div>
                              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                                Updated: {new Date(ticket.updatedAt).toLocaleString()}
                              </p>
                            </div>
                            <ExternalLink className="w-5 h-5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowTicketsModal(false);
                      setSelectedProductForTickets(null);
                      setProductTickets([]);
                    }}
                    className="border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>,
            document.body
          ) : null}

          {/* Accessory Tickets Modal */}
          {showAccessoryTicketsModal && selectedAccessoryForTickets && isMounted && typeof window !== 'undefined' && typeof document !== 'undefined' && document.body ? createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-700">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Ticket className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                        Tickets for {selectedAccessoryForTickets.name}
                      </h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        {accessoryTickets.length} {accessoryTickets.length === 1 ? 'ticket' : 'tickets'} found
                        {selectedAccessoryForTickets.productName && ` • Product: ${selectedAccessoryForTickets.productName}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowAccessoryTicketsModal(false);
                      setSelectedAccessoryForTickets(null);
                      setAccessoryTickets([]);
                    }}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {loadingAccessoryTickets ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                  ) : accessoryTickets.length === 0 ? (
                    <div className="text-center py-12">
                      <Ticket className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                      <p className="text-slate-500 dark:text-slate-400">No tickets found for this accessory</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {accessoryTickets.map((ticket) => (
                        <div
                          key={ticket.ticketNumber}
                          className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all cursor-pointer"
                          onClick={() => {
                            setShowAccessoryTicketsModal(false);
                            setSelectedAccessoryForTickets(null);
                            setAccessoryTickets([]);
                            router.push(`/admin/tickets/${ticket.ticketNumber}`);
                          }}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400">
                                  #{ticket.ticketNumber}
                                </span>
                                <Badge
                                  className={`text-xs font-semibold px-2 py-0.5 ${
                                    ticket.status === 'open'
                                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                      : ticket.status === 'pending'
                                      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                                      : ticket.status === 'resolved'
                                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                                  }`}
                                >
                                  {ticket.status}
                                </Badge>
                                <Badge
                                  className={`text-xs font-semibold px-2 py-0.5 ${
                                    ticket.priority === 'high'
                                      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                                      : ticket.priority === 'medium'
                                      ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                                  }`}
                                >
                                  {ticket.priority}
                                </Badge>
                              </div>
                              <h3 className="font-semibold text-slate-900 dark:text-white mb-1 truncate">
                                {ticket.subject}
                              </h3>
                              <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                                <span>Customer: {ticket.customerName}</span>
                                {ticket.assignee && (
                                  <span>Assigned to: {ticket.assignee.name}</span>
                                )}
                                {ticket.department && (
                                  <span>Dept: {ticket.department.name}</span>
                                )}
                                <span>{ticket.messageCount} {ticket.messageCount === 1 ? 'message' : 'messages'}</span>
                              </div>
                              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                                Updated: {new Date(ticket.updatedAt).toLocaleString()}
                              </p>
                            </div>
                            <ExternalLink className="w-5 h-5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAccessoryTicketsModal(false);
                      setSelectedAccessoryForTickets(null);
                      setAccessoryTickets([]);
                    }}
                    className="border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>,
            document.body
          ) : null}
        </div>
      </AdminLayout>
    </>
  );
}

export const getServerSideProps = withAuth();


