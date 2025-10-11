const ProductCard = ({ 
  product, 
  onEdit, 
  onDelete, 
  confirmDelete, 
  deleteType, 
  onConfirmDelete, 
  onCancelDelete,
  userRole // ✅ NOVA PROP PARA PERMISSÕES
}) => {
  const isLowStock = product.stock <= product.minstock;
  
  // ✅ VERIFICA SE É ADMIN
  const isAdmin = userRole === "admin";

  return (
    <div className={`bg-white p-6 rounded-2xl shadow-md border ${isLowStock ? "border-red-500" : "border-gray-200"} flex flex-col h-full`}>
      <div className="flex justify-between items-start">
        <h2 className="text-xl font-semibold text-gray-800 mb-2 line-clamp-2">
          {product.name}
        </h2>
        
        {/* ✅ BOTÕES DE AÇÃO - APENAS ADMIN PODE EDITAR/DELETAR */}
        {isAdmin && (
          <div className="flex space-x-2">
            <button
              onClick={() => onEdit(product)}
              className="text-sm text-blue-600 hover:text-blue-800"
              title="Editar produto"
            >
              Editar
            </button>
            <button
              onClick={() => onDelete("product", product.id, product.name)}
              className="text-sm text-red-600 hover:text-red-800"
              title="Excluir produto"
            >
              {confirmDelete === product.name && deleteType === "product" ? "Confirmar" : "Excluir"}
            </button>
          </div>
        )}
      </div>
      
      <p className="text-gray-500 text-sm mb-4">
        Código: {product.productcode}
      </p>
      
      <div className="flex justify-between items-center text-sm mt-auto">
        <span className="text-blue-600 font-bold text-lg">
          R$ {(parseFloat(product.price) || 0).toFixed(2)}
        </span>
        <span className={`flex items-center gap-2 font-semibold ${isLowStock ? "text-red-500" : "text-gray-600"}`}>
          {isLowStock && (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )}
          Estoque: {product.stock || 0}
        </span>
      </div>
      
      <p className="text-sm text-gray-500 mt-2">
        Representada: {product.brand}
      </p>
      
      <p className="text-xs text-gray-400 mt-2">
        Estoque Mínimo: {product.minstock}
      </p>

      {/* ✅ CONFIRMAÇÃO DE EXCLUSÃO - APENAS PARA ADMIN */}
      {isAdmin && confirmDelete === product.name && deleteType === "product" && (
        <div className="mt-3 p-2 bg-yellow-100 text-yellow-800 rounded-md text-xs">
          <p>Clique em "Confirmar" para excluir "{product.name}"</p>
          <div className="flex space-x-2 mt-2">
            <button
              onClick={() => onConfirmDelete(product.id)}
              className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700"
            >
              Confirmar
            </button>
            <button
              onClick={onCancelDelete}
              className="bg-gray-500 text-white px-2 py-1 rounded text-xs hover:bg-gray-600"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductCard;