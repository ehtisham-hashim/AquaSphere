import { useState, useEffect, useMemo, useCallback } from 'react';
import { RawMaterialsHeader, RawMaterialsTable, AddEditRawMaterialModal } from '../components/rawMaterials';
import { toast } from 'sonner';
import { getCompanyFromCookie } from '../utils/companyCookie';
import { API_URL } from '../utils/api';

import { useAuth } from '../context/AuthContext';

const API = API_URL;

export default function RawMaterials() {
  const { user } = useAuth();
  // Only OWNER and PRODUCTION_MANAGER can create/edit raw material items. ACCOUNTANT and MARKETING_MANAGER are read-only.
  const canManageItems = ['OWNER', 'PRODUCTION_MANAGER'].includes(user?.role);
  const isReadOnly = !canManageItems;
  const tenant = getCompanyFromCookie();
  const [materials, setMaterials] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const fetchMaterials = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API}/items?type=RAW_MATERIAL&includeArchived=${includeArchived}`, {
        headers: { 'x-tenant': tenant },
        credentials: 'include'
      });
      const json = await res.json();
      if (json.success || res.ok) {
        setMaterials(json.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch raw materials:', err);
    } finally {
      setIsLoading(false);
    }
  }, [includeArchived, tenant]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  const handleOpenAdd = () => {
    if (isReadOnly) {
      toast.error('You do not have permission to add materials directly');
      return;
    }
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    if (isReadOnly) {
      toast.error('You do not have permission to edit materials directly');
      return;
    }
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleToggleArchive = async (item) => {
    if (isReadOnly) {
      toast.error('You do not have permission to archive or delete materials');
      return;
    }
    const isArchived = !!item.archivedAt;
    const action = isArchived ? 'restore' : 'archive';
    if (!confirm(`Are you sure you want to ${action} "${item.name}"?`)) return;

    try {
      const res = await fetch(`${API}/items/${item.id}/${action}`, {
        method: 'PATCH',
        headers: { 'x-tenant': tenant },
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Material ${action}d successfully`);
        fetchMaterials();
      } else {
        toast.error(data.message || `Only Owner and Production Manager can ${action} materials`);
      }
    } catch (err) {
      toast.error(`Failed to ${action} material`);
    }
  };

  const filteredMaterials = useMemo(() => {
    return materials.filter(m =>
      m.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [materials, search]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <RawMaterialsHeader 
        search={search}
        onSearchChange={setSearch}
        includeArchived={includeArchived}
        onToggleArchived={setIncludeArchived}
        onOpenAdd={handleOpenAdd}
        tenant={tenant}
        isReadOnly={isReadOnly}
      />

      <RawMaterialsTable 
        materials={filteredMaterials}
        isLoading={isLoading}
        onEdit={handleOpenEdit}
        onToggleArchive={handleToggleArchive}
        tenant={tenant}
        isReadOnly={isReadOnly}
      />

      <AddEditRawMaterialModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={() => {
          setIsModalOpen(false);
          fetchMaterials();
        }}
        editingItem={editingItem}
        tenant={tenant}
      />
    </div>
  );
}
