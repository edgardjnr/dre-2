import React, { useState, useEffect } from 'react';
import { Empresa } from '../../types';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';

interface EmpresaFormProps {
  empresa?: Empresa | null;
  onSave: () => void;
  onClose: () => void;
}

export const EmpresaForm: React.FC<EmpresaFormProps> = ({ empresa, onSave, onClose }) => {
  const { user } = useAuth();
  
  const getInitialState = () => ({
    razaoSocial: '',
    cnpj: '',
    regimeTributario: 'Simples Nacional' as Empresa['regimeTributario'],
    dataAbertura: '',
    email: '',
    telefone: '',
    endereco: '',
    ativa: true,
  });

  const [formData, setFormData] = useState(getInitialState());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (empresa) {
      setFormData({
        razaoSocial: empresa.razaoSocial || '',
        cnpj: empresa.cnpj || '',
        regimeTributario: empresa.regimeTributario || 'Simples Nacional',
        dataAbertura: empresa.dataAbertura || '',
        email: empresa.email || '',
        telefone: empresa.telefone || '',
        endereco: empresa.endereco || '',
        ativa: empresa.ativa ?? true,
      });
    } else {
      // Reset form for new entry to avoid stale state
      setFormData(getInitialState());
    }
  }, [empresa]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
        const { checked } = e.target as HTMLInputElement;
        setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('Você precisa estar logado para salvar.');
      return;
    }
    setLoading(true);
    setError(null);

    const dataToSave = {
      ...formData,
      user_id: user.id,
      razao_social: formData.razaoSocial,
      regime_tributario: formData.regimeTributario,
      data_abertura: formData.dataAbertura,
    };
    // remove camelCase keys
    delete (dataToSave as any).razaoSocial;
    delete (dataToSave as any).regimeTributario;
    delete (dataToSave as any).dataAbertura;


    let response;
    if (empresa) {
      // Update
      response = await supabase.from('empresas').update(dataToSave).eq('id', empresa.id);
    } else {
      // Insert
      response = await supabase.from('empresas').insert(dataToSave);
    }

    if (response.error) {
      setError(response.error.message);
    } else {
      onSave();
      onClose();
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-red-500">{error}</p>}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Razão Social</label>
          <input type="text" name="razaoSocial" value={formData.razaoSocial} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">CNPJ</label>
          <input type="text" name="cnpj" value={formData.cnpj} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Regime Tributário</label>
          <select name="regimeTributario" value={formData.regimeTributario} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
            <option>Simples Nacional</option>
            <option>Lucro Presumido</option>
            <option>Lucro Real</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Data de Abertura</label>
          <input type="date" name="dataAbertura" value={formData.dataAbertura} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Email</label>
        <input type="email" name="email" value={formData.email} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">Telefone</label>
        <input type="tel" name="telefone" value={formData.telefone} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Endereço</label>
        <input type="text" name="endereco" value={formData.endereco} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
      </div>

      <div className="flex items-center">
        <input type="checkbox" name="ativa" checked={formData.ativa} onChange={handleChange} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"/>
        <label className="ml-2 block text-sm text-gray-900">Ativa</label>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300">
          Cancelar
        </button>
        <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-400">
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  );
};
