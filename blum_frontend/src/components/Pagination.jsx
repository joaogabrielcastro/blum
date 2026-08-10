const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  total,
  limit,
}) => {
  const startItem = (currentPage - 1) * limit + 1;
  const endItem = Math.min(currentPage * limit, total);

  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else if (currentPage <= 3) {
      pages.push(1, 2, 3, 4, "...", totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(
        1,
        "...",
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      );
    } else {
      pages.push(
        1,
        "...",
        currentPage - 1,
        currentPage,
        currentPage + 1,
        "...",
        totalPages,
      );
    }

    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col items-center justify-between gap-4 border-t border-edge bg-surface px-4 py-3 sm:flex-row">
      <div className="text-sm text-ink-muted">
        Mostrando <span className="font-medium text-ink">{startItem}</span> a{" "}
        <span className="font-medium text-ink">{endItem}</span> de{" "}
        <span className="font-medium text-ink">{total}</span> resultados
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`rounded-lg px-3 py-1 text-sm font-medium transition-colors ${
            currentPage === 1
              ? "cursor-not-allowed bg-surface-muted text-ink-muted"
              : "border border-edge bg-surface text-ink hover:bg-surface-muted"
          }`}
        >
          Anterior
        </button>

        <div className="hidden items-center gap-1 sm:flex">
          {getPageNumbers().map((page, index) =>
            page === "..." ? (
              <span key={`ellipsis-${index}`} className="px-2 text-ink-muted">
                ...
              </span>
            ) : (
              <button
                type="button"
                key={page}
                onClick={() => onPageChange(page)}
                className={`min-w-[2.5rem] rounded-lg px-3 py-1 text-sm font-medium transition-colors ${
                  currentPage === page
                    ? "bg-brand text-white"
                    : "border border-edge bg-surface text-ink hover:bg-surface-muted"
                }`}
              >
                {page}
              </button>
            ),
          )}
        </div>

        <div className="px-3 py-1 text-sm font-medium text-ink sm:hidden">
          {currentPage} / {totalPages}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`rounded-lg px-3 py-1 text-sm font-medium transition-colors ${
            currentPage === totalPages
              ? "cursor-not-allowed bg-surface-muted text-ink-muted"
              : "border border-edge bg-surface text-ink hover:bg-surface-muted"
          }`}
        >
          Próximo
        </button>
      </div>
    </div>
  );
};

export default Pagination;
