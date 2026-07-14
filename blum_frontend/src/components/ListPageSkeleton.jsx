/** Skeleton para listas em grelha, lista ou tabela */
export function ListPageSkeleton({ cards = 6, variant = "grid", rows = 8 }) {
  if (variant === "table") {
    return (
      <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/80 shadow-soft backdrop-blur-md animate-pulse">
        <div className="border-b border-zinc-200/80 bg-zinc-50/80 px-4 py-3">
          <div className="flex gap-6">
            <div className="h-3 w-28 rounded bg-zinc-200/80" />
            <div className="h-3 w-20 rounded bg-zinc-200/80" />
            <div className="h-3 w-24 rounded bg-zinc-200/80" />
            <div className="ml-auto h-3 w-16 rounded bg-zinc-200/80" />
          </div>
        </div>
        <div className="divide-y divide-zinc-100">
          {[...Array(rows)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-4">
              <div className="h-10 w-10 rounded-full bg-zinc-200/80" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-2/5 rounded bg-zinc-200/80" />
                <div className="h-3 w-1/4 rounded bg-zinc-100" />
              </div>
              <div className="hidden h-3 w-24 rounded bg-zinc-100 sm:block" />
              <div className="h-8 w-8 rounded-xl bg-zinc-100" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className="space-y-3 animate-pulse p-1">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-20 rounded-2xl border border-zinc-200/60 bg-zinc-200/50"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 animate-pulse p-1 md:grid-cols-2 xl:grid-cols-3 md:gap-5">
      {[...Array(cards)].map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-zinc-200/80 bg-white/80 p-5 shadow-soft backdrop-blur-md"
        >
          <div className="mb-4 flex gap-3">
            <div className="h-10 w-10 rounded-full bg-zinc-200/80" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded bg-zinc-200/80" />
              <div className="h-3 w-1/2 rounded bg-zinc-100" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-3 rounded bg-zinc-100" />
            <div className="h-3 w-5/6 rounded bg-zinc-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default ListPageSkeleton;
