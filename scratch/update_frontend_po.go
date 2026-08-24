package main

import (
	"io/ioutil"
	"strings"
)

func main() {
	b, _ := ioutil.ReadFile("app/(pages)/staff/inventory/page.tsx")
	content := string(b)
	
	// Add poCost state
	oldState := `const [poExpiry, setPoExpiry] = useState('');`
	newState := `const [poExpiry, setPoExpiry] = useState('');
  const [poCost, setPoCost] = useState('');`
	content = strings.Replace(content, oldState, newState, 1)
	
	// Update poItems type
	oldItems := `const [poItems, setPoItems] = useState<{ingredient_id: string, name: string, quantity: number, unit: string, expected_expires_at?: string}[]>([]);`
	newItems := `const [poItems, setPoItems] = useState<{ingredient_id: string, name: string, quantity: number, unit: string, expected_expires_at?: string, expected_cost_per_unit?: number}[]>([]);`
	content = strings.Replace(content, oldItems, newItems, 1)

	// Update Add Item logic
	oldAdd := `setPoItems([...poItems, {
                        ingredient_id: poIngredient,
                        name: ingredients.find(i => i.id === poIngredient)?.name || '',
                        quantity: Number(poQuantity),
                        unit: poUnit,
                        expected_expires_at: poExpiry ? new Date(poExpiry).toISOString() : undefined
                      }]);
                      setPoIngredient('');
                      setPoQuantity('');
                      setPoExpiry('');`
	newAdd := `setPoItems([...poItems, {
                        ingredient_id: poIngredient,
                        name: ingredients.find(i => i.id === poIngredient)?.name || '',
                        quantity: Number(poQuantity),
                        unit: poUnit,
                        expected_expires_at: poExpiry ? new Date(poExpiry).toISOString() : undefined,
                        expected_cost_per_unit: poCost ? Number(poCost) : undefined
                      }]);
                      setPoIngredient('');
                      setPoQuantity('');
                      setPoExpiry('');
                      setPoCost('');`
	content = strings.Replace(content, oldAdd, newAdd, 1)

	// Add input field to UI
	oldUI := `<div className="col-span-2 sm:col-span-1">
                      <label className="block text-xs font-medium text-slate-700 mb-1">Expiry Date (Optional)</label>
                      <input
                        type="date"
                        value={poExpiry}
                        onChange={e => setPoExpiry(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>`
	newUI := `<div className="col-span-2 sm:col-span-1">
                      <label className="block text-xs font-medium text-slate-700 mb-1">Expiry Date (Optional)</label>
                      <input
                        type="date"
                        value={poExpiry}
                        onChange={e => setPoExpiry(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-700 mb-1">Cost Price Per Unit (Optional)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={poCost}
                        onChange={e => setPoCost(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>`
	content = strings.Replace(content, oldUI, newUI, 1)
	
	// Add Cost to the item list display
	oldList := `<div className="text-sm font-medium text-slate-900">{item.name}</div>
                            <div className="text-xs text-slate-500">{item.quantity} {item.unit}</div>`
	newList := `<div className="text-sm font-medium text-slate-900">{item.name}</div>
                            <div className="text-xs text-slate-500">
                              {item.quantity} {item.unit}
                              {item.expected_cost_per_unit ? " @ " + fmtINR(item.expected_cost_per_unit) + "/unit" : ""}
                            </div>`
	content = strings.Replace(content, oldList, newList, 1)

	ioutil.WriteFile("app/(pages)/staff/inventory/page.tsx", []byte(content), 0644)
}
