package main

import (
	
	"io/ioutil"
	"strings"
)

func main() {
	b, _ := ioutil.ReadFile("app/(pages)/staff/inventory/page.tsx")
	content := string(b)
	
	// Replace exactly this block
	tdSearch := `                              <span className="text-slate-400 font-medium">No Expiry</span>
                            )}
                          </td>
                        </tr>`

	tdReplace := `                              <span className="text-slate-400 font-medium">No Expiry</span>
                            )}
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
                        </tr>`
                        
	content = strings.Replace(content, tdSearch, tdReplace, 1)

	ioutil.WriteFile("app/(pages)/staff/inventory/page.tsx", []byte(content), 0644)
}
