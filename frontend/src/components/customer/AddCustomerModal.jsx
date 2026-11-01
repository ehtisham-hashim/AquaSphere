import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { X, UserPlus, Upload, Image as ImageIcon, Clipboard } from 'lucide-react';
import { API_URL as API } from '../../utils/api';
import CustomerFormFields from './CustomerFormFields';
import { useTenant } from '../../context/TenantContext';
import { getInitialCustomerProductFields } from '../../constants/wadaanaProducts';

const initialFormData = {
  name: '',
  phone: '',
  type: 'Home',
  mapLink: '',
  securityDeposit: 0,
  currentBalance: 0,
  creditDuration: 1,
  remarks: '',
  homePictureUrl: '',
  ...getInitialCustomerProductFields()
};

export default function AddCustomerModal({ isOpen, onClose, onCustomerAdded }) {
  const { tenant } = useTenant();
  const isWadaana = tenant === 'wadaana';

  const [formData, setFormData] = useState(initialFormData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const processImageFile = useCallback((file) => {
    if (!file) return false;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Only JPEG, PNG, and WEBP images are allowed');
      return false;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return false;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
    return true;
  }, []);

  // Global clipboard paste listener (Ctrl+V) when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e) => {
      const items = e.clipboardData?.items || [];
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            if (processImageFile(file)) {
              toast.success('Customer photo pasted from clipboard!');
            }
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, processImageFile]);

  if (!isOpen) return null;

  const handlePasteFromClipboard = async () => {
    try {
      if (!navigator.clipboard?.read) {
        toast.info('Press Ctrl+V anywhere in this window to paste your copied photo.');
        return;
      }
      const clipboardItems = await navigator.clipboard.read();
      let foundImage = false;
      for (const item of clipboardItems) {
        const imageType = item.types.find((t) => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const ext = imageType.split('/')[1] || 'png';
          const file = new File([blob], `pasted_customer_photo.${ext}`, { type: imageType });
          if (processImageFile(file)) {
            toast.success('Customer photo loaded from clipboard!');
            foundImage = true;
          }
          break;
        }
      }
      if (!foundImage) {
        toast.info('No image found in clipboard. Copy an image first, then press Ctrl+V.');
      }
    } catch (_err) {
      toast.info('Clipboard access restricted by browser. Simply press Ctrl+V to paste.');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    processImageFile(file);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setFormData(prev => ({ ...prev, homePictureUrl: '' }));
  };

  const uploadImageToCloudinary = async () => {
    if (!imageFile) return null;
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append('image', imageFile);

      const res = await fetch(`${API}/customers/upload-picture`, {
        method: 'POST',
        headers: { 'x-tenant': tenant },
        body: fd,
        credentials: 'include'
      });

      const json = await res.json();
      const uploadedUrl = json.data?.homePictureUrl || json.homePictureUrl;
      if (json.success && uploadedUrl) return uploadedUrl;
      toast.error(json.message || 'Failed to upload image');
      return null;
    } catch {
      toast.error('Error uploading image');
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.mapLink) {
      const isValid = ['maps.google.com', 'google.com/maps', 'goo.gl', 'maps.app.goo.gl'].some((d) =>
        formData.mapLink.includes(d)
      );
      if (!isValid) {
        setError('Please enter a valid Google Maps URL (e.g. maps.google.com, google.com/maps, or goo.gl)');
        return;
      }
    }

    setSaving(true);
    setError('');

    try {
      let uploadedImageUrl = formData.homePictureUrl;
      if (imageFile) {
        uploadedImageUrl = await uploadImageToCloudinary();
        if (!uploadedImageUrl) {
          toast.error('Failed to upload image. Please try again.');
          setSaving(false);
          return;
        }
      }

      const res = await fetch(`${API}/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant': tenant
        },
        body: JSON.stringify({
          ...formData,
          homePictureUrl: uploadedImageUrl,
          securityDeposit: formData.securityDeposit ? parseInt(formData.securityDeposit) : 0,
          currentBalance: formData.currentBalance ? parseFloat(formData.currentBalance) : 0,
          creditDuration: formData.creditDuration ? parseInt(formData.creditDuration) : 1
        }),
        credentials: 'include'
      });
      const json = await res.json();
      if (json.success || res.ok) {
        toast.success('Customer created successfully.');
        setFormData(initialFormData);
        setImageFile(null);
        setImagePreview(null);
        if (onCustomerAdded) onCustomerAdded(json.data);
        onClose();
      } else {
        toast.error(json.message || 'Failed to add customer');
        setError(json.message || 'Failed to add customer');
      }
    } catch {
      toast.error('Network error. Please try again.');
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center z-10">
          <div className="flex items-center gap-2">
            <UserPlus size={20} className={isWadaana ? 'text-[#0ea5e9]' : 'text-emerald-600'} />
            <h3 className="text-lg font-bold text-slate-800">Add New Customer</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Shared Form Fields */}
          <CustomerFormFields
            formData={formData}
            handleChange={handleChange}
            isWadaana={isWadaana}
          />

          {/* Photo Upload Section */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon size={14} className="text-slate-500" /> Customer / House Photo
              </h4>
              <button
                type="button"
                onClick={handlePasteFromClipboard}
                className="text-xs font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
                title="Paste image directly from clipboard (or press Ctrl+V)"
              >
                <Clipboard size={12} />
                <span>Paste (Ctrl+V)</span>
              </button>
            </div>
            {imagePreview ? (
              <div className="relative w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-emerald-400 to-teal-500 shadow-md">
                <div className="w-full h-full rounded-full bg-white p-0.5 overflow-hidden">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-full" />
                </div>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-0 right-0 p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-md transition"
                  title="Remove Image"
                >
                  <X size={13} />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 rounded-xl hover:border-emerald-500 cursor-pointer transition bg-slate-50/50 hover:bg-emerald-50/20">
                  <Upload size={22} className="text-slate-400 mb-1" />
                  <span className="text-xs font-semibold text-slate-600">Upload Photo File</span>
                  <span className="text-[10px] text-slate-400">JPEG, PNG, WEBP max 5MB</span>
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
                <button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 rounded-xl hover:border-emerald-500 cursor-pointer transition bg-slate-50/50 hover:bg-emerald-50/20 group text-left"
                  title="Click to paste from clipboard or press Ctrl+V"
                >
                  <Clipboard size={22} className="text-slate-400 group-hover:text-emerald-600 mb-1 transition-colors" />
                  <span className="text-xs font-semibold text-slate-600 group-hover:text-emerald-700 transition-colors">Paste from Clipboard</span>
                  <span className="text-[10px] text-slate-400 text-center">Copy from WhatsApp, then press Ctrl+V</span>
                </button>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploadingImage}
              className="btn-primary"
            >
              {saving ? 'Saving...' : 'Save Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
