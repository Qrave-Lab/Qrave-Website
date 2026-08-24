package main

import (
	"io/ioutil"
	"strings"
)

func main() {
	b, _ := ioutil.ReadFile("app/(pages)/staff/inventory/page.tsx")
	content := string(b)
	
	// Add vendor_id to Batch type
	typeSearch := `supplier_name: string;
  };`
	typeReplace := `supplier_name: string;
    vendor_id?: string;
  };`
	content = strings.Replace(content, typeSearch, typeReplace, 1)

	// Add vendor_id to payload
	bodySearch := `cost_per_unit: Number(editingBatch.cost_per_unit),
          received_at: editingBatch.received_at
        })`
	bodyReplace := `cost_per_unit: Number(editingBatch.cost_per_unit),
          received_at: editingBatch.received_at,
          vendor_id: editingBatch.vendor_id || undefined
        })`
	content = strings.Replace(content, bodySearch, bodyReplace, 1)

	// Add Supplier dropdown to form
	formSearch := `<div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Expected Expiry Date</label>`
	formReplace := `<div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Supplier</label>
                    <select
                      value={editingBatch.vendor_id || ''}
                      onChange={e => setEditingBatch({...editingBatch, vendor_id: e.target.value})}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="">Direct Input / No Supplier</option>
                      {vendors.map(v => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Expected Expiry Date</label>`
	content = strings.Replace(content, formSearch, formReplace, 1)

	ioutil.WriteFile("app/(pages)/staff/inventory/page.tsx", []byte(content), 0644)
}
