import React from 'react';
import { Building2, ChevronDown } from 'lucide-react';
import { useCompany } from '../../contexts/CompanyContext';

interface CompanySelectorProps {
  onCompanySelect?: (companyId: string) => void;
}

export const CompanySelector: React.FC<CompanySelectorProps> = ({ onCompanySelect }) => {
  const { companies, selectedCompany, setSelectedCompany } = useCompany();

  const handleCompanyChange = (companyId: string) => {
    setSelectedCompany(companyId);
    if (onCompanySelect) {
      onCompanySelect(companyId);
    }
  };

  const selectedCompanyData = companies.find(c => c.id === selectedCompany);

  return (
    <div className="w-full">
      {selectedCompanyData ? (
        <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-6m-2-5a2 2 0 11-4 0 2 2 0 014 0zM9 3v2m0 0V3m0 2h6m-6 0h6" />
              </svg>
            </div>
            <span className="font-medium text-gray-900">{selectedCompanyData.razaoSocial}</span>
          </div>
          <select
            value={selectedCompany || ""}
            onChange={(e) => handleCompanyChange(e.target.value)}
            className="text-lg border border-gray-300 rounded-lg px-4 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.razaoSocial}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <select
          value={selectedCompany || ""}
          onChange={(e) => handleCompanyChange(e.target.value)}
          className="w-full text-lg border border-gray-300 rounded-lg px-4 py-3 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Selecione uma empresa...</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.razaoSocial}
            </option>
          ))}
        </select>
      )}
    </div>
  );
};