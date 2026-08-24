package main

import (
	"io/ioutil"
	"strings"
)

func main() {
	b, _ := ioutil.ReadFile("app/(pages)/staff/inventory/page.tsx")
	content := string(b)
	
	oldUseEffect := `useEffect(() => {
    fetchIngredientsAndMenuItems();
    fetchBatches();
    fetchRecipes();
  }, []);`
	
	newUseEffect := `useEffect(() => {
    fetchIngredientsAndMenuItems();
    fetchBatches();
    fetchRecipes();
    fetchVendors();
  }, []);`
	content = strings.Replace(content, oldUseEffect, newUseEffect, 1)

	ioutil.WriteFile("app/(pages)/staff/inventory/page.tsx", []byte(content), 0644)
}
