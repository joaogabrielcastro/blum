/**
 * Download de PDF sem link blob:https://... (evita WhatsApp anexar URL do sistema).
 * jsPDF doc.save() usa blob URL temporário que alguns navegadores/WhatsApp expõem.
 */
export function buildPdfFile(doc, filename) {
  const blob = doc.output("blob");
  return new File([blob], filename, { type: "application/pdf" });
}

export function downloadPdfFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const link = document.createElement("a");
        link.href = reader.result;
        link.download = file.name;
        link.rel = "noopener";
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        resolve();
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error || new Error("Falha ao preparar PDF"));
    reader.readAsDataURL(file);
  });
}

export function canSharePdfFile(file) {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] })
  );
}

/** Compartilha só o arquivo — sem URL do sistema. */
export async function sharePdfFile(file, title) {
  if (!canSharePdfFile(file)) {
    return false;
  }
  await navigator.share({
    files: [file],
    title: title || file.name,
  });
  return true;
}
