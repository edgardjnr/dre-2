import { useState } from 'react';
import { ContaPagar } from '../../../types';
import { supabase } from '../../../lib/supabaseClient';

export function useDRELancamento(onUpdate?: () => void) {
  const [loading, setLoading] = useState(false);

  const gerarLancamentoDRE = async (conta: ContaPagar) => {
    if (!conta.contaContabilId || conta.lancamentoGeradoId) return;
    
    try {
      setLoading(true);
      
      // Obter o user_id do usuário autenticado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Erro: Usuário não autenticado');
        return;
      }
      
      // Criar lançamento na tabela lancamentos
      const { data: lancamento, error } = await supabase
        .from('lancamentos')
        .insert({
          user_id: user.id,
          empresa_id: conta.empresaId,
          conta_id: conta.contaContabilId,
          descricao: `Conta a pagar: ${conta.descricao}`,
          valor: conta.valor,
          data: conta.dataPagamento || conta.dataVencimento,
          tipo: 'Débito'
        })
        .select()
        .single();
  
      if (error) throw error;
  
      // Atualizar a conta a pagar com o ID do lançamento gerado
      const { error: updateError } = await supabase
        .from('contas_a_pagar')
        .update({ lancamento_gerado_id: lancamento.id })
        .eq('id', conta.id);
  
      if (updateError) throw updateError;
  
      alert('Lançamento DRE gerado com sucesso!');
      onUpdate?.();
    } catch (error: any) {
      console.error('Erro ao gerar lançamento DRE:', error);
      alert('Erro ao gerar lançamento DRE: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const gerarLancamentoDREAutomatico = async (conta: ContaPagar) => {
    if (!conta.contaContabilId || conta.lancamentoGeradoId) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('Usuário não autenticado para gerar lançamento automático');
        return;
      }
      
      const { data: lancamento, error } = await supabase
        .from('lancamentos')
        .insert({
          user_id: user.id,
          empresa_id: conta.empresaId,
          conta_id: conta.contaContabilId,
          descricao: `Conta a pagar: ${conta.descricao}`,
          valor: conta.valor,
          data: conta.dataPagamento || new Date().toISOString().split('T')[0],
          tipo: 'Débito'
        })
        .select()
        .single();
  
      if (error) throw error;
  
      const { error: updateError } = await supabase
        .from('contas_a_pagar')
        .update({ lancamento_gerado_id: lancamento.id })
        .eq('id', conta.id);
  
      if (updateError) throw updateError;
  
      console.log('Lançamento DRE gerado automaticamente!');
    } catch (error: any) {
      console.error('Erro ao gerar lançamento DRE automaticamente:', error);
    }
  };

  return {
    loading,
    gerarLancamentoDRE,
    gerarLancamentoDREAutomatico
  };
}