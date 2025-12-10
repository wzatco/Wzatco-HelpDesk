// Admin Page for Product Tutorials & Guides
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import AdminLayout from '../../../components/admin/universal/AdminLayout';
import PageHead from '../../../components/admin/PageHead';
import NotificationToast from '../../../components/ui/NotificationToast';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { withAuth } from '../../../lib/withAuth';
import { GraduationCap, Package, Save, ExternalLink, Video, FileText, Youtube, Loader2, Plus, Edit2, Link2 } from 'lucide-react';

export default function TutorialsPage() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [tutorials, setTutorials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState({ type: null, message: '' });
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [formData, setFormData] = useState({
    productId: '',
    manualLink: '',
    demoVideoLink: '',
    cleaningVideoLink: ''
  });

  useEffect(() => {
    fetchProducts();
    fetchTutorials();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/admin/products');
      const data = await response.json();
      if (response.ok) {
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchTutorials = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/product-tutorials');
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

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: null, message: '' }), 5000);
  };

  const handleProductSelect = (productId) => {
    setSelectedProduct(productId);
    const existingTutorial = tutorials.find(t => t.productId === productId);
    
    if (existingTutorial) {
      setFormData({
        productId: existingTutorial.productId,
        manualLink: existingTutorial.manualLink || '',
        demoVideoLink: existingTutorial.demoVideoLink || '',
        cleaningVideoLink: existingTutorial.cleaningVideoLink || ''
      });
    } else {
      setFormData({
        productId: productId,
        manualLink: '',
        demoVideoLink: '',
        cleaningVideoLink: ''
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/admin/product-tutorials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        showNotification('success', 'Tutorial saved successfully');
        fetchTutorials();
        // Keep form data but show success
      } else {
        showNotification('error', data.message || 'Failed to save tutorial');
      }
    } catch (error) {
      console.error('Error saving tutorial:', error);
      showNotification('error', 'An error occurred while saving tutorial');
    } finally {
      setSubmitting(false);
    }
  };

  const getProductName = (productId) => {
    const product = products.find(p => p.id === productId);
    return product?.name || 'Unknown Product';
  };

  const getProductImage = (productId) => {
    const product = products.find(p => p.id === productId);
    return product?.imageUrl || null;
  };

  const hasAnyLink = (tutorial) => {
    return tutorial.manualLink || tutorial.demoVideoLink || tutorial.cleaningVideoLink;
  };

  return (
    <>
      <Head>
        <title>Tutorials & Guides - Admin Panel</title>
      </Head>
      <AdminLayout currentPage="Tutorials & Guides">
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-purple-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
          <div className="max-w-none mx-auto space-y-6 p-6">
            {/* Enhanced Header */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-violet-700 to-purple-800 dark:from-violet-800 dark:via-violet-900 dark:to-purple-950 p-6 sm:p-8 text-white shadow-2xl">
              <div className="absolute inset-0 bg-black/10 dark:bg-black/20"></div>
              <div className="relative z-10">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2 flex items-center gap-3">
                      <GraduationCap className="w-8 h-8" />
                      Tutorials & Guides
                    </h1>
                    <p className="text-violet-100 dark:text-violet-200 text-base sm:text-lg">
                      Manage tutorials, videos, and guides for each product
                    </p>
                  </div>
                </div>
              </div>
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full"></div>
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/5 rounded-full"></div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Left Column - Product Selection & Form */}
              <div className="xl:col-span-2 space-y-6">
                {/* Product Selection Card */}
                <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border-b border-slate-200 dark:border-slate-700">
                    <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white flex items-center">
                      <Package className="w-5 h-5 mr-2 text-violet-600 dark:text-violet-400" />
                      Select Product
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Product
                        </label>
                        <select
                          value={selectedProduct || ''}
                          onChange={(e) => handleProductSelect(e.target.value)}
                          className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all shadow-sm hover:shadow-md"
                        >
                          <option value="">Select a product...</option>
                          {products
                            .filter(p => p.isActive)
                            .map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.name}
                              </option>
                            ))}
                        </select>
                      </div>

                      {selectedProduct && (
                        <div className="p-4 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-xl border border-violet-200 dark:border-violet-800">
                          <div className="flex items-center space-x-3">
                            {getProductImage(selectedProduct) && (
                              <img
                                src={getProductImage(selectedProduct)}
                                alt={getProductName(selectedProduct)}
                                className="w-12 h-12 rounded-lg object-cover border-2 border-violet-200 dark:border-violet-700"
                              />
                            )}
                            <div>
                              <p className="text-sm text-slate-600 dark:text-slate-400">Managing tutorials for:</p>
                              <p className="font-semibold text-violet-600 dark:text-violet-400 text-lg">
                                {getProductName(selectedProduct)}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Tutorial Links Form */}
                {selectedProduct && (
                  <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border-b border-slate-200 dark:border-slate-700">
                      <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white flex items-center">
                        <Link2 className="w-5 h-5 mr-2 text-violet-600 dark:text-violet-400" />
                        Tutorial Links
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center">
                            <FileText className="w-4 h-4 mr-2 text-violet-600 dark:text-violet-400" />
                            Manual Link (PDF/Document)
                          </label>
                          <Input
                            type="url"
                            value={formData.manualLink}
                            onChange={(e) => setFormData({ ...formData, manualLink: e.target.value })}
                            placeholder="https://..."
                            className="w-full px-4 py-3 border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 focus:ring-2 focus:ring-violet-500"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center">
                            <Youtube className="w-4 h-4 mr-2 text-violet-600 dark:text-violet-400" />
                            Demo Video Link (Youtube/Google Drive)
                          </label>
                          <Input
                            type="url"
                            value={formData.demoVideoLink}
                            onChange={(e) => setFormData({ ...formData, demoVideoLink: e.target.value })}
                            placeholder="https://youtube.com/... or https://drive.google.com/..."
                            className="w-full px-4 py-3 border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 focus:ring-2 focus:ring-violet-500"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center">
                            <Video className="w-4 h-4 mr-2 text-violet-600 dark:text-violet-400" />
                            Cleaning Video Link (Youtube/Google Drive)
                          </label>
                          <Input
                            type="url"
                            value={formData.cleaningVideoLink}
                            onChange={(e) => setFormData({ ...formData, cleaningVideoLink: e.target.value })}
                            placeholder="https://youtube.com/... or https://drive.google.com/..."
                            className="w-full px-4 py-3 border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 focus:ring-2 focus:ring-violet-500"
                          />
                        </div>

                        <Button
                          type="submit"
                          disabled={submitting}
                          className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
                        >
                          {submitting ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4 mr-2" />
                              Save Tutorial Links
                            </>
                          )}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right Column - Existing Tutorials List */}
              <div className="xl:col-span-1">
                <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg h-full">
                  <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border-b border-slate-200 dark:border-slate-700">
                    <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
                      All Product Tutorials
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    {loading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
                      </div>
                    ) : tutorials.length === 0 ? (
                      <div className="text-center py-12">
                        <GraduationCap className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500 mb-3 opacity-50" />
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          No tutorials configured yet.
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                          Select a product to get started.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
                        {tutorials.map((tutorial) => {
                          const productName = getProductName(tutorial.productId);
                          const productImage = getProductImage(tutorial.productId);
                          const hasLinks = hasAnyLink(tutorial);
                          
                          return (
                            <div
                              key={tutorial.id}
                              className={`p-4 rounded-xl border transition-all ${
                                selectedProduct === tutorial.productId
                                  ? 'bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/30 dark:to-purple-900/30 border-violet-300 dark:border-violet-700 shadow-md'
                                  : 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 hover:shadow-md'
                              }`}
                            >
                              <div className="flex items-start space-x-3 mb-3">
                                {productImage ? (
                                  <img
                                    src={productImage}
                                    alt={productName}
                                    className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-600"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                                    <Package className="w-5 h-5 text-white" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm truncate">
                                    {productName}
                                  </h3>
                                  {hasLinks && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                      {[
                                        tutorial.manualLink && 'Manual',
                                        tutorial.demoVideoLink && 'Demo',
                                        tutorial.cleaningVideoLink && 'Cleaning'
                                      ].filter(Boolean).join(', ')}
                                    </p>
                                  )}
                                </div>
                                <button
                                  onClick={() => handleProductSelect(tutorial.productId)}
                                  className="p-1.5 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/30 rounded-lg transition-colors"
                                  title="Edit"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              </div>
                              
                              {hasLinks && (
                                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-600">
                                  {tutorial.manualLink && (
                                    <a
                                      href={tutorial.manualLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center justify-center px-2 py-1.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                                    >
                                      <FileText className="w-3 h-3 mr-1" />
                                      Manual
                                    </a>
                                  )}
                                  {tutorial.demoVideoLink && (
                                    <a
                                      href={tutorial.demoVideoLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center justify-center px-2 py-1.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                                    >
                                      <Youtube className="w-3 h-3 mr-1" />
                                      Demo
                                    </a>
                                  )}
                                  {tutorial.cleaningVideoLink && (
                                    <a
                                      href={tutorial.cleaningVideoLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center justify-center px-2 py-1.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                                    >
                                      <Video className="w-3 h-3 mr-1" />
                                      Cleaning
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>

        {notification.type && (
          <NotificationToast
            type={notification.type}
            message={notification.message}
            onClose={() => setNotification({ type: null, message: '' })}
          />
        )}
      </AdminLayout>
    </>
  );
}

export const getServerSideProps = withAuth();
