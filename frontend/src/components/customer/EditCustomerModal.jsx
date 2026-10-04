import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { X, Edit3, Upload, Image as ImageIcon } from 'lucide-react';
import { API_URL as API } from '../../utils/api';
import CustomerFormFields from './CustomerFormFields';
import { useTenant } from '../../context/TenantContext';
import { extractCustomerProductFields } from '../../constants/wadaanaProducts';

export default function EditCustomerModal({ isOpen, customer, onClose, onCustomerUpdated }) {
  const { tenant } = useTenant();
  const isWadaana = tenant === 'wadaana';

  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (customer && isOpen) {
      setFormData({
        name: customer.name || '',
        phone: customer.phone || '',
        type: customer.type || 'Home',
        address: customer.address || '',
        mapLink: customer.mapLink || '',
        securityDeposit: customer.deposit !== undefined ? parseInt(customer.deposit) : (customer.securityDeposit !== undefined ? parseInt(customer.securityDeposit) : 0),
        currentBalance: customer.currentBalance !== undefined ? parseFloat(customer.currentBalance) : 0,
        creditDuration: customer.creditDuration || 1,
        remarks: customer.remarks || '',
        homePictureUrl: customer.homePictureUrl || '',
        ...extractCustomerProductFields(customer)
      });
      setImagePreview(customer.homePictureUrl || null);
      setImageFile(null);
      setError('');
    }
  }, [customer, isOpen]);

  if (!isOpen || !customer) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Only JPEG, PNG, and WEBP images are allowed');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
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
      const validDomains = ['maps.google.com', 'google.com/maps', 'goo.gl', 'maps.app.goo.gl'];
      const isValid = validDomains.some((d) => formData.mapLink.includes(d));
      if (!isValid) {
        const msg = 'Invalid Google Maps Link. Must contain maps.google.com, google.com/maps, or goo.gl';
        setError(msg);
        toast.error(msg);
        return;
      }
    }

    setSaving(true);
    setError('');

    try {
      let finalPictureUrl = formData.homePictureUrl;
      if (imageFile) {
        finalPictureUrl = await uploadImageToCloudinary();
        if (!finalPictureUrl) {
          setSaving(false);
          return;
        }
      }

      const res = await fetch(`${API}/customers/${customer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant': tenant
        },
        body: JSON.stringify({
          ...formData,
          homePictureUrl: finalPictureUrl,
          securityDeposit: formData.securityDeposit !== undefined && formData.securityDeposit !== '' ? parseInt(formData.securityDeposit) : 0,
          currentBalance: formData.currentBalance !== undefined && formData.currentBalance !== '' ? parseFloat(formData.currentBalance) : 0,
          creditDuration: formData.creditDuration ? parseInt(formData.creditDuration) : 1
        }),
        credentials: 'include'
      });
      const json = await res.json();
      if (json.success || res.ok) {
        toast.success('Customer updated successfully!');
        if (onCustomerUpdated) onCustomerUpdated(json.data || { ...customer, ...formData, homePictureUrl: finalPictureUrl });
        onClose();
      } else {
        toast.error(json.message || 'Failed to update customer');
        setError(json.message || 'Failed to update customer');
      }
    } catch (err) {
      console.error('Update Customer Error:', err);
      toast.error('Network error while updating customer');
      setError('Network error while updating customer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center z-10">
          <div className="flex items-center gap-2">
            <Edit3 size={20} className={isWadaana ? 'text-[#0ea5e9]' : 'text-emerald-600'} />
            <h3 className="text-lg font-bold text-slate-800">Edit Customer Details</h3>
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

          {/* Customer Photo Upload Section */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <ImageIcon size={14} className="text-slate-500" /> Customer / House Photo
            </h4>
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
              <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 rounded-xl hover:border-emerald-500 cursor-pointer transition">
                <Upload size={24} className="text-slate-400 mb-1" />
                <span className="text-xs font-semibold text-slate-600">Upload Customer Photo</span>
                <span className="text-[10px] text-slate-400">JPEG, PNG, WEBP max 5MB</span>
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>
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
              {saving || uploadingImage ? 'Saving...' : 'Update Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
