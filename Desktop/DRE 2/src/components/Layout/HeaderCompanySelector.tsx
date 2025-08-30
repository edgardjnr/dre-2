import React from 'react';
import { Building2, ChevronDown } from 'lucide-react';
import { useCompany } from '../../contexts/CompanyContext';

interface HeaderCompanySelectorProps {
  onCompanySelect?: (companyId: string) => void;
}

export const HeaderCompanySelector: React.FC<HeaderCompanySelectorProps> = ({ onCompanySelect }) => {
  const { companies, selectedCompany, setSelectedCompany } = useCompany();

  const handleCompanyChange = (companyId: string) => {
    setSelectedCompany(companyId);
    if (onCompanySelect) {
      onCompanySelect(companyId);
    }
  };

  const selectedCompanyData = companies.find(c => c.id === selectedCompany);

  // Se não há empresas ou apenas uma empresa, não mostra o seletor
  if (companies.length <= 1) {
    return null;
  }

  return (
    <div className="flex items-center space-x-2">
      <Building2 className="h-4 w-4 text-gray-600" />
      <div className="relative">
        <select
          value={selectedCompany || ""}
          onChange={(e) => handleCompanyChange(e.target.value)}
          className="appearance-none bg-white border border-gray-300 rounded-md px-3 py-1 pr-8 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer hover:bg-gray-50 transition-colors"
        >
          <option value="">Selecionar empresa...</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.razaoSocial}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
};