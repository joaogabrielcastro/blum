/**
 * Elegant empty state with optional CTA. Keeps legacy product props.
 */
const EmptyState = ({
  brandsCount,
  hasSearchTerm,
  selectedBrand,
  title,
  message,
  icon,
  actionLabel,
  onAction,
}) => {
  let resolvedTitle = title;
  let resolvedMessage = message;
  let Illustration = PeopleIllustration;

  if (title == null && message == null) {
    if (hasSearchTerm) {
      resolvedTitle = "Nenhum produto encontrado";
      resolvedMessage = "Tente ajustar os termos da sua busca";
      Illustration = SearchIllustration;
    } else if (selectedBrand != null && selectedBrand !== "all") {
      resolvedTitle = "Nenhum produto nesta Representada";
      resolvedMessage = `Adicione produtos para a Representada "${selectedBrand}"`;
      Illustration = BoxIllustration;
    } else {
      resolvedTitle =
        brandsCount === 0
          ? "Adicione Representadas primeiro"
          : "Nenhum produto cadastrado";
      resolvedMessage =
        brandsCount === 0
          ? "Você precisa adicionar Representadas antes de adicionar produtos"
          : "Adicione produtos para começar";
      Illustration = BoxIllustration;
    }
  } else if (typeof icon === "string" && icon.includes("🔍")) {
    Illustration = SearchIllustration;
  } else if (hasSearchTerm || (title && String(title).toLowerCase().includes("encontrado"))) {
    Illustration = SearchIllustration;
  }

  return (
    <div className="col-span-full flex w-full items-center justify-center py-16 sm:py-20">
      <div className="mx-auto max-w-sm text-center">
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border border-zinc-200/80 bg-white/80 text-zinc-300 shadow-soft backdrop-blur-md">
          {icon != null && typeof icon !== "string" ? (
            icon
          ) : (
            <Illustration className="h-10 w-10" />
          )}
        </div>
        <h3 className="text-lg font-semibold text-zinc-900">{resolvedTitle}</h3>
        {resolvedMessage ? (
          <p className="mt-2 text-sm leading-relaxed text-zinc-500">
            {resolvedMessage}
          </p>
        ) : null}
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition-all duration-200 ease-in-out hover:bg-brand-600 active:scale-[0.98]"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
};

function PeopleIllustration({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

function BoxIllustration({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}

function SearchIllustration({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
    </svg>
  );
}

export default EmptyState;
