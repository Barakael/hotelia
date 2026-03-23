import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useStore } from '@/contexts/StoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesApi, ShopCategory, stockMovementsApi } from '@/services/api';
import { formatCurrency } from '@/data/mockData';
import { Product } from '@/types';
import {
  Search, Plus, Edit2, Trash2, Package, AlertTriangle, Save, Tag, ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

type Tab = 'products' | 'categories';

const emptyProduct = {
  name: '',
  barcode: '',
  price: 0,
  stock: 0,
  category: '',
  lowStockThreshold: 10,
  isSellableTransfer: true,
};

const Inventory = () => {
  const { products, addProduct, updateProduct, deleteProduct } = useStore();
  const { user } = useAuth();
  const qc = useQueryClient();
  const isOutletDesk = user?.role === 'bar' || user?.role === 'fnb';
  const canManage = user?.role === 'owner' || user?.role === 'super_admin' || user?.role === 'storekeeper';
  const canEditOutletPrice = isOutletDesk;

  const [tab, setTab] = useState<Tab>('products');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyProduct);
  const [filter, setFilter] = useState<'all' | 'low'>('all');
  const [newCatName, setNewCatName] = useState('');
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustType, setAdjustType] = useState('adjustment');
  const [adjustNote, setAdjustNote] = useState('');

  // ── Categories from API ──────────────────────────────────────────────────
  const { data: apiCategories = [], isLoading: catsLoading } = useQuery<ShopCategory[]>({
    queryKey: ['categories'],
    queryFn: categoriesApi.getAll,
  });

  const allCategoryNames = [
    ...new Set([
      ...apiCategories.map(c => c.name),
      ...products.map(p => p.category).filter(Boolean),
    ]),
  ].sort();

  const addCategoryMutation = useMutation({
    mutationFn: (name: string) => categoriesApi.create(name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      setNewCatName('');
      toast.success('Category added');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: number) => categoriesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category removed');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const filtered = products
    .filter(p => filter === 'low' ? p.stock <= p.lowStockThreshold : true)
    .filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode.includes(search) ||
      p.category.toLowerCase().includes(search.toLowerCase())
    );

  const openAdd = () => {
    setEditingProduct(null);
    setForm(emptyProduct);
    setShowForm(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      barcode: product.barcode,
      price: product.price,
      stock: product.stock,
      category: product.category,
      lowStockThreshold: product.lowStockThreshold,
      isSellableTransfer: product.isSellableTransfer ?? false,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (isOutletDesk && editingProduct) {
      try {
        await updateProduct(editingProduct.id, {
          price: form.price,
          lowStockThreshold: form.lowStockThreshold,
        });
        toast.success('Outlet product updated');
        setShowForm(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to save product.');
      }
      return;
    }
    if (!form.name || !form.barcode || !form.category || form.price <= 0) {
      toast.error(!form.category ? 'Category is required' : 'Please fill all required fields (name, barcode, price > 0, category)');
      return;
    }
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, form);
        toast.success('Product updated');
      } else {
        await addProduct(form);
        toast.success('Product added');
      }
      setShowForm(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save product.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Delete "${name}"?`)) {
      try {
        await deleteProduct(id);
        toast.success('Product deleted');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to delete product.');
      }
    }
  };

  const handleAddCategory = () => {
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    addCategoryMutation.mutate(trimmed);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {isOutletDesk ? 'Outlet inventory' : 'Store inventory'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isOutletDesk
                ? `${products.length} sellable items · ${products.reduce((s, p) => s + p.stock, 0)} units on this desk (from acknowledged issues)`
                : `${products.length} products · ${products.reduce((s, p) => s + p.stock, 0)} store units · tools stay here unless marked transferable`}
            </p>
          </div>
          {canManage && !isOutletDesk && tab === 'products' && (
            <Button onClick={openAdd} className="gap-2">
              <Plus className="w-4 h-4" /> Add Product
            </Button>
          )}
        </div>

        {/* Tab switcher — categories are store master data */}
        {!isOutletDesk && (
          <div className="flex gap-2 border-b border-border pb-0">
            {(['products', 'categories'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                  tab === t
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {t === 'products' ? (
                  <span className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5" /> Products</span>
                ) : (
                  <span className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" /> Categories</span>
                )}
              </button>
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* ── PRODUCTS TAB ─────────────────────────────────────────── */}
          {tab === 'products' && (
            <motion.div
              key="products"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, barcode, or category…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')}>All</Button>
                  <Button variant={filter === 'low' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('low')} className="gap-1">
                    <AlertTriangle className="w-3 h-3" /> Low Stock
                  </Button>
                </div>
              </div>

              {/* Product Table — mobile: Product, Price, Stock (+ Actions for owners) */}
              <div className="glass-card rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left text-xs font-semibold text-muted-foreground px-3 sm:px-4 py-3">Product</th>
                        <th className="hidden md:table-cell text-left text-xs font-semibold text-muted-foreground px-4 py-3">Barcode</th>
                        <th className="hidden md:table-cell text-left text-xs font-semibold text-muted-foreground px-4 py-3">Category</th>
                        <th className="text-right text-xs font-semibold text-muted-foreground px-3 sm:px-4 py-3">Price</th>
                        <th className="text-right text-xs font-semibold text-muted-foreground px-3 sm:px-4 py-3">Stock</th>
                        {!isOutletDesk && (
                          <th className="hidden sm:table-cell text-left text-xs font-semibold text-muted-foreground px-4 py-3">Transfer</th>
                        )}
                        <th className="text-right text-xs font-semibold text-muted-foreground px-2 sm:px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((product, i) => (
                        <motion.tr
                          key={product.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.03 }}
                          className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                        >
                          <td className="px-3 sm:px-4 py-3">
                            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shrink-0">
                                <Package className="w-4 h-4 text-accent-foreground" />
                              </div>
                              <div className="min-w-0">
                                <span className="text-sm font-medium text-foreground truncate block">{product.name}</span>
                                {!isOutletDesk && !product.isSellableTransfer && (
                                  <span className="text-[10px] text-muted-foreground">Store tool / supply</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="hidden md:table-cell px-4 py-3 text-sm font-mono text-muted-foreground">{product.barcode}</td>
                          <td className="hidden md:table-cell px-4 py-3">
                            <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                              {product.category}
                            </span>
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-sm text-right font-medium text-foreground whitespace-nowrap">
                            {formatCurrency(product.price)}
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-right">
                            <span className={`text-sm font-bold ${product.stock <= product.lowStockThreshold ? 'text-destructive' : 'text-foreground'}`}>
                              {product.stock}
                            </span>
                          </td>
                          {!isOutletDesk && (
                            <td className="hidden sm:table-cell px-4 py-3 text-xs">
                              {product.isSellableTransfer ? (
                                <span className="text-[#007AAD]">Can issue to desks</span>
                              ) : (
                                <span className="text-muted-foreground">Store only</span>
                              )}
                            </td>
                          )}
                          <td className="px-2 sm:px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1 flex-wrap">
                              {(canManage || canEditOutletPrice) && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openEdit(product)}
                                  className="h-8 gap-1 px-2"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                  <span className="hidden xs:inline sm:inline">Edit</span>
                                </Button>
                              )}
                              {canManage && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDelete(product.id, product.name)}
                                  className="h-8 gap-1 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Delete
                                </Button>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filtered.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground text-sm">No products found</div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── CATEGORIES TAB ───────────────────────────────────────── */}
          {tab === 'categories' && (
            <motion.div
              key="categories"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              {canManage && (
                <div className="glass-card rounded-xl p-5">
                  <h3 className="text-sm font-semibold mb-3">Add New Category</h3>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. Beverages, Dairy, Electronics…"
                      value={newCatName}
                      onChange={e => setNewCatName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleAddCategory}
                      disabled={!newCatName.trim() || addCategoryMutation.isPending}
                      className="gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      {addCategoryMutation.isPending ? 'Adding…' : 'Add'}
                    </Button>
                  </div>
                </div>
              )}

              <div className="glass-card rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-border">
                  <h3 className="text-sm font-semibold">
                    Your Categories
                    <span className="ml-2 text-xs text-muted-foreground font-normal">({apiCategories.length})</span>
                  </h3>
                </div>
                {catsLoading ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>
                ) : apiCategories.length === 0 ? (
                  <div className="p-8 text-center">
                    <Tag className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                    <p className="text-sm text-muted-foreground">No categories yet.</p>
                    {canManage && <p className="text-xs text-muted-foreground mt-1">Add your first category above.</p>}
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {apiCategories.map(cat => {
                      const productCount = products.filter(p => p.category === cat.name).length;
                      return (
                        <motion.div
                          key={cat.id}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center justify-between px-5 py-3 hover:bg-muted/20 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Tag className="w-3.5 h-3.5 text-primary" />
                            </span>
                            <span className="text-sm font-medium">{cat.name}</span>
                            <span className="text-xs text-muted-foreground">{productCount} product{productCount !== 1 ? 's' : ''}</span>
                          </div>
                          {canManage && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                if (confirm(`Delete category "${cat.name}"?`)) {
                                  deleteCategoryMutation.mutate(cat.id);
                                }
                              }}
                              disabled={deleteCategoryMutation.isPending}
                              className="h-8 gap-1 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete
                            </Button>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Pill buttons for product categories not yet in API list */}
              {allCategoryNames.filter(n => !apiCategories.some(c => c.name === n)).length > 0 && (
                <div className="rounded-xl border border-dashed border-border p-4">
                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                    <ChevronDown className="w-3 h-3" />
                    Categories used in existing products (click to save):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {allCategoryNames
                      .filter(n => !apiCategories.some(c => c.name === n))
                      .map(name => (
                        <button
                          key={name}
                          onClick={() => canManage && addCategoryMutation.mutate(name)}
                          className={`text-xs px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground transition-colors ${canManage ? 'hover:bg-primary hover:text-primary-foreground cursor-pointer' : ''}`}
                          title={canManage ? `Save "${name}" as a category` : name}
                        >
                          {name}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add / Edit Product Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isOutletDesk
                ? 'Outlet price'
                : editingProduct ? 'Edit Product' : 'Add New Product'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {isOutletDesk ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {editingProduct?.name} — stock rises only when you acknowledge a store issue.
                </p>
                <div className="space-y-2">
                  <Label>Price (TZS)</Label>
                  <Input type="number" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Low stock threshold</Label>
                  <Input type="number" value={form.lowStockThreshold} onChange={e => setForm({ ...form, lowStockThreshold: Number(e.target.value) })} />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>Product Name *</Label>
                  <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Coca Cola 500ml" />
                </div>
                <div className="space-y-2">
                  <Label>Barcode *</Label>
                  <Input value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} placeholder="e.g. 5449000000996" className="font-mono" />
                </div>
                <div className="space-y-2">
                  <Label>Category *</Label>
                  {apiCategories.length > 0 ? (
                    <select
                      value={form.category}
                      onChange={e => setForm({ ...form, category: e.target.value })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                      <option value="">Select category…</option>
                      {allCategoryNames.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  ) : (
                    <>
                      <Input
                        value={form.category}
                        onChange={e => setForm({ ...form, category: e.target.value })}
                        placeholder="e.g. Beverages"
                        list="cat-list"
                      />
                      <datalist id="cat-list">
                        {allCategoryNames.map(c => <option key={c} value={c} />)}
                      </datalist>
                      <p className="text-xs text-muted-foreground">
                        No saved categories.{' '}
                        <button type="button" className="underline" onClick={() => { setShowForm(false); setTab('categories'); }}>
                          Add categories first
                        </button>.
                      </p>
                    </>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Price (TZS) *</Label>
                  <Input type="number" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} />
                </div>
                {!editingProduct && (
                  <div className="space-y-2">
                    <Label>Opening stock</Label>
                    <Input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: Number(e.target.value) })} />
                  </div>
                )}
                {editingProduct && (
                  <div className="col-span-2 rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                    Current stock: <strong>{editingProduct.stock}</strong>. Use Adjust stock or Purchases to change inventory.
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="mt-2"
                      onClick={() => {
                        setShowForm(false);
                        setAdjustProduct(editingProduct);
                        setAdjustQty(0);
                      }}
                    >
                      Adjust stock
                    </Button>
                  </div>
                )}
                <div className="col-span-2 space-y-2">
                  <Label>Low Stock Threshold</Label>
                  <Input type="number" value={form.lowStockThreshold} onChange={e => setForm({ ...form, lowStockThreshold: Number(e.target.value) })} />
                </div>
                {canManage && (
                  <label className="col-span-2 flex items-start gap-2 rounded-md border border-dashed p-3 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={!!form.isSellableTransfer}
                      onChange={e => setForm({ ...form, isSellableTransfer: e.target.checked })}
                    />
                    <span>
                      <span className="font-medium text-foreground">Can transfer to outlet stock</span>
                      <span className="block text-xs text-muted-foreground mt-0.5">
                        Check for sodas and sellables. Leave unchecked for tools, soaps, and other store supplies that must not enter Bar or Restaurant stock.
                      </span>
                    </span>
                  </label>
                )}
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSave} className="gap-2">
                <Save className="w-4 h-4" /> {editingProduct ? 'Update' : 'Add'} Product
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!adjustProduct} onOpenChange={(o) => !o && setAdjustProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust stock — {adjustProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Current: {adjustProduct?.stock}</p>
            <div>
              <Label>Type</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={adjustType}
                onChange={e => setAdjustType(e.target.value)}
              >
                <option value="adjustment">Adjustment (+/-)</option>
                <option value="wastage">Wastage</option>
                <option value="return">Return (in)</option>
                <option value="opening">Opening</option>
              </select>
            </div>
            <div>
              <Label>Quantity (negative to reduce for adjustment)</Label>
              <Input type="number" value={adjustQty} onChange={e => setAdjustQty(Number(e.target.value))} />
            </div>
            <div>
              <Label>Note</Label>
              <Input value={adjustNote} onChange={e => setAdjustNote(e.target.value)} />
            </div>
            <Button
              onClick={async () => {
                if (!adjustProduct || adjustQty === 0) return;
                try {
                  await stockMovementsApi.adjust({
                    product_id: Number(adjustProduct.id),
                    qty: adjustQty,
                    type: adjustType,
                    note: adjustNote || undefined,
                  });
                  qc.invalidateQueries({ queryKey: ['products'] });
                  toast.success('Stock adjusted');
                  setAdjustProduct(null);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Adjust failed');
                }
              }}
            >
              Apply
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Inventory;

