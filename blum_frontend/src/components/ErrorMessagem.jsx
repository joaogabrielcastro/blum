const ErrorMessagem = ({ message, onClose }) => {
  return (
    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md flex justify-between items-center">
      <span>{message}</span>
      <button
        onClick={onClose}
        className="text-red-700 hover:text-red-900 font-bold text-lg"
      >
        ×
      </button>
    </div>
  );
};

export default ErrorMessagem;