export { default } from '../features/inventory/RawMaterials';
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
  }, [includeArchived]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleToggleArchive = async (item) => {
    const isArchived = !!item.archivedAt;
    const action = isArchived ? 'restore' : 'archive';
    if (!confirm(`Are you sure you want to ${action} "${item.name}"?`)) return;

    try {
      await fetch(`${API}/items/${item.id}/${action}`, {
        method: 'PATCH',
        headers: { 'x-tenant': tenant },
        credentials: 'include'
      });
      fetchMaterials();
    } catch (err) {
      alert(`Failed to ${action} material`);
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
      />

      <RawMaterialsTable 
        materials={filteredMaterials}
        isLoading={isLoading}
        onEdit={handleOpenEdit}
        onToggleArchive={handleToggleArchive}
        tenant={tenant}
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
