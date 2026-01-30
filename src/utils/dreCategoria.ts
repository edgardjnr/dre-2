export const mapContaCategoriaToDreCategoria = (categoria: string): string | null => {
  const categoriaLimpa = String(categoria || '').trim();
  if (!categoriaLimpa) return null;

  const categoriasLegadas = new Set([
    'Receita Bruta',
    'Deduções e Impostos',
    'Custo dos Produtos Vendidos',
    'Despesas Comerciais',
    'Despesas Administrativas',
    'Outras Despesas Operacionais',
    'Receitas Financeiras',
    'Despesas Financeiras',
    'Impostos sobre Lucro'
  ]);
  if (categoriasLegadas.has(categoriaLimpa)) return categoriaLimpa;

  const topLevel = categoriaLimpa.match(/^\s*(\d+)\./)?.[1] || categoriaLimpa.match(/^\s*(\d+)/)?.[1];
  if (!topLevel) return null;

  const top = parseInt(topLevel, 10);
  if (Number.isNaN(top)) return null;

  switch (top) {
    case 1:
      return 'Receita Bruta';
    case 2:
      return 'Deduções e Impostos';
    case 3:
      return 'Custo dos Produtos Vendidos';
    case 4:
      return 'Despesas Administrativas';
    case 5:
      return 'Despesas Administrativas';
    case 6:
      return 'Outras Despesas Operacionais';
    case 7:
      return 'Despesas Comerciais';
    case 8:
      return 'Receitas Financeiras';
    case 9:
      return 'Despesas Financeiras';
    case 10:
      return 'Impostos sobre Lucro';
    case 11:
      return null;
    default:
      return null;
  }
};

export const isReceitaDreCategoria = (categoriaDre: string): boolean => {
  return categoriaDre === 'Receita Bruta' || categoriaDre === 'Receitas Financeiras';
};

