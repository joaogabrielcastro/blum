function formatSyncedAt(iso) {
  if (!iso) return "nunca";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "nunca";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OfflineSyncBar({  isOnline,
  meta,
  pendingCount,
  syncing,
  onDownload,
  onSyncAll,
}) {
  const hasCatalog = meta.productCount > 0 && meta.clientCount > 0;

  const isStale =
    hasCatalog &&
    meta.catalogSyncedAt &&
    Date.now() - new Date(meta.catalogSyncedAt).getTime() >
      24 * 60 * 60 * 1000;

  return (
    <div
      className={`rounded-xl border px-3 py-3 sm:px-4 sm:py-3 text-sm ${
        isOnline
          ? "border-blue-200 bg-blue-50/80"
          : "border-amber-300 bg-amber-50"
      }`}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="font-semibold text-gray-900">
            {isOnline ? "Modo campo (offline)" : "Você está offline"}
          </p>
          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
            {hasCatalog ? (
              <>
                Dados no aparelho:{" "}
                <strong>{meta.clientCount}</strong> clientes,{" "}
                <strong>{meta.productCount}</strong> produtos
                {meta.brandCount > 0 ? (
                  <>
                    {" "}
                    ({meta.brandCount} representada
                    {meta.brandCount > 1 ? "s" : ""})
                  </>
                ) : null}
                . Última atualização: {formatSyncedAt(meta.catalogSyncedAt)}.
                <span className="block mt-1 text-gray-500">
                  Os dados ficam guardados neste aparelho — não precisa baixar
                  toda vez, só atualizar quando quiser preços e clientes novos.
                </span>
              </>
            ) : (
              <>
                Baixe uma vez com internet; os dados ficam no aparelho para
                usar no campo sem sinal.
              </>
            )}
            {isStale && isOnline ? (
              <span className="block mt-1 text-amber-800">
                Dados com mais de 24h — recomendado atualizar antes de sair.
              </span>
            ) : null}
            {pendingCount > 0 ? (
              <span className="block mt-1 font-medium text-amber-900">
                {pendingCount} orçamento(s) aguardando envio quando houver
                internet.
              </span>
            ) : null}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
          <button
            type="button"
            disabled={!isOnline || syncing}
            onClick={onDownload}
            className="min-h-10 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {syncing
              ? "A sincronizar…"
              : hasCatalog
                ? "Atualizar dados offline"
                : "Baixar dados offline"}
          </button>
          {pendingCount > 0 ? (
            <button
              type="button"
              disabled={!isOnline || syncing}
              onClick={onSyncAll}
              className="min-h-10 rounded-lg border border-blue-300 bg-white px-4 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-100 disabled:opacity-50"
            >
              Enviar pendentes ({pendingCount})
            </button>
          ) : null}
        </div>
      </div>

      {!isOnline && !hasCatalog ? (
        <p className="mt-2 text-xs text-amber-900">
          Sem dados locais. Conecte-se à internet e use «Baixar dados offline»
          antes de sair para o campo.
        </p>
      ) : null}

      {!isOnline && hasCatalog ? (
        <p className="mt-2 text-xs text-amber-900">
          Pode criar orçamentos; serão enviados automaticamente ao voltar online.
        </p>
      ) : null}
    </div>
  );
}

export { formatSyncedAt };
