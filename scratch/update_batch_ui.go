package main

import (
	"io/ioutil"
	"strings"
)

func main() {
	b, _ := ioutil.ReadFile("app/(pages)/staff/inventory/page.tsx")
	content := string(b)

	oldBody := `body: JSON.stringify({
          quantity: Number(editingBatch.quantity),
          expires_at: editingBatch.expires_at || undefined
        })`

	newBody := `body: JSON.stringify({
          quantity: Number(editingBatch.quantity),
          expires_at: editingBatch.expires_at || undefined,
          cost_per_unit: Number(editingBatch.cost_per_unit),
          received_at: editingBatch.received_at
        })`

	content = strings.Replace(content, oldBody, newBody, 1)

	oldForm := `<div className="space-y-4">
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
                </div>`

	newForm := `<div className="space-y-4">
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
                    <label className="block text-sm font-medium text-slate-700 mb-1">Cost Per Unit</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editingBatch.cost_per_unit}
                      onChange={e => setEditingBatch({...editingBatch, cost_per_unit: Number(e.target.value)})}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Received At</label>
                    <input
                      type="datetime-local"
                      required
                      value={new Date(new Date(editingBatch.received_at).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0,16)}
                      onChange={e => setEditingBatch({...editingBatch, received_at: new Date(e.target.value).toISOString()})}
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
                </div>`
	
	content = strings.Replace(content, oldForm, newForm, 1)

	ioutil.WriteFile("app/(pages)/staff/inventory/page.tsx", []byte(content), 0644)
}
