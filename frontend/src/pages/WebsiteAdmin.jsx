import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Save, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Image as ImageIcon, 
  Phone, 
  Layout, 
  Package, 
  RefreshCw,
  Sparkles,
  Layers
} from 'lucide-react';
import { toast } from 'sonner';

const optImg = (url, width = 300) => {
  if (!url || typeof url !== 'string' || !url.includes('cloudinary.com')) return url;
  if (url.includes('/f_auto,q_auto')) return url;
  return url.replace('/image/upload/', `/image/upload/f_auto,q_auto,w_${width}/`);
};

export default function WebsiteAdmin() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assets, setAssets] = useState({ images: [], products: [] });
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    // 1. Fetch Landing Page Settings
    fetch('/api/landing-page')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setSettings(data.data);
        }
      })
      .catch((_err) => {
        toast.error('Failed to load settings');
      })
      .finally(() => setLoading(false));

    // 2. Fetch Available Cloudinary Assets
    fetch('/api/landing-page/assets')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setAssets(data.data);
        }
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/landing-page', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Website content saved successfully!');
      } else {
        toast.error(data.message || 'Failed to save');
      }
    } catch (err) {
      toast.error('Error saving settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleGeneralChange = (field, val) => {
    setSettings(prev => ({ ...prev, [field]: val }));
  };

  const handleProductChange = (index, field, val) => {
    setSettings(prev => {
      const newProds = [...(prev.products || [])];
      newProds[index] = { ...newProds[index], [field]: val };
      return { ...prev, products: newProds };
    });
  };

  const addProduct = () => {
    const newProd = {
      id: `p_${Date.now()}`,
      name: 'New Product',
      desc: 'High purity mineral water bottle',
      price: 'PKR 100',
      image: assets.products[0]?.url || 'https://res.cloudinary.com/wgstyulb/image/upload/v1791005454/product_1777146556_7174.png'
    };
    setSettings(prev => ({
      ...prev,
      products: [...(prev.products || []), newProd]
    }));
  };

  const removeProduct = (index) => {
    setSettings(prev => {
      const newProds = prev.products.filter((_, i) => i !== index);
      return { ...prev, products: newProds };
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans pb-24">
      {/* Top Admin Header */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              to="/" 
              className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>View Landing Page</span>
            </Link>
            <div className="h-5 w-px bg-slate-800"></div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <Layout className="w-5 h-5 text-cyan-400" />
              <span>Website Content Manager</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link 
              to="/login" 
              className="text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 px-3 py-2 rounded-lg border border-slate-700"
            >
              Software Admin
            </Link>

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 rounded-lg shadow-md shadow-cyan-900/40 transition-all cursor-pointer"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saving ? 'Saving...' : 'Save All Changes'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="max-w-7xl mx-auto px-6 mt-8">
        {/* Navigation Tabs */}
        <div className="flex gap-2 border-b border-slate-800 pb-4 mb-8">
          {[
            { id: 'general', label: 'Contact & Header Info', icon: Phone },
            { id: 'hero', label: 'Hero Section', icon: Sparkles },
            { id: 'products', label: 'Products Catalog', icon: Package },
            { id: 'about', label: 'About & Technology', icon: Layers },
            { id: 'cloudinary', label: 'Cloudinary Assets', icon: ImageIcon },
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  active 
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: GENERAL INFO */}
        {activeTab === 'general' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-950 p-6 rounded-2xl border border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">Website Name</label>
              <input 
                type="text" 
                value={settings?.site_name || ''} 
                onChange={(e) => handleGeneralChange('site_name', e.target.value)} 
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">Landline Phone</label>
              <input 
                type="text" 
                value={settings?.phone || ''} 
                onChange={(e) => handleGeneralChange('phone', e.target.value)} 
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">WhatsApp Order Number</label>
              <input 
                type="text" 
                value={settings?.whatsapp || ''} 
                onChange={(e) => handleGeneralChange('whatsapp', e.target.value)} 
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                placeholder="e.g. 923015072233"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">Opening Hours</label>
              <input 
                type="text" 
                value={settings?.opening_hours || ''} 
                onChange={(e) => handleGeneralChange('opening_hours', e.target.value)} 
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-2">Factory Location Address</label>
              <input 
                type="text" 
                value={settings?.location || ''} 
                onChange={(e) => handleGeneralChange('location', e.target.value)} 
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-2">Google Map Embed Link</label>
              <input 
                type="text" 
                value={settings?.map_embed || ''} 
                onChange={(e) => handleGeneralChange('map_embed', e.target.value)} 
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        )}

        {/* TAB 2: HERO */}
        {activeTab === 'hero' && (
          <div className="space-y-6 bg-slate-950 p-6 rounded-2xl border border-slate-800">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">Hero Line 1</label>
                <input 
                  type="text" 
                  value={settings?.hero_title || ''} 
                  onChange={(e) => handleGeneralChange('hero_title', e.target.value)} 
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">Hero Line 2 (Highlighted Gradient)</label>
                <input 
                  type="text" 
                  value={settings?.hero_subtitle || ''} 
                  onChange={(e) => handleGeneralChange('hero_subtitle', e.target.value)} 
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">Hero Paragraph</label>
              <textarea 
                rows="3"
                value={settings?.hero_text || ''} 
                onChange={(e) => handleGeneralChange('hero_text', e.target.value)} 
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
              ></textarea>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">Button Text</label>
              <input 
                type="text" 
                value={settings?.hero_button || ''} 
                onChange={(e) => handleGeneralChange('hero_button', e.target.value)} 
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        )}

        {/* TAB 3: PRODUCTS */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Active Product Cards</h3>
              <button 
                onClick={addProduct}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Product</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {settings?.products?.map((prod, idx) => (
                <div key={prod.id || idx} className="bg-slate-950 border border-slate-800 p-5 rounded-2xl flex flex-col gap-4">
                  <div className="relative h-44 bg-slate-900/60 rounded-xl p-3 flex items-center justify-center border border-slate-800/80">
                    <img src={prod.image} alt={prod.name} className="max-h-full max-w-full object-contain" />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Product Title</label>
                    <input 
                      type="text" 
                      value={prod.name} 
                      onChange={(e) => handleProductChange(idx, 'name', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Price Tag</label>
                    <input 
                      type="text" 
                      value={prod.price} 
                      onChange={(e) => handleProductChange(idx, 'price', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-cyan-400 focus:outline-none focus:border-cyan-500 font-extrabold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Description</label>
                    <textarea 
                      rows="2"
                      value={prod.desc} 
                      onChange={(e) => handleProductChange(idx, 'desc', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
                    ></textarea>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Image URL (from Cloudinary)</label>
                    <input 
                      type="text" 
                      value={prod.image} 
                      onChange={(e) => handleProductChange(idx, 'image', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-[11px] text-slate-400 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex justify-end">
                    <button 
                      onClick={() => removeProduct(idx)}
                      className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: ABOUT & TECHNOLOGY */}
        {activeTab === 'about' && (
          <div className="space-y-6 bg-slate-950 p-6 rounded-2xl border border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">Company Section Title</label>
              <input 
                type="text" 
                value={settings?.company_title || ''} 
                onChange={(e) => handleGeneralChange('company_title', e.target.value)} 
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">Company Introduction</label>
              <textarea 
                rows="3"
                value={settings?.company_intro || ''} 
                onChange={(e) => handleGeneralChange('company_intro', e.target.value)} 
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
              ></textarea>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">Purification Technology Title</label>
              <input 
                type="text" 
                value={settings?.technology_title || ''} 
                onChange={(e) => handleGeneralChange('technology_title', e.target.value)} 
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">Technology Description</label>
              <textarea 
                rows="3"
                value={settings?.technology_text || ''} 
                onChange={(e) => handleGeneralChange('technology_text', e.target.value)} 
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
              ></textarea>
            </div>
          </div>
        )}

        {/* TAB 5: CLOUDINARY ASSETS EXPLORER */}
        {activeTab === 'cloudinary' && (
          <div className="space-y-8 bg-slate-950 p-6 rounded-2xl border border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white mb-2">Landing Page / Products ({assets.products.length} assets)</h3>
              <p className="text-xs text-slate-400 mb-4">Click any image to copy its Cloudinary URL to clipboard.</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                {assets.products.map(p => (
                  <div 
                    key={p.id} 
                    onClick={() => {
                      navigator.clipboard.writeText(p.url);
                      toast.success(`Copied ${p.name} URL!`);
                    }}
                    className="bg-slate-900 rounded-xl p-3 border border-slate-800 hover:border-cyan-500 cursor-pointer transition-all flex flex-col items-center group"
                  >
                    <div className="h-28 w-full flex items-center justify-center">
                      <img src={optImg(p.url, 200)} alt={p.name} className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform" loading="lazy" decoding="async" />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-2 truncate w-full text-center">{p.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-slate-800">
              <h3 className="text-sm font-bold text-white mb-2">Landing Page / Images ({assets.images.length} assets)</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                {assets.images.map(img => (
                  <div 
                    key={img.id} 
                    onClick={() => {
                      navigator.clipboard.writeText(img.url);
                      toast.success(`Copied ${img.name} URL!`);
                    }}
                    className="bg-slate-900 rounded-xl p-3 border border-slate-800 hover:border-cyan-500 cursor-pointer transition-all flex flex-col items-center group"
                  >
                    <div className="h-28 w-full flex items-center justify-center">
                      <img src={optImg(img.url, 200)} alt={img.name} className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform" loading="lazy" decoding="async" />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-2 truncate w-full text-center">{img.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
