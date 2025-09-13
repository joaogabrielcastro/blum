import { useState, useEffect } from "react";

const SearchBar = ({ 
  placeholder = "Buscar...", 
  value: externalValue, 
  onChange, 
  onClear,
  delay = 300 // Delay para busca em tempo real
}) => {
  const [internalValue, setInternalValue] = useState(externalValue || "");
  const [timeoutId, setTimeoutId] = useState(null);

  // Sincroniza com o valor externo
  useEffect(() => {
    setInternalValue(externalValue || "");
  }, [externalValue]);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setInternalValue(newValue);

    // Debounce para busca em tempo real
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    const newTimeoutId = setTimeout(() => {
      if (onChange) {
        onChange(newValue);
      }
    }, delay);

    setTimeoutId(newTimeoutId);
  };

  const handleClear = () => {
    setInternalValue("");
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    if (onChange) {
      onChange("");
    }
    if (onClear) {
      onClear();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (onChange) {
        onChange(internalValue);
      }
    }
  };

  return (
    <div className="relative w-full">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg 
          className="h-5 w-5 text-gray-400" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
          />
        </svg>
      </div>
      
      <input
        type="text"
        value={internalValue}
        onChange={handleChange}
        onKeyPress={handleKeyPress}
        placeholder={placeholder}
        className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
      />
      
      {internalValue && (
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
          <button
            onClick={handleClear}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            type="button"
            title="Limpar busca"
          >
            <svg 
              className="h-4 w-4" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M6 18L18 6M6 6l12 12" 
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default SearchBar;