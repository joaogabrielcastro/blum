import { useState, useEffect } from "react";
import apiService from "../services/apiService";

/** Estado compartilhado entre importação PDF e CSV. */
export function usePurchaseLogic() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [parsedItems, setParsedItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [userProducts, setUserProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const brandsData = await apiService.getBrands();
        const brandsList = Array.isArray(brandsData) ? brandsData : [];

        setUserProducts([]);
        setBrands(brandsList);

        if (brandsList.length > 0 && brandsList[0]?.id != null) {
          setSelectedBrandId(String(brandsList[0].id));
        } else {
          setSelectedBrandId("");
        }
      } catch (err) {
        console.error("Erro ao buscar representadas:", err);
        setUserProducts([]);
        setBrands([]);
        setSelectedBrandId("");
      }
    };
    fetchUserData();
  }, []);

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
