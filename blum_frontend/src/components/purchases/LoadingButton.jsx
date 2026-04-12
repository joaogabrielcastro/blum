const LoadingButton = ({ 
  onClick, 
  disabled, 
  isLoading, 
  children, 
  variant = "primary",
  ...props 
}) => {
  const baseClasses = "px-6 py-2.5 font-medium rounded-lg flex items-center disabled:opacity-50";
  const variants = {
    primary: "bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800",
    secondary: "border border-gray-300 text-gray-700 hover:bg-gray-50"
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`${baseClasses} ${variants[variant]}`}
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Processando...
        </>
      ) : (
        children
      )}
    </button>
  );
};