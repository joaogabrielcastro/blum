import { useState } from 'react';
import PriceHistoryModal from './PriceHistoryModal';

const ProductRow = ({ 
  product, 
  onEdit, 
  onDelete, 
  confirmDelete, 
  deleteType, 
  deleteId, 
  onConfirmDelete, 
  onCancelDelete,
  userRole 
}) => {
  const [showPriceHistory, setShowPriceHistory] = useState(false);

  return (
    <>
      <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors duration-150">
        {/* Nome do Produto */}
        <td className="py-4 px-4">
          <div className="flex flex-col">
            <h3 className="font-semibold text-gray-800">{product.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                Código: {product.productcode}
              </span>
              {product.subcode && (
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {product.subcode}
                </span>
              )}
            </div>
          </div>
        </td>

        {/* Marca */}
        <td className="py-4 px-4">
          <span className="text-sm text-gray-700">{product.brand}</span>
        </td>

        {/* Preço */}
        <td className="py-4 px-4">
          <span className="text-lg font-bold text-green-600">
            R$ {product.price != null && !isNaN(product.price) ? Number(product.price).toFixed(2) : '0.00'}
          </span>
        </td>

        {/* Estoque */}
        <td className="py-4 px-4">
          <div className="flex flex-col">
            <span className={`text-sm font-medium ${
              product.stock <= (product.minstock || 0) 
                ? 'text-red-600' 
                : 'text-gray-700'
            }`}>
              {product.stock} unidades
            </span>
            {product.minstock > 0 && (
              <span className="text-xs text-orange-600 mt-1">
                Mín: {product.minstock}
              </span>
            )}
          </div>
        </td>

        {/* Ações */}
        <td className="py-4 px-4">
          <div className="flex gap-2">
            {/* Botão Histórico de Preços - APENAS ADMIN */}
            {userRole === 'admin' && (
              <button
                onClick={() => setShowPriceHistory(true)}
                className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:from-purple-600 hover:to-purple-700 transition-all duration-200 flex items-center justify-center gap-1"
                title="Histórico de Preços"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </button>
            )}

            {/* Botão Editar */}
            <button
              onClick={() => onEdit(product)}
              className="bg-blue-500 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors flex items-center justify-center gap-1"
              title="Editar Produto"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>

            {/* Botão Excluir (apenas admin) */}
            {userRole === 'admin' && (
              <button
                onClick={() => onDelete('product', product.id, product.name)}
                className="bg-red-500 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors flex items-center justify-center gap-1"
                title="Excluir Produto"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* Modal de Confirmação de Exclusão */}
      {confirmDelete && deleteType === 'product' && deleteId === product.id && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Confirmar Exclusão</h3>
            <p className="text-gray-600 mb-4">
              Tem certeza que deseja excluir <strong>{confirmDelete}</strong>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={onCancelDelete}
                className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => onConfirmDelete(product.id)}
                className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Histórico de Preços */}
      {showPriceHistory && (
        <PriceHistoryModal 
          product={product} 
          onClose={() => setShowPriceHistory(false)} 
        />
      )}
    </>
  );
};

export default ProductRow;