import React, { useMemo, useRef, useState, useEffect } from 'react';
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

const categoriasTop: ContaCategoria[] = [
  '1. Receita Bruta',
  '2. Deduções e Impostos sobre Vendas',
  '3. Custo dos Produtos Vendidos (CPV)',
  '4. Despesas com Pessoal',
  '5. Despesas Administrativas',
  '6. Despesas Operacionais',
  '7. Despesas Comerciais / Marketing',
  '8. Receitas Financeiras',
  '9. Despesas Financeiras',
  '10. Impostos sobre o Lucro',
  '11. Remuneração e Retirada de Sócios (fora da DRE operacional)',
];

const categorias: ContaCategoria[] = [
  '1. Receita Bruta',
  '1.1 Venda de Bebidas',
  '1.1.1 Cervejas',
  '1.1.2 Drinks',
  '1.1.3 Destilados',
  '1.1.4 Vinhos',
  '1.1.5 Bebidas Não Alcoólicas',
  '1.2 Venda de Alimentos',
  '1.2.1 Petiscos',
  '1.2.2 Pratos',
  '1.2.3 Sobremesas',
  '1.3 Serviços',
  '1.3.1 Couvert Artístico',
  '1.3.2 Taxa de Serviço (10%)',
  '1.3.3 Reservas / Eventos',

  '2. Deduções e Impostos sobre Vendas',
  '2.1 Taxas de Cartão',
  '2.1.1 Débito',
  '2.1.2 Crédito à Vista',
  '2.1.3 Crédito Parcelado',
  '2.1.4 Pix',
  '2.1.5 Vale Alimentação',
  '2.1.6 Conta Assinada',
  '2.2 Aplicativos / Intermediadores',
  '2.2.1 iFood',
  '2.2.2 Rappi',
  '2.2.3 Outros',
  '2.3 Impostos sobre Vendas',
  '2.3.1 ICMS',
  '2.3.2 ISS',
  '2.3.3 Simples Nacional',
  '2.4 Cancelamentos e Estornos',

  '3. Custo dos Produtos Vendidos (CPV)',
  '3.1 Bebidas – Insumos',
  '3.1.1 Cervejas',
  '3.1.2 Destilados',
  '3.1.3 Vinhos',
  '3.1.4 Xaropes / Essências',
  '3.2 Alimentos – Insumos',
  '3.2.1 Carnes',
  '3.2.2 Frios',
  '3.2.3 Pães',
  '3.2.4 Congelados',
  '3.3 Insumos Operacionais',
  '3.3.1 Gelo',
  '3.3.2 Copos Descartáveis',
  '3.3.3 Canudos',
  '3.3.4 Guardanapos',
  '3.4 Perdas',
  '3.4.1 Quebras',
  '3.4.2 Vencimentos',
  '3.4.3 Desperdícios',

  '4. Despesas com Pessoal',
  '4.1 Salários Operacionais',
  '4.1.1 Garçons',
  '4.1.2 Bartenders',
  '4.1.3 Cozinha',
  '4.2 Salários de Gestão',
  '4.2.1 Gerente Operacional (CLT)',
  '4.2.2 Subgerente',
  '4.2.3 Líder de Turno',
  '4.3 Encargos Trabalhistas',
  '4.3.1 INSS',
  '4.3.2 FGTS',
  '4.3.3 Provisões Trabalhistas',
  '4.4 Benefícios',
  '4.4.1 Vale Transporte',
  '4.4.2 Alimentação',
  '4.4.3 Plano de Saúde',
  '4.5 Pró-labore de Gestão (não sócio)',
  '4.5.1 Pró-labore Gerente Operacional',
  '4.6 Extras',
  '4.6.1 Horas Extras',
  '4.6.2 Freelancers',

  '5. Despesas Administrativas',
  '5.1 Estrutura',
  '5.1.1 Aluguel',
  '5.1.2 Condomínio',
  '5.2 Serviços Administrativos',
  '5.2.1 Contabilidade',
  '5.2.2 Internet / Telefonia',
  '5.2.3 Sistemas / PDV',
  '5.3 Materiais',
  '5.3.1 Material de Escritório',

  '6. Despesas Operacionais',
  '6.1 Utilidades',
  '6.1.1 Energia Elétrica',
  '6.1.2 Água',
  '6.1.3 Gás',
  '6.2 Manutenção',
  '6.2.1 Equipamentos',
  '6.2.2 Instalações',
  '6.3 Serviços Operacionais',
  '6.3.1 Limpeza',
  '6.3.2 Segurança',
  '6.3.3 Dedetização',
  '6.4 Licenças e Taxas',
  '6.4.1 Alvará',
  '6.4.2 Vigilância Sanitária',
  '6.4.3 ECAD',

  '7. Despesas Comerciais / Marketing',
  '7.1 Marketing Digital',
  '7.1.1 Anúncios Online',
  '7.1.2 Redes Sociais',
  '7.2 Promoções',
  '7.2.1 Eventos',
  '7.2.2 Ações Promocionais',

  '8. Receitas Financeiras',
  '8.1 Juros Recebidos',
  '8.2 Cashback',
  '8.3 Rendimentos Bancários',

  '9. Despesas Financeiras',
  '9.1 Taxas Bancárias',
  '9.2 Juros de Empréstimos',
  '9.3 Antecipação de Recebíveis',
  '9.4 Multas e Encargos',

  '10. Impostos sobre o Lucro',
  '10.1 IRPJ',
  '10.2 CSLL',

  '11. Remuneração e Retirada de Sócios (fora da DRE operacional)',
  '11.1 Pró-labore de Sócios',
  '11.2 Distribuição de Lucros',
  '11.3 Retiradas Eventuais',
];

export const ContaForm: React.FC<ContaFormProps> = ({ conta, empresas, contas, onSave, onClose }) => {
  const { user } = useAuth();

  type DreCategoriaRow = { id: string; parent_id: string | null; codigo: string; nome: string };
  type DreCategoriasMode = 'config' | 'legacy';
  const [dreCategoriasConfig, setDreCategoriasConfig] = useState<DreCategoriaRow[]>([]);
  const [dreCategoriasMode, setDreCategoriasMode] = useState<DreCategoriasMode>('legacy');
  const initCategoriaFromConfigRef = useRef(false);

  const principalLabel = (codigo: string, nome: string) => `${codigo}. ${nome}`;
  const subLabel = (codigo: string, nome: string) => `${codigo} ${nome}`;

  const principaisConfig = useMemo(() => {
    return dreCategoriasConfig
      .filter((r) => r.parent_id === null)
      .sort((a, b) => a.codigo.localeCompare(b.codigo));
  }, [dreCategoriasConfig]);

  const subsByPrincipalId = useMemo(() => {
    const map = new Map<string, DreCategoriaRow[]>();
    for (const r of dreCategoriasConfig) {
      if (!r.parent_id) continue;
      const list = map.get(r.parent_id) || [];
      list.push(r);
      map.set(r.parent_id, list);
    }
    for (const [key, list] of map.entries()) {
      list.sort((a, b) => a.codigo.localeCompare(b.codigo));
      map.set(key, list);
    }
    return map;
  }, [dreCategoriasConfig]);

  const getInitialState = () => ({
    empresaId: empresas.length > 0 ? empresas[0].id : '',
    codigo: '',
    nome: '',
    categoria: '1. Receita Bruta' as ContaCategoria,
    tipo: 'Analítica' as 'Analítica' | 'Sintética',
    ativa: true,
  });

  const [formData, setFormData] = useState(getInitialState());
  const [categoriaGrupo, setCategoriaGrupo] = useState<ContaCategoria>('1. Receita Bruta');
  const [codigoFoiEditado, setCodigoFoiEditado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    const empresaId = formData.empresaId;
    if (!empresaId) {
      setDreCategoriasConfig([]);
      setDreCategoriasMode('legacy');
      return;
    }

    let cancelled = false;
    const run = async () => {
      const { data, error } = await supabase
        .from('dre_categorias_dre')
        .select('id, parent_id, codigo, nome')
        .eq('empresa_id', empresaId)
        .order('codigo', { ascending: true });

      if (cancelled) return;

      if (error) {
        setDreCategoriasConfig([]);
        const msg = String(error.message || '');
        if (/does not exist/i.test(msg) || /42P01/i.test(msg)) {
          setDreCategoriasMode('legacy');
        } else {
          setDreCategoriasMode('config');
        }
        return;
      }

      setDreCategoriasMode('config');
      setDreCategoriasConfig((data || []) as DreCategoriaRow[]);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [formData.empresaId]);

  useEffect(() => {
    if (conta) {
      setFormData({
        empresaId: conta.empresaId || '',
        codigo: conta.codigo || '',
        nome: conta.nome || '',
        categoria: conta.categoria || '1. Receita Bruta',
        tipo: conta.tipo || 'Analítica',
        ativa: conta.ativa ?? true,
      });
      setCodigoFoiEditado(true);
      const gnum = String(conta.categoria || '').match(/^\s*(\d+)/)?.[1];
      if (gnum) {
        const grp = (hasDreCategoriasConfig ? principaisConfig.map((p) => principalLabel(p.codigo, p.nome)) : categoriasTop).find(c => c.startsWith(gnum + '.')) || '1. Receita Bruta';
        setCategoriaGrupo(grp);
      }
    } else {
      const initialState = getInitialState();
      setFormData(initialState);
      setCategoriaGrupo('1. Receita Bruta');
      setCodigoFoiEditado(false);
      initCategoriaFromConfigRef.current = false;
      
      // Gerar código automaticamente para nova conta
      if (initialState.empresaId && initialState.categoria) {
        setTimeout(() => {
          generateCodeForCategoryAndCompany(initialState.categoria, initialState.empresaId);
        }, 100);
      }
    }
  }, [conta, empresas, contas]);

  useEffect(() => {
    if (conta) return;
    if (dreCategoriasMode !== 'config') return;
    if (!formData.empresaId) return;
    if (initCategoriaFromConfigRef.current) return;

    const principais = principaisConfig.map((p) => principalLabel(p.codigo, p.nome));
    if (principais.length === 0) {
      setCategoriaGrupo('');
      setFormData((prev) => ({ ...prev, categoria: '' as ContaCategoria }));
      initCategoriaFromConfigRef.current = true;
      return;
    }

    const grp = principais[0];
    const subs = getSubcategoriasForGrupo(grp);
    const primeira = subs[0] || grp;
    setCategoriaGrupo(grp);
    setFormData((prev) => ({ ...prev, categoria: primeira }));
    initCategoriaFromConfigRef.current = true;
  }, [conta, dreCategoriasMode, principaisConfig, formData.empresaId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
        const { checked } = e.target as HTMLInputElement;
        setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
        if (name === 'codigo') {
          setCodigoFoiEditado(true);
          setFormData(prev => ({ ...prev, codigo: value }));
          return;
        }

        setFormData(prev => ({ ...prev, [name]: value }));
        
        // Se a categoria foi alterada, gerar código automaticamente
        if (name === 'categoria' && formData.empresaId) {
          setCodigoFoiEditado(false);
          generateCodeForCategoryAndCompany(value as ContaCategoria, formData.empresaId);
        }
        
        // Se a empresa foi alterada, gerar código para a categoria atual
        if (name === 'empresaId' && formData.categoria) {
          setCodigoFoiEditado(false);
          generateCodeForCategoryAndCompany(formData.categoria, value);
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

    if (codigoFoiEditado) {
      return;
    }

    const prefixMatch = String(categoria).match(/^\s*(\d+(?:\.\d+)*)/);
    const prefixo = prefixMatch?.[1];
    if (!prefixo) {
      return;
    }

    const prefixoComPonto = `${prefixo}.`;
    const contasEmpresa = contas.filter(c => c.empresaId === empresaId && typeof c.codigo === 'string' && c.codigo.startsWith(prefixoComPonto));
    let maiorNumero = 0;
    contasEmpresa.forEach(c => {
      const restante = c.codigo.slice(prefixoComPonto.length);
      const primeiroSegmento = restante.split('.')[0];
      const n = parseInt(primeiroSegmento, 10);
      if (!isNaN(n) && n > maiorNumero) {
        maiorNumero = n;
      }
    });

    const proximoNumero = String(maiorNumero + 1).padStart(2, '0');
    setFormData(prev => ({ ...prev, codigo: `${prefixo}.${proximoNumero}` }));
  };

  const getSubcategoriasForGrupo = (grupo: string): string[] => {
    const gnum = String(grupo).match(/^\s*(\d+)/)?.[1] || '';
    if (dreCategoriasMode === 'config') {
      const principal = principaisConfig.find((p) => p.codigo === gnum);
      if (!principal) return [];
      const subs = subsByPrincipalId.get(principal.id) || [];
      return subs.map((s) => subLabel(s.codigo, s.nome));
    }
    const prefix = gnum ? gnum + '.' : '';
    return categorias.filter(c => c.startsWith(prefix) && c !== grupo);
  };

  const handleCategoriaGrupoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const novoGrupo = e.target.value;
    setCategoriaGrupo(novoGrupo);
    const subs = getSubcategoriasForGrupo(novoGrupo);
    const primeira = subs[0] || novoGrupo;
    setFormData(prev => ({ ...prev, categoria: primeira }));
    if (formData.empresaId) {
      setCodigoFoiEditado(false);
      generateCodeForCategoryAndCompany(primeira as ContaCategoria, formData.empresaId);
    }
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

    setCodigoFoiEditado(false);
    generateCodeForCategoryAndCompany(formData.categoria, formData.empresaId);
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
    if (dreCategoriasMode === 'config' && principaisConfig.length === 0) {
      setError('Cadastre as Categorias DRE em Configurações antes de criar contas.');
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
      subcategoria: conta?.subcategoria || null,
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600">Categoria Principal</label>
            <select value={categoriaGrupo} onChange={handleCategoriaGrupoChange} disabled={dreCategoriasMode === 'config' && principaisConfig.length === 0} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500">
              {(dreCategoriasMode === 'config'
                ? (principaisConfig.length > 0 ? principaisConfig.map((p) => principalLabel(p.codigo, p.nome)) : ['Nenhuma categoria cadastrada'])
                : categoriasTop
              ).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600">Subcategoria</label>
            <select name="categoria" value={formData.categoria} onChange={handleChange} required disabled={dreCategoriasMode === 'config' && principaisConfig.length === 0} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500">
              {(
                dreCategoriasMode === 'config' && principaisConfig.length === 0
                  ? ['Cadastre categorias em Configurações']
                  : (getSubcategoriasForGrupo(categoriaGrupo).length > 0 ? getSubcategoriasForGrupo(categoriaGrupo) : [categoriaGrupo])
              ).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
        
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative group">
          <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">Tipo da Conta
            <HelpCircle title="Ajuda: Tipo da Conta" className="h-4 w-4 text-gray-500 hover:text-gray-700" />
          </label>
          <div className="hidden group-hover:flex absolute left-1/2 -translate-x-1/2 top-10 z-50 w-[28rem] max-w-full rounded-md border border-gray-200 bg-white p-4 text-xs text-gray-700 shadow-lg">
            <div className="space-y-1">
              <p><span className="font-medium text-gray-700">Analítica:</span> recebe lançamentos e movimentações. Use quando deseja registrar valores nesta conta.</p>
              <p className="mt-1"><span className="font-medium text-gray-700">Sintética:</span> agrupa contas analíticas e não recebe lançamentos diretamente. Use para organização e consolidação.</p>
              <p className="mt-2 text-[11px] text-gray-500">Observação: os lançamentos só podem ser feitos em contas do tipo Analítica.</p>
            </div>
          </div>
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
