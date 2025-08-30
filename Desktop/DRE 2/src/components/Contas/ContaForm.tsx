import React, { useState, useEffect } from 'react';
import { ContaContabil, Empresa, ContaCategoria } from '../../types';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { Sparkles, HelpCircle, X } from 'lucide-react';
import { DicasRapidas } from './DicasRapidas';
import { CategoriasGuide } from './CategoriasGuide';
import { Modal } from '../ui/Modal';

interface ContaFormProps {
  conta?: ContaContabil | null;
  empresas: Empresa[];
  contas: ContaContabil[];
  onSave: () => void;
  onClose: () => void;
}

const categorias: ContaCategoria[] = [
  'Receita Bruta',
  'Deduções e Impostos',
  'Custo dos Produtos Vendidos',
  'Despesas Comerciais',
  'Despesas Administrativas',
  'Outras Despesas Operacionais',
  'Receitas Financeiras',
  'Despesas Financeiras',
  'Impostos sobre Lucro'
];

export const ContaForm: React.FC<ContaFormProps> = ({ conta, empresas, contas, onSave, onClose }) => {
  const { user } = useAuth();

  const getInitialState = () => ({
    empresaId: empresas.length > 0 ? empresas[0].id : '',
    codigo: '',
    nome: '',
    categoria: 'Receita Bruta' as ContaCategoria,
    subcategoria: '',
    tipo: 'Analítica' as 'Analítica' | 'Sintética',
    ativa: true,
  });

  const [formData, setFormData] = useState(getInitialState());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    if (conta) {
      setFormData({
        empresaId: conta.empresaId || '',
        codigo: conta.codigo || '',
        nome: conta.nome || '',
        categoria: conta.categoria || 'Receita Bruta',
        subcategoria: conta.subcategoria || '',
        tipo: conta.tipo || 'Analítica',
        ativa: conta.ativa ?? true,
      });
    } else {
      const initialState = getInitialState();
      setFormData(initialState);
      
      // Gerar código automaticamente para nova conta
      if (initialState.empresaId && initialState.categoria) {
        setTimeout(() => {
          generateCodeForCategoryAndCompany(initialState.categoria, initialState.empresaId);
        }, 100);
      }
    }
  }, [conta, empresas, contas]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
        const { checked } = e.target as HTMLInputElement;
        setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
        
        // Se a categoria foi alterada, gerar código automaticamente
        if (name === 'categoria' && formData.empresaId) {
          setTimeout(() => {
            generateCodeForCategory(value as ContaCategoria);
          }, 0);
        }
        
        // Se a empresa foi alterada, gerar código para a categoria atual
        if (name === 'empresaId' && formData.categoria) {
          setTimeout(() => {
            const newFormData = { ...formData, empresaId: value };
            generateCodeForCategoryAndCompany(formData.categoria, value);
          }, 0);
        }
    }
  };

  const generateCodeForCategory = (categoria: ContaCategoria) => {
    if (!formData.empresaId) {
      return;
    }
    generateCodeForCategoryAndCompany(categoria, formData.empresaId);
  };

  const generateCodeForCategoryAndCompany = (categoria: ContaCategoria, empresaId: string) => {
    if (!empresaId) {
      return;
    }

    // Códigos base por categoria seguindo padrão DRE
    const codigosBasePorCategoria: Record<string, string[]> = {
      'Receita Bruta': ['3.1.1.01', '3.1.1.02', '3.1.2.01', '3.1.3.01'],
      'Deduções e Impostos': ['3.2.1.01', '3.2.1.02', '3.2.1.03', '3.2.2.01'],
      'Custo dos Produtos Vendidos': ['4.1.1.01', '4.1.1.02', '4.1.2.01', '4.1.3.01'],
      'Despesas Comerciais': ['4.2.1.01', '4.2.1.02', '4.2.2.01', '4.2.3.01'],
      'Despesas Administrativas': ['4.2.2.01', '4.2.2.02', '4.2.2.03', '4.2.2.04'],
      'Outras Despesas Operacionais': ['4.2.3.01', '4.2.3.02', '4.2.3.03', '4.2.4.01'],
      'Receitas Financeiras': ['3.3.1.01', '3.3.1.02', '3.3.2.01', '3.3.3.01'],
      'Despesas Financeiras': ['4.3.1.01', '4.3.1.02', '4.3.2.01', '4.3.3.01'],
      'Impostos sobre Lucro': ['4.4.1.01', '4.4.1.02', '4.4.2.01', '4.4.3.01']
    };

    const codigosBase = codigosBasePorCategoria[categoria] || ['1.1.1.01'];
    const companyAccounts = contas.filter(c => c.empresaId === empresaId && c.categoria === categoria);
    
    // Se não há contas da categoria, usar o primeiro código base
    if (companyAccounts.length === 0) {
      setFormData(prev => ({ ...prev, codigo: codigosBase[0] }));
      return;
    }

    // Buscar códigos já utilizados da categoria
    const codigosUtilizados = new Set(companyAccounts.map(c => c.codigo));
    
    // Tentar usar um dos códigos base disponíveis
    for (const codigoBase of codigosBase) {
      if (!codigosUtilizados.has(codigoBase)) {
        setFormData(prev => ({ ...prev, codigo: codigoBase }));
        return;
      }
    }

    // Se todos os códigos base estão em uso, gerar próximo código sequencial
    // Pegar o padrão do último código base (ex: 3.1.1.XX)
    const ultimoCodigoBase = codigosBase[codigosBase.length - 1];
    const partesUltimoCodigo = ultimoCodigoBase.split('.');
    const prefixo = partesUltimoCodigo.slice(0, -1).join('.');
    
    // Encontrar o maior número final usado no padrão
    let maiorNumero = 0;
    companyAccounts.forEach(conta => {
      if (conta.codigo.startsWith(prefixo + '.')) {
        const partes = conta.codigo.split('.');
        const ultimoNumero = parseInt(partes[partes.length - 1], 10);
        if (!isNaN(ultimoNumero) && ultimoNumero > maiorNumero) {
          maiorNumero = ultimoNumero;
        }
      }
    });

    const proximoNumero = (maiorNumero + 1).toString().padStart(2, '0');
    const novoCodigo = `${prefixo}.${proximoNumero}`;
    
    setFormData(prev => ({ ...prev, codigo: novoCodigo }));
  };

  const handleGenerateCode = () => {
    if (!formData.empresaId) {
      alert('Por favor, selecione uma empresa primeiro.');
      return;
    }

    if (!formData.categoria) {
      alert('Por favor, selecione uma categoria primeiro.');
      return;
    }

    // Códigos base por categoria seguindo padrão DRE
    const codigosBasePorCategoria: Record<string, string[]> = {
      'Receita Bruta': ['3.1.1.01', '3.1.1.02', '3.1.2.01', '3.1.3.01'],
      'Deduções e Impostos': ['3.2.1.01', '3.2.1.02', '3.2.1.03', '3.2.2.01'],
      'Custo dos Produtos Vendidos': ['4.1.1.01', '4.1.1.02', '4.1.2.01', '4.1.3.01'],
      'Despesas Comerciais': ['4.2.1.01', '4.2.1.02', '4.2.2.01', '4.2.3.01'],
      'Despesas Administrativas': ['4.2.2.01', '4.2.2.02', '4.2.2.03', '4.2.2.04'],
      'Outras Despesas Operacionais': ['4.2.3.01', '4.2.3.02', '4.2.3.03', '4.2.4.01'],
      'Receitas Financeiras': ['3.3.1.01', '3.3.1.02', '3.3.2.01', '3.3.3.01'],
      'Despesas Financeiras': ['4.3.1.01', '4.3.1.02', '4.3.2.01', '4.3.3.01'],
      'Impostos sobre Lucro': ['4.4.1.01', '4.4.1.02', '4.4.2.01', '4.4.3.01']
    };

    const codigosBase = codigosBasePorCategoria[formData.categoria] || ['1.1.1.01'];
    const companyAccounts = contas.filter(c => c.empresaId === formData.empresaId && c.categoria === formData.categoria);
    
    // Se não há contas da categoria, usar o primeiro código base
    if (companyAccounts.length === 0) {
      setFormData(prev => ({ ...prev, codigo: codigosBase[0] }));
      return;
    }

    // Buscar códigos já utilizados da categoria
    const codigosUtilizados = new Set(companyAccounts.map(c => c.codigo));
    
    // Tentar usar um dos códigos base disponíveis
    for (const codigoBase of codigosBase) {
      if (!codigosUtilizados.has(codigoBase)) {
        setFormData(prev => ({ ...prev, codigo: codigoBase }));
        return;
      }
    }

    // Se todos os códigos base estão em uso, gerar próximo código sequencial
    // Pegar o padrão do último código base (ex: 3.1.1.XX)
    const ultimoCodigoBase = codigosBase[codigosBase.length - 1];
    const partesUltimoCodigo = ultimoCodigoBase.split('.');
    const prefixo = partesUltimoCodigo.slice(0, -1).join('.');
    
    // Encontrar o maior número final usado no padrão
    let maiorNumero = 0;
    companyAccounts.forEach(conta => {
      if (conta.codigo.startsWith(prefixo + '.')) {
        const partes = conta.codigo.split('.');
        const ultimoNumero = parseInt(partes[partes.length - 1], 10);
        if (!isNaN(ultimoNumero) && ultimoNumero > maiorNumero) {
          maiorNumero = ultimoNumero;
        }
      }
    });

    const proximoNumero = (maiorNumero + 1).toString().padStart(2, '0');
    const novoCodigo = `${prefixo}.${proximoNumero}`;
    
    setFormData(prev => ({ ...prev, codigo: novoCodigo }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('Você precisa estar logado para salvar.');
      return;
    }
    if (!formData.empresaId) {
        setError('Por favor, selecione uma empresa.');
        return;
    }
    setLoading(true);
    setError(null);

    const dataToSave = {
      user_id: user.id,
      empresa_id: formData.empresaId,
      codigo: formData.codigo,
      nome: formData.nome,
      categoria: formData.categoria,
      subcategoria: formData.subcategoria || null,
      tipo: formData.tipo,
      ativa: formData.ativa,
    };

    let response;
    if (conta) {
      response = await supabase.from('contas_contabeis').update(dataToSave).eq('id', conta.id);
    } else {
      response = await supabase.from('contas_contabeis').insert(dataToSave);
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
      {error && <p className="text-red-500 bg-red-50 p-3 rounded-md">{error}</p>}
      
      <div>
        <label className="block text-sm font-medium text-gray-700">Empresa</label>
        <select name="empresaId" value={formData.empresaId} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
          <option value="" disabled>Selecione uma empresa</option>
          {empresas.map(e => <option key={e.id} value={e.id}>{e.razaoSocial}</option>)}
        </select>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700">Categoria DRE</label>
          <button
            type="button"
            onClick={() => setShowGuide(true)}
            className="text-green-600 hover:text-green-700 flex items-center space-x-1 text-sm font-medium transition-colors"
          >
            <HelpCircle className="h-4 w-4" />
            <span>Guia das Categorias</span>
          </button>
        </div>
        <select name="categoria" value={formData.categoria} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
          {categorias.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
        
        {/* Dicas rápidas baseadas na categoria selecionada */}
        <DicasRapidas categoria={formData.categoria} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Código da Conta</label>
          <div className="relative mt-1">
            <input
              type="text"
              name="codigo"
              value={formData.codigo}
              onChange={handleChange}
              required
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 pr-10"
            />
            <button
              type="button"
              onClick={handleGenerateCode}
              className="absolute inset-y-0 right-0 flex items-center px-2 text-gray-500 hover:text-blue-600 transition-colors"
              title="Gerar código sequencial"
            >
              <Sparkles className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Nome da Conta</label>
          <input type="text" name="nome" value={formData.nome} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Subcategoria (Opcional)</label>
        <input type="text" name="subcategoria" value={formData.subcategoria || ''} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Tipo da Conta</label>
          <div className="mt-2 space-x-4">
            <label className="inline-flex items-center">
              <input type="radio" name="tipo" value="Analítica" checked={formData.tipo === 'Analítica'} onChange={handleChange} className="form-radio text-blue-600"/>
              <span className="ml-2">Analítica</span>
            </label>
            <label className="inline-flex items-center">
              <input type="radio" name="tipo" value="Sintética" checked={formData.tipo === 'Sintética'} onChange={handleChange} className="form-radio text-blue-600"/>
              <span className="ml-2">Sintética</span>
            </label>
          </div>
        </div>
        <div className="flex items-center justify-start pt-6">
          <input type="checkbox" name="ativa" checked={formData.ativa} onChange={handleChange} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"/>
          <label className="ml-2 block text-sm font-medium text-gray-900">Conta Ativa</label>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t mt-6">
        <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300">
          Cancelar
        </button>
        <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-400">
          {loading ? 'Salvando...' : 'Salvar Conta'}
        </button>
      </div>

      {/* Modal do Guia de Categorias */}
      <Modal 
        isOpen={showGuide} 
        onClose={() => setShowGuide(false)} 
        title="" 
        size="full"
      >
        <div className="relative">
          <button
            onClick={() => setShowGuide(false)}
            className="absolute top-0 right-0 p-2 text-gray-400 hover:text-gray-600 touch-manipulation"
          >
            <X className="h-6 w-6" />
          </button>
          <CategoriasGuide />
        </div>
      </Modal>
    </form>
  );
};
