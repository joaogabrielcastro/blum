import Tabs from "../ui/Tabs";

const PurchaseTabs = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: "pdf", label: "Importar PDF" },
    { id: "csv", label: "Importar CSV" },
  ];

  return (
    <Tabs
      tabs={tabs}
      value={activeTab}
      onChange={onTabChange}
      className="mb-6"
    />
  );
};

export default PurchaseTabs;
