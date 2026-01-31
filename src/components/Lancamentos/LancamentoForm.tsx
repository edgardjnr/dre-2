import React, { useState, useEffect, useMemo } from 'react';
import { Lancamento, Empresa, ContaContabil } from '../../types';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';

interface LancamentoFormProps {
  lancamento?: Lancamento | null;
  empresas: Empresa[];
  contas: ContaContabil[];
  fixedTipo?: Lancamento['tipo'];
  onSave: () => void;
  onClose: () => void;
}

export const LancamentoForm: React.FC<LancamentoFormProps> = ({ 
  lancamento, 
  empresas, 
  contas, 
  fixedTipo,
  onSave, 
  onClose 
}) => {
  const { user } = useAuth();

  const getInitialState = () => ({
    empresaId: empresas.length > 0 ? empresas[0].id : '',
    contaId: '',
    data: new Date().toISOString().split('T')[0],
    descricao: '',
    valor: 0,
    tipo: (fixedTipo || 'Débito') as 'Débito' | 'Crédito',
  });

  const [formData, setFormData] = useState(getInitialState());
  const [valorFormatado, setValorFormatado] = useState('0,00');
  const [categoriaDre, setCategoriaDre] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contasFiltradas = useMemo(() => {
    return contas.filter(c => 
      c.empresaId === formData.empresaId && 
      c.tipo === 'Analítica' && 
      c.ativa
    );
  }, [contas, formData.empresaId]);

  const categoriasDisponiveis = useMemo(() => {
    return Array.from(new Set(contasFiltradas.map(c => c.categoria).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
  }, [contasFiltradas]);

  const contasPorCategoria = useMemo(() => {
    if (!categoriaDre) return [];
    return contasFiltradas.filter(c => c.categoria === categoriaDre);
  }, [contasFiltradas, categoriaDre]);

  useEffect(() => {
    if (lancamento) {
      const valor = lancamento.valor || 0;
      setFormData({
        empresaId: lancamento.empresaId || '',
        contaId: lancamento.contaId || '',
        data: lancamento.data ? new Date(lancamento.data + 'T00:00:00').toISOString().split('T')[0] : '',
        descricao: lancamento.descricao || '',
        valor: valor,
        tipo: fixedTipo || lancamento.tipo || 'Débito',
      });
      setCategoriaDre(contas.find(c => c.id === lancamento.contaId)?.categoria || '');
      setValorFormatado(formatCurrencyInput(valor));
    } else {
      setFormData(getInitialState());
      setValorFormatado('0,00');
      setCategoriaDre('');
    }
  }, [lancamento, empresas, contas, fixedTipo]);

  useEffect(() => {
    if (!fixedTipo) return;
    if (formData.tipo !== fixedTipo) {
      setFormData(prev => ({ ...prev, tipo: fixedTipo }));
    }
  }, [fixedTipo, formData.tipo]);
  
  // Reset contaId if empresa changes and the current contaId is not valid
  useEffect(() => {
    if (categoriaDre && !categoriasDisponiveis.includes(categoriaDre)) {
      setCategoriaDre('');
    }
    if (formData.empresaId && !contasFiltradas.some(c => c.id === formData.contaId)) {
      setFormData(prev => ({ ...prev, contaId: '' }));
    }
  }, [contasFiltradas, formData.contaId, formData.empresaId, categoriaDre, categoriasDisponiveis]);

  useEffect(() => {
    if (!formData.contaId) return;
    const contaAtual = contasFiltradas.find(c => c.id === formData.contaId);
    if (contaAtual && contaAtual.categoria !== categoriaDre) {
      setCategoriaDre(contaAtual.categoria);
    }
  }, [formData.contaId, contasFiltradas, categoriaDre]);

  useEffect(() => {
    if (!formData.contaId) return;
    const contaAtual = contasFiltradas.find(c => c.id === formData.contaId);
    if (!contaAtual) return;
    if (categoriaDre && contaAtual.categoria !== categoriaDre) {
      setFormData(prev => ({ ...prev, contaId: '' }));
    }
  }, [categoriaDre, formData.contaId, contasFiltradas]);

  // Função para formatar valor como moeda para exibição
  const formatCurrencyInput = (value: number): string => {
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Função para converter string formatada para número
  const parseCurrencyInput = (value: string): number => {
    const cleanValue = value.replace(/[^\d,]/g, '').replace(',', '.');
    return parseFloat(cleanValue) || 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'number' ? (value === '' ? 0 : parseFloat(value)) : value 
    }));
  };

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    // Remove tudo exceto números
    const numbersOnly = value.replace(/[^\d]/g, '');
    
    if (numbersOnly === '') {
      setValorFormatado('0,00');
      setFormData(prev => ({ ...prev, valor: 0 }));
      return;
    }
    
    // Converte para centavos e depois para reais
    const cents = parseInt(numbersOnly);
    const reais = cents / 100;
    
    // Formata com separadores de milhares e vírgula decimal
    const formatted = reais.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    setValorFormatado(formatted);
    setFormData(prev => ({ ...prev, valor: reais }));
  };

  const validateForm = () => {
    if (!user) {
      setError('Você precisa estar logado para salvar.');
      return false;
    }
    if (!formData.empresaId) {
      setError('Por favor, selecione uma empresa.');
      return false;
    }
    if (!formData.contaId) {
      setError('Por favor, selecione uma conta contábil.');
      return false;
    }
    if (!formData.data) {
      setError('Por favor, informe a data do lançamento.');
      return false;
    }
    if (!formData.descricao.trim()) {
      setError('Por favor, informe a descrição do lançamento.');
      return false;
    }
    if (formData.valor <= 0) {
      setError('O valor deve ser maior que zero.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const dataToSave = {
        user_id: user!.id,
        empresa_id: formData.empresaId,
        conta_id: formData.contaId,
        data: formData.data,
        descricao: formData.descricao.trim(),
        valor: formData.valor,
        tipo: formData.tipo,
      };

      let response;
      if (lancamento) {
        response = await supabase
          .from('lancamentos')
          .update(dataToSave)
          .eq('id', lancamento.id);
      } else {
        response = await supabase
          .from('lancamentos')
          .insert(dataToSave);
      }

      if (response.error) {
        throw response.error;
      }

      onSave();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar lançamento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="text-red-500 bg-red-50 p-3 rounded-md border border-red-200">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Empresa *
          </label>
          <select 
            name="empresaId" 
            value={formData.empresaId} 
            onChange={handleChange} 
            required 
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="" disabled>Selecione uma empresa</option>
            {empresas.map(e => (
              <option key={e.id} value={e.id}>{e.razaoSocial}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Categoria DRE *
          </label>
          <select
            value={categoriaDre}
            onChange={(e) => {
              setCategoriaDre(e.target.value);
              setFormData(prev => ({ ...prev, contaId: '' }));
            }}
            required
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            disabled={!formData.empresaId || categoriasDisponiveis.length === 0}
          >
            <option value="" disabled>
              {!formData.empresaId
                ? 'Selecione uma empresa primeiro'
                : categoriasDisponiveis.length === 0
                  ? 'Nenhuma categoria disponível'
                  : 'Selecione uma categoria'
              }
            </option>
            {categoriasDisponiveis.map(categoria => (
              <option key={categoria} value={categoria}>{categoria}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Conta Contábil (Analítica) *
          </label>
          <select 
            name="contaId" 
            value={formData.contaId} 
            onChange={handleChange} 
            required 
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" 
            disabled={!formData.empresaId || !categoriaDre || contasPorCategoria.length === 0}
          >
            <option value="" disabled>
              {!formData.empresaId 
                ? 'Selecione uma empresa primeiro' 
                : !categoriaDre
                  ? 'Selecione uma categoria primeiro'
                  : contasPorCategoria.length === 0 
                    ? 'Nenhuma conta disponível nesta categoria' 
                    : 'Selecione uma conta'
              }
            </option>
            {contasPorCategoria.map(c => (
              <option key={c.id} value={c.id}>
                {c.codigo} - {c.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Data *
          </label>
          <input 
            type="date" 
            name="data" 
            value={formData.data} 
            onChange={handleChange} 
            required 
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Valor *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R$</span>
            <input 
              type="text" 
              name="valor" 
              value={valorFormatado} 
              onChange={handleValorChange} 
              required 
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 pl-10 pr-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="0,00"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Descrição *
        </label>
        <input 
          type="text" 
          name="descricao" 
          value={formData.descricao} 
          onChange={handleChange} 
          required 
          maxLength={255}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="Descrição do lançamento"
        />
      </div>
      
      {!fixedTipo && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo *
          </label>
          <div className="mt-2 space-x-6">
            <label className="inline-flex items-center">
              <input 
                type="radio" 
                name="tipo" 
                value="Débito" 
                checked={formData.tipo === 'Débito'} 
                onChange={handleChange} 
                className="form-radio text-red-600 focus:ring-red-500"
              />
              <span className="ml-2 text-gray-700">Débito</span>
            </label>
            <label className="inline-flex items-center">
              <input 
                type="radio" 
                name="tipo" 
                value="Crédito" 
                checked={formData.tipo === 'Crédito'} 
                onChange={handleChange} 
                className="form-radio text-green-600 focus:ring-green-500"
              />
              <span className="ml-2 text-gray-700">Crédito</span>
            </label>
          </div>
        </div>
      )}

      <div className="flex justify-end space-x-3 pt-4 border-t mt-6">
        <button 
          type="button" 
          onClick={onClose} 
          className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
          disabled={loading}
        >
          Cancelar
        </button>
        <button 
          type="submit" 
          disabled={loading} 
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
        >
          {loading ? 'Salvando...' : (lancamento ? 'Atualizar' : 'Salvar') + ' Lançamento'}
        </button>
      </div>
    </form>
  );
};
