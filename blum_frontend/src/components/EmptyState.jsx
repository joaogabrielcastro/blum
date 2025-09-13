const EmptyState = ({ brandsCount, hasSearchTerm, selectedBrand }) => {
  if (hasSearchTerm) {
    return (
      <div className="col-span-full flex items-center justify-center py-12">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold">Nenhum produto encontrado</h3>
          <p className="mt-2">Tente ajustar os termos da sua busca</p>
        </div>
      </div>
    );
  }

  if (selectedBrand !== "all") {
    return (
      <div className="col-span-full flex items-center justify-center py-12">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-4">📦</div>
          <h3 className="text-xl font-semibold">Nenhum produto nesta marca</h3>
          <p className="mt-2">
            Adicione produtos para a marca "{selectedBrand}"
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="col-span-full flex items-center justify-center py-12">
      <div className="text-center text-gray-500">
        <div className="text-4xl mb-4">📦</div>
        <h3 className="text-xl font-semibold">
          {brandsCount === 0
            ? "Adicione marcas primeiro"
            : "Nenhum produto cadastrado"}
        </h3>
        <p className="mt-2">
          {brandsCount === 0
            ? "Você precisa adicionar marcas antes de adicionar produtos"
            : "Adicione produtos para começar"}
        </p>
      </div>
    </div>
  );
};

export default EmptyState;
