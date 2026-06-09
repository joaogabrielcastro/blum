import { useState, useEffect } from "react";
import { searchCatalogProducts } from "../utils/catalogApi";

/** Busca debounced de produtos para o formulário de pedidos. */
export function useOrderCatalogSearch(
  api,
  { selectedBrand, selectedBrandId, productSearch },
) {
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!selectedBrand && !selectedBrandId) {
      setSearchResults([]);
      return;
    }

    const term = productSearch.trim();
    if (term.length < 2) {
      setSearchResults([]);
      return;
    }

    let cancelled = false;
    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchCatalogProducts(api, {
          q: term,
          brand: selectedBrand,
          brandId: selectedBrandId,
          limit: 30,
        });
        if (!cancelled) setSearchResults(results);
      } catch (error) {
        console.error("Erro na busca:", error);
        if (!cancelled) setSearchResults([]);
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, 300);

    return () => {
      cancelled = true;   
      clearTimeout(timeoutId);
    };
  }, [api, productSearch, selectedBrand, selectedBrandId]);

  const clearSearch = () => setSearchResults([]);

  return { searchResults, setSearchResults, isSearching, clearSearch };
}
