const PurchaseDateSection = ({ date, onDateChange }) => (
  <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
    <h3 className="text-lg font-semibold text-gray-800 mb-4">Data da Compra</h3>
    <div className="flex items-center gap-4">
      <label className="block text-sm font-medium text-gray-700">
        Data em que os produtos foram comprados:
      </label>
      <input
        type="date"
        value={date}
        onChange={(e) => onDateChange(e.target.value)}
        className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
      />
    </div>
  </div>
);

export default PurchaseDateSection;
