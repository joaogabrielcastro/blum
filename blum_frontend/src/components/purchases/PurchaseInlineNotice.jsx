export default function PurchaseInlineNotice({
  message,
  onDismiss,
  variant = "error",
}) {
  if (!message) return null;
  const isSuccess = variant === "success";
  return (
    <div
      className={
        isSuccess
          ? "mb-4 flex flex-col gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950 sm:flex-row sm:items-start sm:justify-between"
          : "mb-4 flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-red-900 sm:flex-row sm:items-start sm:justify-between"
      }
      role={isSuccess ? "status" : "alert"}
    >
      <span className="flex-1 whitespace-pre-wrap text-sm">{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className={
          isSuccess
            ? "shrink-0 self-end text-sm font-semibold text-emerald-800 hover:underline sm:self-start"
            : "shrink-0 self-end text-sm font-semibold text-red-800 hover:underline sm:self-start"
        }
      >
        Fechar
      </button>
    </div>
  );
}
