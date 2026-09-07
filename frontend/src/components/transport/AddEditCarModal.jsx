import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import Modal from '../ui/Modal';
import { API_URL } from '../../utils/api';
import { useTenant } from '../../context/TenantContext';

export default function AddEditCarModal({
  isOpen,
  onClose,
  onSuccess,
  vehicle = null
}) {
  const { tenant, isWadaana } = useTenant();
  const [name, setName] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [model, setModel] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (vehicle) {
        setName(vehicle.name || '');
        setPlateNumber(vehicle.plateNumber || '');
        setModel(vehicle.model || '');
        setIsActive(vehicle.isActive ?? true);
      } else {
        setName('');
        setPlateNumber('');
        setModel('');
        setIsActive(true);
      }
    }
  }, [isOpen, vehicle]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Vehicle name is required');
      return;
    }

    if (!plateNumber.trim()) {
      toast.error('Plate number is required');
      return;
    }

    setSubmitting(true);
    const isEdit = Boolean(vehicle?.id);

    try {
      const url = isEdit ? `${API_URL}/vehicles/${vehicle.id}` : `${API_URL}/vehicles`;
      const method = isEdit ? 'PUT' : 'POST';

      const payload = {
        name: name.trim(),
        plateNumber: plateNumber.trim(),
        model: model.trim() || null,
        ...(isEdit && { isActive })
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-tenant': tenant
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || `Failed to ${isEdit ? 'update' : 'create'} vehicle`);
      }

      toast.success(`Vehicle ${isEdit ? 'updated' : 'added'} successfully`);
      if (onSuccess) onSuccess(json.data);
      onClose();
    } catch (err) {
      toast.error(err.message || 'An error occurred while saving vehicle');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={vehicle ? `Edit Vehicle: ${vehicle.name}` : 'Add New Vehicle'}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* Vehicle Name */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Vehicle Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Suzuki Carry, Shehzore, Bolan"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="input-base text-xs py-2 w-full"
          />
        </div>

        {/* Plate Number */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Plate Number <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. LHR-1234, LE-20-456"
            value={plateNumber}
            onChange={(e) => setPlateNumber(e.target.value)}
            required
            className="input-base text-xs py-2 w-full font-mono font-bold"
          />
        </div>

        {/* Model / Make Details */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Model / Description (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. 2022 White Pickup, Euro II"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="input-base text-xs py-2 w-full"
          />
        </div>

        {/* Active Toggle (when editing) */}
        {vehicle && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <p className="text-xs font-bold text-slate-800">Vehicle Active Status</p>
              <p className="text-[11px] text-slate-500">Inactive vehicles are hidden from standard operations</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className={`w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all ${
                isWadaana ? 'peer-checked:bg-[#0284c7]' : 'peer-checked:bg-emerald-600'
              }`}></div>
            </label>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="btn-secondary text-xs py-2 px-3.5"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 disabled:opacity-50"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            {vehicle ? 'Save Changes' : 'Add Vehicle'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
