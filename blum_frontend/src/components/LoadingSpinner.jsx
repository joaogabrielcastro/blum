const LoadingSpinner = ({ message = "Carregando…" }) => {
  return (
    <div className="flex min-h-[40vh] items-center justify-center bg-transparent">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-edge border-t-brand" />
        <p className="mt-4 text-sm text-ink-muted">{message}</p>
      </div>
    </div>
  );
};

export default LoadingSpinner;
