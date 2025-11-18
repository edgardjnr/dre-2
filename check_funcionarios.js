import { createClient } from '@supabase/supabase-js';

// Configurar Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas!');
  console.log('VITE_SUPABASE_URL:', supabaseUrl ? 'Definida' : 'Não definida');
  console.log('VITE_SUPABASE_ANON_KEY:', supabaseKey ? 'Definida' : 'Não definida');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verificarFuncionarios() {
  try {
    console.log('=== VERIFICAÇÃO DE FUNCIONÁRIOS ===\n');
    
    // Buscar todas as contas contábeis ativas
    const { data: contas, error: contasError } = await supabase
      .from('contas_contabeis')
      .select('*')
      .eq('ativa', true);
    
    if (contasError) {
      console.error('Erro ao buscar contas:', contasError);
      return;
    }
    
    console.log(`TOTAL DE CONTAS ATIVAS: ${contas.length}\n`);
    
    // Listar todas as contas
    console.log('--- TODAS AS CONTAS CONTÁBEIS ---');
    contas.forEach(conta => {
      console.log(`${conta.codigo} - ${conta.nome} (${conta.categoria})`);
    });
    
    // Filtrar contas relacionadas a funcionários
    const funcionariosContas = contas.filter(conta => {
      const nome = conta.nome.toUpperCase();
      return nome.includes('SALÁRIO') || nome.includes('SALARIO') || 
             nome.includes('FOLHA') || nome.includes('ENCARGO') ||
             nome.includes('TRABALHISTA') || nome.includes('CLT') ||
             nome.includes('FÉRIAS') || nome.includes('FERIAS') ||
             nome.includes('13º') || nome.includes('DÉCIMO') ||
             nome.includes('FGTS') || nome.includes('INSS') ||
             nome.includes('VALE TRANSPORTE') || nome.includes('VALE ALIMENTACAO') ||
             nome.includes('BENEFICIO');
    });
    
    console.log('\n--- CONTAS DE FUNCIONÁRIOS ENCONTRADAS ---');
    if (funcionariosContas.length === 0) {
      console.log('❌ NENHUMA conta relacionada a funcionários encontrada!');
    } else {
      console.log(`✅ Encontradas ${funcionariosContas.length} contas de funcionários:`);
      funcionariosContas.forEach(conta => {
        console.log(`  - ${conta.codigo} - ${conta.nome}`);
      });
    }
    
    // Buscar lançamentos de débito de 2024
    const { data: lancamentos, error: lancError } = await supabase
      .from('lancamentos')
      .select('*')
      .eq('tipo', 'Débito')
      .gte('data', '2024-01-01');
    
    if (lancError) {
      console.error('Erro ao buscar lançamentos:', lancError);
      return;
    }
    
    console.log(`\n--- LANÇAMENTOS DE DÉBITO (2024) ---`);
    console.log(`Total de lançamentos: ${lancamentos.length}`);
    
    // Filtrar lançamentos de funcionários
    const lancamentosFuncionarios = lancamentos.filter(lanc => {
      const conta = contas.find(c => c.id === lanc.contaId);
      if (!conta) return false;
      
      const nome = conta.nome.toUpperCase();
      return nome.includes('SALÁRIO') || nome.includes('SALARIO') ||
             nome.includes('FOLHA') || nome.includes('ENCARGO') ||
             nome.includes('TRABALHISTA');
    });
    
    console.log('\n--- LANÇAMENTOS DE FUNCIONÁRIOS ---');
    if (lancamentosFuncionarios.length === 0) {
      console.log('❌ NENHUM lançamento de funcionários encontrado!');
    } else {
      console.log(`✅ Encontrados ${lancamentosFuncionarios.length} lançamentos de funcionários:`);
      lancamentosFuncionarios.forEach(lanc => {
        const conta = contas.find(c => c.id === lanc.contaId);
        console.log(`  - ${conta?.nome}: R$ ${lanc.valor.toFixed(2)} (${lanc.data})`);
      });
    }
    
    // Conclusão
    console.log('\n=== CONCLUSÃO ===');
    if (funcionariosContas.length === 0 && lancamentosFuncionarios.length === 0) {
      console.log('🎯 CONFIRMADO: Não há funcionários no sistema!');
      console.log('   - Nenhuma conta contábil de funcionários');
      console.log('   - Nenhum lançamento de funcionários');
      console.log('   - A categoria "Funcionários" deve ser removida do gráfico');
    } else {
      console.log('⚠️  Há dados de funcionários no sistema');
      if (funcionariosContas.length > 0) {
        console.log(`   - ${funcionariosContas.length} contas de funcionários`);
      }
      if (lancamentosFuncionarios.length > 0) {
        console.log(`   - ${lancamentosFuncionarios.length} lançamentos de funcionários`);
      }
    }
    
  } catch (error) {
    console.error('Erro:', error.message);
  }
}

verificarFuncionarios();