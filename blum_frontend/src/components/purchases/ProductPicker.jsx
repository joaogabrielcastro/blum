import { useEffect, useState } from "react";
import apiService from "../../services/apiService";
import { searchCatalogProducts } from "../../utils/catalogApi";
import formatCurrency from "../../utils/format";

/**
 * Busca de produto do catálogo para vincular a um item da nota.
 * onPick(produto) recebe o objeto da API (inclui custo para admin).
 */
export default function ProductPicker({ brandId, initialQuery = "", onPick, onCancel }) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      return undefined;
    }
    let active = true;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const rows = await searchCatalogProducts(apiService, {
          q: term,
          brandId: brandId || undefined,
          limit: 8,
        });
        if (active) setResults(rows);
      } catch {
        if (active) setResults([]);
      } finally {
        if (active) setLoading(false);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, brandId]);

  return (
    <div className="rounded-xl border border-edge bg-surface p-3">
      <div className="flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar produto por nome ou código"
          aria-label="Buscar produto do catálogo"
          autoFocus
          className="min-w-0 flex-1 rounded-lg border border-edge bg-surface px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 text-sm font-medium text-ink-muted hover:bg-surface-muted"
        >
          Fechar
        </button>
      </div>
      <ul className="mt-2 max-h-56 divide-y divide-edge overflow-y-auto">
        {loading ? (
          <li className="py-2 text-sm text-ink-muted">Buscando…</li>
        ) : results.length === 0 ? (
          <li className="py-2 text-sm text-ink-muted">
            {query.trim().length < 2 ? "Digite ao menos 2 letras." : "Nenhum produto encontrado."}
          </li>
        ) : (
          results.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onPick(p)}
                className="flex w-full items-center justify-between gap-3 py-2 text-left text-sm hover:bg-surface-muted"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-ink">{p.name}</span>
                  <span className="font-mono text-xs text-ink-muted">
                    {p.productCode || p.productcode} · estoque {p.stock}
                    {p.brand ? ` · ${p.brand}` : ""}
                  </span>
                </span>
                <span className="shrink-0 tabular-nums text-ink-muted">
                  {formatCurrency(p.price)}
                </span>
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
