import { useState, useEffect } from 'react';
import { Plus, X, Search, User, Briefcase, Building, ShieldCheck, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // New/Edit User Form State
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', role: 'ADMIN', company: 'aquasphere', isActive: true
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    // Fetch users for both companies since the owner might want to see both
    // If not owner, just fetch current company
    const companyToFetch = currentUser?.role === 'OWNER' ? 'aquasphere' : currentUser?.company || 'aquasphere';
    const res = await fetch(`${import.meta.env.VITE_API_URL}/users?company=${companyToFetch}`, { credentials: 'include' });
    const json = await res.json();
    if (json.success) setUsers(json.data);
    setIsLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openAddModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({ name: '', email: '', password: '', role: 'ADMIN', company: 'aquasphere', isActive: true });
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
      company: 'aquasphere', // assuming fetching from current context
      isActive: u.isActive !== false
    });
    setIsModalOpen(true);
  };

  const submitUser = async (e) => {
    e.preventDefault();
    if (isEditing) {
      const payload = { ...formData };
      if (!payload.password) delete payload.password; // Don't send empty password if not changing
      
      await fetch(`${import.meta.env.VITE_API_URL}/users/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      });
    } else {
      await fetch(`${import.meta.env.VITE_API_URL}/users`, {
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
    await fetch(`${import.meta.env.VITE_API_URL}/users/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company: 'aquasphere', isActive: !currentStatus }),
      credentials: 'include'
    });
    fetchUsers();
  };

  const filteredUsers = users.filter(u => 
    (u.name || '').toLowerCase().includes(search.toLowerCase()) || 
    (u.email || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Users & Roles</h2>
          <p className="text-slate-500 text-sm">Manage system access, roles, and employee accounts</p>
        </div>
        <button 
          onClick={openAddModal}
          className="bg-[#0ea5e9] hover:bg-[#0284c7] text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <Plus size={20} /> Add User
        </button>
      </div>
      
      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="search" 
          placeholder="Search by name or email..." 
          className="w-full border border-slate-200 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] transition-all bg-white"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 font-semibold text-slate-600 text-sm">User</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Contact</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Role</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Status</th>
                <th className="p-4 font-semibold text-slate-600 text-sm text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 border-4 border-[#0ea5e9] border-t-transparent rounded-full animate-spin"></div>
                      <p>Loading users...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-slate-500">No users found.</td>
                </tr>
              ) : (
                filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                        {(u.name || u.email).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800">{u.name || 'N/A'}</div>
                        <div className="text-xs text-slate-500 mt-1">Joined: {new Date(u.createdAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-slate-600 text-sm mb-1">
                      <Mail size={14} className="text-slate-400" /> {u.email}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="bg-purple-100 text-purple-700 font-bold px-2.5 py-1 rounded-md text-xs inline-flex items-center gap-1 uppercase">
                      <ShieldCheck size={14} /> {u.role}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                      u.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {u.isActive ? 'Active' : 'Archived'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEditModal(u)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 text-xs rounded-md font-medium transition-colors">
                        Edit
                      </button>
                      <button 
                        onClick={() => toggleStatus(u.id, u.isActive)} 
                        className={`${u.isActive ? 'bg-red-100 hover:bg-red-200 text-red-600' : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-600'} px-3 py-1.5 text-xs rounded-md font-medium transition-colors`}
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center z-10">
              <h3 className="text-lg font-bold text-slate-800">{isEditing ? 'Edit User' : 'Add New User'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={submitUser} className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Account Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                    <input name="name" className="w-full border border-slate-200 rounded-lg p-2.5 focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] outline-none" value={formData.name} onChange={handleChange} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email Address *</label>
                    <input name="email" type="email" className="w-full border border-slate-200 rounded-lg p-2.5 focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] outline-none" value={formData.email} onChange={handleChange} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {isEditing ? 'New Password (leave blank to keep current)' : 'Password *'}
                    </label>
                    <input name="password" type="password" className="w-full border border-slate-200 rounded-lg p-2.5 focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] outline-none" value={formData.password} onChange={handleChange} required={!isEditing} />
                  </div>
                </div>
              </div>

              {/* Roles & Access */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Roles & Access</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">System Role *</label>
                    <select name="role" className="w-full border border-slate-200 rounded-lg p-2.5 focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] outline-none" value={formData.role} onChange={handleChange}>
                      <option value="OWNER">Owner (Full Access)</option>
                      <option value="ADMIN">Admin (Manager)</option>
                      <option value="PRODUCTION_MANAGER">Production Manager</option>
                      <option value="ACCOUNTANT">Accountant</option>
                      <option value="DRIVER">Driver (Limited Access)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Assigned Company *</label>
                    <select name="company" className="w-full border border-slate-200 rounded-lg p-2.5 focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] outline-none" value={formData.company} onChange={handleChange}>
                      <option value="aquasphere">AQUA Sphere (Water Business)</option>
                      <option value="wadaana">Wadaana (Blowing Machine)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-50 rounded-lg transition-colors">
                  Cancel
                </button>
                <button type="submit" className="bg-[#0ea5e9] hover:bg-[#0284c7] text-white px-6 py-2.5 rounded-lg font-medium shadow-sm transition-colors">
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
