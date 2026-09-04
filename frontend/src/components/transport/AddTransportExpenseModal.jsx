import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import Modal from '../ui/Modal';
import { API_URL } from '../../utils/api';
import { getCompanyFromCookie } from '../../utils/companyCookie';

export default function AddTransportExpenseModal({
  isOpen,
  onClose,
  onSuccess,
  vehicles = [],
  preselectedVehicleId = '',
  isWadaana = false
}) {
  const [vehicleId, setVehicleId] = useState('');
  const [type, setType] = useState('DAILY');
  const [period, setPeriod] = useState('MONTHLY');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setVehicleId(preselectedVehicleId || (vehicles.length > 0 ? vehicles[0].id : ''));
      setType('DAILY');
      setPeriod('MONTHLY');
      setAmount('');
      const now = new Date();
      const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      setDate(localDate);
      setNote('');
    }
  }, [isOpen, preselectedVehicleId, vehicles]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!vehicleId) {
      toast.error('Please select a vehicle');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid amount greater than 0');
      return;
    }

    setSubmitting(true);
    const tenant = getCompanyFromCookie();

    try {
      const res = await fetch(`${API_URL}/transport-expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant': tenant
        },
        credentials: 'include',
        body: JSON.stringify({
          vehicleId,
          type,
          period,
          amount: parsedAmount,
          date: date || new Date().toISOString(),
          note: note.trim() || undefined
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to create transport expense');
      }

      toast.success('Transport expense added successfully');
      if (onSuccess) onSuccess(json.data);
      onClose();
    } catch (err) {
      toast.error(err.message || 'An error occurred while saving expense');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Transport Expense" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Vehicle Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Vehicle <span className="text-rose-500">*</span>
          </label>
          <select
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            required
            className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-medium outline-none focus:border-emerald-500 bg-white"
          >
            <option value="" disabled>Select vehicle</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.plateNumber})
              </option>
            ))}
          </select>
        </div>

        {/* Expense Type & Period */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Type <span className="text-rose-500">*</span>
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              required
              className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-medium outline-none focus:border-emerald-500 bg-white"
            >
              <option value="DAILY">Daily (Fuel/Oil)</option>
              <option value="REPAIRS">Repairs & Maintenance</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Period <span className="text-rose-500">*</span>
            </label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              required
              className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-medium outline-none focus:border-emerald-500 bg-white"
            >
              <option value="MONTHLY">Monthly</option>
            </select>
          </div>
        </div>

        {/* Amount & Date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Amount (Rs) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              step="any"
              placeholder="e.g. 2500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-medium outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-medium outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Note / Remarks */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Note / Description
          </label>
          <textarea
            rows={2}
            placeholder="Details about fuel quantity, maintenance work, or parts replaced..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-medium outline-none focus:border-emerald-500 resize-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition shadow-xs"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className={`px-5 py-2.5 ${
              isWadaana ? 'bg-[#0ea5e9] hover:bg-sky-500' : 'bg-emerald-600 hover:bg-emerald-500'
            } text-white font-bold text-sm rounded-xl shadow-md transition flex items-center gap-2 disabled:opacity-50`}
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            Save Expense
          </button>
        </div>
      </form>
    </Modal>
  );
}
