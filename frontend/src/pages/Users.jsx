import { useState, useEffect, useCallback } from 'react';
import { Plus, X, Search, ShieldCheck, Mail } from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import { API_URL } from '../utils/api';

export default function Users() {
  const { tenant, isWadaana } = useTenant();

  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // New/Edit User Form State
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', role: 'ADMIN', company: tenant, isActive: true
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/users?company=${tenant}`, { credentials: 'include' });
      const json = await res.json();
      if (json.success) setUsers(json.data || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tenant]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openAddModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({ name: '', email: '', password: '', role: 'ADMIN', company: tenant, isActive: true });
    setIsModalOpen(true);
  };

  const openEditModal = (u) => {
    setIsEditing(true);
    setEditingId(u.id);
    setFormData({ 
      name: u.name || '', 
      email: u.email || '', 
      password: '', // blank password for editing
      role: u.role || 'ADMIN', 
      company: tenant,
      isActive: u.isActive !== false
    });
    setIsModalOpen(true);
  };

  const submitUser = async (e) => {
    e.preventDefault();
    if (isEditing) {
      const payload = { ...formData };
      if (!payload.password) delete payload.password;
      
      await fetch(`${API_URL}/users/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      });
    } else {
      await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include'
      });
    }
    setIsModalOpen(false);
    fetchUsers();
  };

  const toggleStatus = async (id, currentStatus) => {
    await fetch(`${API_URL}/users/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company: tenant, isActive: !currentStatus }),
      credentials: 'include'
    });
    fetchUsers();
  };

  const filteredUsers = users.filter(u => 
    (u.name || '').toLowerCase().includes(search.toLowerCase()) || 
    (u.email || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="badge-brand">
              {isWadaana ? 'WADAANA' : 'AQUASPHERE'}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight mt-1">Users & Roles</h2>
          <p className="text-slate-500 text-xs sm:text-sm">Manage employee accounts and operational system access</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button 
            onClick={openAddModal}
            className="btn-primary flex items-center gap-1.5 text-xs font-bold py-2 px-3.5"
          >
            <Plus size={16} /> Add User
          </button>
        </div>
      </div>
      
      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input 
          type="search" 
          placeholder="Search by name or email..." 
          className="input-base pl-9 text-xs py-2 w-full"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Users Table */}
      <div className="table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr>
                <th className="table-th">User</th>
                <th className="table-th">Contact</th>
                <th className="table-th">Role</th>
                <th className="table-th">Status</th>
                <th className="table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="p-10 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-slate-200 border-t-brand-primary rounded-full animate-spin"></div>
                      <p className="text-xs">Loading users...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-10 text-center text-slate-400 text-sm">No users found.</td>
                </tr>
              ) : (
                filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="table-td">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-brand-light text-brand-primary flex items-center justify-center font-bold text-xs">
                        {(u.name || u.email).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 text-sm">{u.name || 'N/A'}</div>
                        <div className="text-[11px] text-slate-400 font-normal">Joined {new Date(u.createdAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </td>
                  <td className="table-td text-xs text-slate-600 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Mail size={13} className="text-slate-400" /> {u.email}
                    </div>
                  </td>
                  <td className="table-td">
                    <span className="badge-neutral inline-flex items-center gap-1 text-[11px] font-bold">
                      <ShieldCheck size={12} className="text-brand-primary" /> {u.role}
                    </span>
                  </td>
                  <td className="table-td">
                    {u.isActive ? (
                      <span className="badge-success text-[11px]">Active</span>
                    ) : (
                      <span className="badge-danger text-[11px]">Archived</span>
                    )}
                  </td>
                  <td className="table-td text-right">
                    <div className="flex justify-end gap-1.5">
                      <button 
                        onClick={() => openEditModal(u)} 
                        className="btn-outline text-xs py-1 px-2.5"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => toggleStatus(u.id, u.isActive)} 
                        className={`text-xs py-1 px-2.5 rounded-xl font-bold transition border ${
                          u.isActive 
                            ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100' 
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        {u.isActive ? 'Archive' : 'Restore'}
                      </button>
                    </div>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="card-surface w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl p-0">
            <div className="sticky top-0 bg-slate-50/80 backdrop-blur-xs border-b border-slate-100 px-5 py-4 flex justify-between items-center z-10">
              <div>
                <h3 className="text-base font-bold text-slate-800">{isEditing ? 'Edit User' : 'Add New User'}</h3>
                <span className="badge-brand mt-0.5">
                  {isWadaana ? 'WADAANA' : 'AQUASPHERE'}
                </span>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={submitUser} className="p-5 space-y-4">
              {/* Basic Info */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Account Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Full Name</label>
                    <input name="name" className="input-base text-xs py-2 w-full" value={formData.name} onChange={handleChange} required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Email Address *</label>
                    <input name="email" type="email" className="input-base text-xs py-2 w-full" value={formData.email} onChange={handleChange} required />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      {isEditing ? 'New Password (leave blank to keep current)' : 'Password *'}
                    </label>
                    <input name="password" type="password" className="input-base text-xs py-2 w-full" value={formData.password} onChange={handleChange} required={!isEditing} />
                  </div>
                </div>
              </div>

              {/* Roles & Access */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Roles & Access</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">System Role *</label>
                    <select name="role" className="select-base text-xs py-2 w-full" value={formData.role} onChange={handleChange}>
                      <option value="OWNER">Owner (Full Access)</option>
                      <option value="ADMIN">Admin (Manager)</option>
                      <option value="PRODUCTION_MANAGER">Production Manager</option>
                      <option value="ACCOUNTANT">Accountant</option>
                      <option value="DRIVER">Driver (Limited Access)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Assigned Company *</label>
                    <select name="company" className="select-base text-xs py-2 w-full" value={formData.company} onChange={handleChange}>
                      <option value="aquasphere">AquaSphere (Water Business)</option>
                      <option value="wadaana">Wadaana (Blowing Machine)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary text-xs py-2 px-3.5">
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs py-2 px-4">
                  {isEditing ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
