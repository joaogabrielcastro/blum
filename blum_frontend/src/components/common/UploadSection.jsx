import React from "react";

const UploadSection = ({
  onFileChange,
  selectedFile,
  onUpload,
  isLoading,
  error,
  brands = [],
  selectedBrandId,
  onBrandChange = () => {},
  title = "Upload",
  description = "",
  accept = "*",
  fileType = "file",
}) => {
  return (
    <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-gray-600 mb-4">{description}</p>
      )}

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1">
          <input
            type="file"
            accept={accept}
            onChange={onFileChange}
            className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700"
          />

          {brands && brands.length > 0 && (
            <select
              value={selectedBrandId}
              onChange={onBrandChange}
              className="mt-3 block w-full md:w-64 p-2 border border-gray-300 rounded"
            >
              {brands.map((b) => (
                <option key={b.id || b} value={b.id ?? b}>
                  {b.name || b.displayName || String(b)}
                </option>
              ))}
            </select>
          )}

          {error && (
            <p className="text-sm text-red-600 mt-2">{String(error)}</p>
          )}
        </div>

        <div className="flex-shrink-0">
          <button
            onClick={onUpload}
            disabled={isLoading}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded shadow-md disabled:opacity-60"
          >
            {isLoading ? `Enviando...` : `Enviar ${fileType.toUpperCase()}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadSection;
