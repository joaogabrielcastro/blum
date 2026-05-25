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
          ? "mb-4 p-4 rounded-lg border border-green-200 bg-green-50 text-green-900 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2"
          : "mb-4 p-4 rounded-lg border border-red-200 bg-red-50 text-red-800 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2"
      }
      role={isSuccess ? "status" : "alert"}
    >
      <span className="text-sm flex-1 whitespace-pre-wrap">{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className={
          isSuccess
            ? "text-sm font-medium text-green-800 hover:text-green-950 shrink-0 self-end sm:self-start"
            : "text-sm font-medium text-red-700 hover:text-red-900 shrink-0 self-end sm:self-start"
        }
      >
        Fechar
      </button>
    </div>
  );
}
