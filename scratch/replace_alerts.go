package main

import (
	"io/ioutil"
	"strings"
)

func main() {
	b, _ := ioutil.ReadFile("app/(pages)/staff/inventory/page.tsx")
	content := string(b)
	
	content = strings.Replace(content, `alert("Failed to receive PO");`, `toast.error("Failed to receive PO");`, 1)
	content = strings.Replace(content, "alert(`Created recipe for ${parentItem?.name || 'Item'}`);", "toast.success(`Created recipe for ${parentItem?.name || 'Item'}`);", 1)
	content = strings.Replace(content, `alert("Failed to create recipe");`, `toast.error("Failed to create recipe");`, 1)
	content = strings.Replace(content, `alert("Failed to delete recipe");`, `toast.error("Failed to delete recipe");`, 1)
	content = strings.Replace(content, `alert("Failed to load recipe details");`, `toast.error("Failed to load recipe details");`, 1)

	ioutil.WriteFile("app/(pages)/staff/inventory/page.tsx", []byte(content), 0644)
}
