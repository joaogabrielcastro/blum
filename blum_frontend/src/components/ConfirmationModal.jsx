import React from 'react';

const ConfirmationModal = ({ show, onConfirm, onCancel, message }) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-sm w-full mx-4 text-center">
        <h3 className="text-xl font-bold mb-4">Confirmação</h3>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex justify-around space-x-4">
          <button
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-100 transition-colors duration-200"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors duration-200"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
