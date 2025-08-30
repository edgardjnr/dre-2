import React, { useState, useEffect } from 'react';
import { Calendar, Download, FileText, TrendingUp, TrendingDown } from 'lucide-react';
import { DREService } from '../../services/dreService';
import { DREPeriodo, Empresa, Lancamento, ContaContabil } from '../../types';
import { supabase } from '../../lib/supabaseClient';
import { Spinner } from '../ui/Spinner';

export const DREReport: React.FC = () => {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [selectedEmpresa, setSelectedEmpresa] = useState('');
  const [dataInicio, setDataInicio] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
  const [dataFim, setDataFim] = useState(new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0]);
  const [dre, setDre] = useState<DREPeriodo | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const fetchEmpresas = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('empresas').select('id, razaoSocial:razao_social');
      if (error) {
        console.error("Erro ao buscar empresas:", error);
      } else {
        setEmpresas(data as unknown as Empresa[]);
        if (data.length > 0) {
          setSelectedEmpresa(data[0].id);
        }
      }
      setLoading(false);
    };
    fetchEmpresas();
  }, []);

  const handleGenerate = async () => {
    if (!selectedEmpresa) {
      alert('Por favor, selecione uma empresa.');
      return;
    }
    setGenerating(true);
    setDre(null);

    const lancamentosPromise = supabase
      .from('lancamentos')
      .select(`
        id,
        user_id,
        created_at,
        empresaId:empresa_id,
        contaId:conta_id,
        data,
        descricao,
        valor,
        tipo
      `)
      .eq('empresa_id', selectedEmpresa)
      .gte('data', dataInicio)
      .lte('data', dataFim);

    const contasPromise = supabase
      .from('contas_contabeis')
      .select(`
        id,
        user_id,
        created_at,
        empresaId:empresa_id,
        codigo,
        nome,
        categoria,
        subcategoria,
        tipo,
        ativa
      `)
      .eq('empresa_id', selectedEmpresa);

    const [lancamentosRes, contasRes] = await Promise.all([lancamentosPromise, contasPromise]);

    if (lancamentosRes.error || contasRes.error) {
      alert('Erro ao buscar dados para o DRE.');
      console.error(lancamentosRes.error || contasRes.error);
      setGenerating(false);
      return;
    }

    const dreGerado = DREService.calcularDRE(
      lancamentosRes.data as unknown as Lancamento[],
      contasRes.data as unknown as ContaContabil[],
      selectedEmpresa,
      dataInicio,
      dataFim
    );
    setDre(dreGerado);
    setGenerating(false);
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const formatPercentage = (value: number) => `${value.toFixed(2)}%`;
  const empresaSelecionada = empresas.find(emp => emp.id === selectedEmpresa);

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Demonstrativo de Resultados</h2>
          <FileText className="h-8 w-8 text-blue-600" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <select value={selectedEmpresa} onChange={(e) => setSelectedEmpresa(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2">
            <option value="">Selecione uma empresa</option>
            {empresas.map(e => <option key={e.id} value={e.id}>{e.razaoSocial}</option>)}
          </select>
          <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2"/>
          <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2"/>
          <button onClick={handleGenerate} disabled={generating} className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2 disabled:bg-blue-400">
            {generating ? <Spinner size="sm"/> : <Calendar className="h-5 w-5" />}
            <span>{generating ? 'Gerando...' : 'Gerar DRE'}</span>
          </button>
        </div>
      </div>

      {generating && <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>}

      {dre && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-fade-in-scale">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">{empresaSelecionada?.razaoSocial}</h3>
              <p className="text-gray-600">Período: {new Date(dataInicio+'T00:00:00').toLocaleDateString('pt-BR')} a {new Date(dataFim+'T00:00:00').toLocaleDateString('pt-BR')}</p>
            </div>
            <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2">
              <Download className="h-5 w-5" /><span>Exportar</span>
            </button>
          </div>

          <div className="space-y-4">
            <div className="border-b pb-2"><div className="flex justify-between py-2"><span className="font-semibold">RECEITA BRUTA</span><span>{formatCurrency(dre.receitaBruta)}</span></div><div className="flex justify-between py-2 text-red-600"><span className="ml-4">(-) Deduções</span><span>({formatCurrency(dre.deducoes)})</span></div><div className="flex justify-between py-2 font-semibold bg-blue-50 px-4 rounded"><span className="text-blue-900">RECEITA LÍQUIDA</span><span className="text-blue-900">{formatCurrency(dre.receitaLiquida)}</span></div></div>
            <div className="border-b pb-2"><div className="flex justify-between py-2 text-red-600"><span>(-) Custos</span><span>({formatCurrency(dre.custos)})</span></div><div className="flex justify-between py-2 font-semibold bg-green-50 px-4 rounded"><span className="text-green-900">LUCRO BRUTO</span><span className="text-green-900">{formatCurrency(dre.lucroBruto)}</span></div><div className="flex justify-between text-sm text-gray-600"><span>Margem Bruta</span><span className="flex items-center">{formatPercentage(dre.margemBruta)} {dre.margemBruta > 0 ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}</span></div></div>
            <div className="border-b pb-2"><div className="py-2"><span className="font-medium">DESPESAS OPERACIONAIS</span></div><div className="flex justify-between py-2 text-red-600"><span className="ml-4">(-) Despesas Operacionais</span><span>({formatCurrency(dre.despesasOperacionais)})</span></div><div className="flex justify-between py-2 font-semibold bg-purple-50 px-4 rounded"><span className="text-purple-900">RESULTADO OPERACIONAL</span><span className="text-purple-900">{formatCurrency(dre.resultadoOperacional)}</span></div><div className="flex justify-between text-sm text-gray-600"><span>Margem Operacional</span><span className="flex items-center">{formatPercentage(dre.margemOperacional)} {dre.margemOperacional > 0 ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}</span></div></div>
            <div className="border-b pb-2"><div className="flex justify-between py-2 text-green-600"><span>(+) Receitas Financeiras</span><span>{formatCurrency(dre.receitasFinanceiras)}</span></div><div className="flex justify-between py-2 text-red-600"><span>(-) Despesas Financeiras</span><span>({formatCurrency(dre.despesasFinanceiras)})</span></div><div className="flex justify-between py-2 font-semibold bg-orange-50 px-4 rounded"><span className="text-orange-900">RESULTADO ANTES DO IR/CSLL</span><span className="text-orange-900">{formatCurrency(dre.resultadoAntesIR)}</span></div></div>
            <div><div className="flex justify-between py-2 text-red-600"><span>(-) Impostos sobre o Lucro</span><span>({formatCurrency(dre.impostosSobreLucro)})</span></div><div className="flex justify-between py-3 font-bold text-lg bg-gray-100 px-4 rounded"><span className="text-gray-900">LUCRO LÍQUIDO</span><span className={dre.lucroLiquido >= 0 ? 'text-green-600' : 'text-red-600'}>{formatCurrency(dre.lucroLiquido)}</span></div><div className="flex justify-between py-2 text-sm text-gray-600"><span>Margem Líquida</span><span className="flex items-center font-medium">{formatPercentage(dre.margemLiquida)} {dre.margemLiquida > 0 ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}</span></div></div>
          </div>
        </div>
      )}
    </div>
  );
};
