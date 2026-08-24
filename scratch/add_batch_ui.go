package main

import (
	
	"io/ioutil"
	"strings"
)

func main() {
	b, _ := ioutil.ReadFile("app/(pages)/staff/inventory/page.tsx")
	content := string(b)
	
	// Add state variables
	 // strings.Index(content, "const [batches, setBatches] = useState<Batch[]>([]);")
	newState := "const [batches, setBatches] = useState<Batch[]>([]);\n  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);\n  const [showEditBatchModal, setShowEditBatchModal] = useState(false);\n"
	content = strings.Replace(content, "const [batches, setBatches] = useState<Batch[]>([]);", newState, 1)
	
	// Add api call functions
	funcIdx := strings.Index(content, "const fetchVendors")
	newFuncs := `const handleDeleteBatch = async (batchId: string) => {
    if (!confirm("Are you sure you want to delete this batch? This will deduct its quantity from your inventory stock and cannot be undone.")) return;
    try {
      await api('/api/admin/inventory/advanced/batches?id=' + batchId, { method: 'DELETE' });
      toast.success("Batch deleted");
      fetchBatches();
      // fetchOverview(); // Optional if overview is used
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete batch");
    }
  };

  const handleEditBatch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingBatch) return;
    try {
      await api('/api/admin/inventory/advanced/batches?id=' + editingBatch.id, {
        method: 'PUT',
        body: JSON.stringify({
          quantity: Number(editingBatch.quantity),
          expires_at: editingBatch.expires_at || undefined
        })
      });
      toast.success("Batch updated");
      setShowEditBatchModal(false);
      fetchBatches();
      // fetchOverview();
    } catch (e) {
      console.error(e);
      toast.error("Failed to update batch");
    }
  };

  `
	content = content[:funcIdx] + newFuncs + content[funcIdx:]
	
	// Update table header
	thSearch := `<th className="px-6 py-4">Expiry Date</th>`
	thReplace := `<th className="px-6 py-4">Expiry Date</th>
                      <th className="px-6 py-4 text-right">Actions</th>`
	content = strings.Replace(content, thSearch, thReplace, 1)
	
	// Update table row
	tdSearch := `</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );`
	tdReplace := `</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => { setEditingBatch(b); setShowEditBatchModal(true); }}
                                className="text-slate-400 hover:text-emerald-600 transition-colors"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteBatch(b.id)}
                                className="text-slate-400 hover:text-red-600 transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );`
	content = strings.Replace(content, tdSearch, tdReplace, 1)

	// Add modal
	modalSearch := `{/* Add PO Modal */}`
	modalReplace := `{/* Edit Batch Modal */}
      <AnimatePresence>
        {showEditBatchModal && editingBatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
              <div className="border-b border-slate-100 px-6 py-4 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-900">Edit Stock Batch</h3>
                <button onClick={() => setShowEditBatchModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleEditBatch} className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      step="0.001"
                      required
                      value={editingBatch.quantity}
                      onChange={e => setEditingBatch({...editingBatch, quantity: Number(e.target.value)})}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Expected Expiry Date</label>
                    <input
                      type="date"
                      value={editingBatch.expires_at ? editingBatch.expires_at.split('T')[0] : ''}
                      onChange={e => setEditingBatch({...editingBatch, expires_at: e.target.value ? new Date(e.target.value).toISOString() : undefined})}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>
                <div className="mt-8 flex justify-end gap-3 border-t border-slate-100 pt-5">
                  <button type="button" onClick={() => setShowEditBatchModal(false)} className="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
                  <button type="submit" className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600 focus:ring-2 focus:ring-emerald-500/20">Save Changes</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add PO Modal */}`
	
	content = strings.Replace(content, modalSearch, modalReplace, 1)

	// Ensure Edit2 icons are imported
	if !strings.Contains(content, "Edit2") {
		content = strings.Replace(content, "Trash2,", "Trash2, Edit2,", 1)
	}

	ioutil.WriteFile("app/(pages)/staff/inventory/page.tsx", []byte(content), 0644)
}
