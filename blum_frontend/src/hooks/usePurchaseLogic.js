import { useState, useEffect } from "react";
import { useAppData } from "../context/AppDataProvider";

/** Estado compartilhado entre importação PDF e CSV. */
export function usePurchaseLogic() {
  const { brands, isLoadingBrands } = useAppData();
  const [selectedFile, setSelectedFile] = useState(null);
  const [parsedItems, setParsedItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [userProducts, setUserProducts] = useState([]);
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  useEffect(() => {
    if (isLoadingBrands) return;
    setUserProducts([]);
    if (brands.length > 0 && brands[0]?.id != null) {
      setSelectedBrandId(String(brands[0].id));
    } else {
      setSelectedBrandId("");
    }
  }, [brands, isLoadingBrands]);

  return {
    selectedFile,
    setSelectedFile,
    parsedItems,
    setParsedItems,
    isLoading,
    setIsLoading,
    error,
    setError,
    successMessage,
    setSuccessMessage,
    userProducts,
    setUserProducts,
    brands,
    selectedBrandId,
    setSelectedBrandId,
    purchaseDate,
    setPurchaseDate,
  };
}
