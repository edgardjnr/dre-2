import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Building, FileText, DollarSign, Calendar, Hash, Copy, Check, Image, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { ContaPagar, ContaContabil } from '../../../types';
import { supabase } from '../../../lib/supabaseClient';

// Função para formatar data para exibição sem problemas de timezone
const formatDateForDisplay = (dateString: string): Date => {
  if (!dateString) return new Date();
  // Adiciona horário fixo para evitar problemas de timezone na exibição
  return new Date(dateString + 'T00:00:00');
};

// Função para formatar valores monetários
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

// Função para detectar o tipo de documento (Código de Barras ou PIX)
const detectDocumentType = (numeroDocumento: string): string => {
  if (!numeroDocumento) return 'Código de Barras';
  
  const documento = numeroDocumento.trim();
  const apenasDigitos = documento.replace(/\D/g, '');
  console.log('DEBUG - Detectando tipo do documento:', documento);
  
  // Boleto: 44 (código de barras) e 47/48 (linha digitável)
  if (apenasDigitos.length === 44 || apenasDigitos.length === 47 || apenasDigitos.length === 48) {
    console.log('DEBUG - Detectado como Código de Barras (mais de 44 caracteres)');
    return 'Código de Barras';
  }
  
  // Verificar se é CPF (formato: 000.000.000-00 ou 00000000000)
  const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/;
  if (cpfRegex.test(documento)) {
    console.log('DEBUG - Detectado como PIX (CPF)');
    return 'PIX';
  }
  
  // Verificar se é celular brasileiro com diferentes formatos
  // Aceita: (11) 99999-9999, 11 99999-9999, 11999999999, +5511999999999
  const documentoLimpo = documento.replace(/\D/g, '');
  const celularRegex = /^(55)?\d{2}9\d{8}$/;
  if (celularRegex.test(documentoLimpo) && documentoLimpo.length >= 11) {
    console.log('DEBUG - Detectado como PIX (Celular)');
    return 'PIX';
  }
  
  // Verificar se é email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailRegex.test(documento)) {
    console.log('DEBUG - Detectado como PIX (Email)');
    return 'PIX';
  }
  
  // Verificar se é CNPJ (formato: 00.000.000/0000-00 ou 00000000000000)
  // Melhorado para aceitar espaços
  const cnpjLimpo = documento.replace(/[\s.-\/]/g, '');
  const cnpjRegex = /^\d{14}$/;
  if (cnpjRegex.test(cnpjLimpo)) {
    console.log('DEBUG - Detectado como PIX (CNPJ)');
    return 'PIX';
  }
  
  // Verificar se é chave aleatória (UUID ou 32 caracteres alfanuméricos)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const chaveAleatoria32Regex = /^[0-9a-f]{32}$/i;
  if (uuidRegex.test(documento) || chaveAleatoria32Regex.test(documento)) {
    console.log('DEBUG - Detectado como PIX (Chave Aleatória)');
    return 'PIX';
  }
  
  // Padrão: Código de Barras
  console.log('DEBUG - Detectado como Código de Barras (padrão)');
  return 'Código de Barras';
};

interface ContaPagarInfoProps {
  conta: ContaPagar;
  empresa?: { razao_social: string };
  contasContabeis: ContaContabil[];
  onImageClick: (imageUrl: string, imageName: string) => void;
}

export function ContaPagarInfo({ conta, empresa, contasContabeis, onImageClick }: ContaPagarInfoProps) {
  const [copiado, setCopiado] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  const extractStorageKey = (value: string): string | null => {
    const url = String(value || '').trim();
    if (!url) return null;
    if (url.startsWith('data:')) return null;
    if (url.startsWith('http')) {
      const m = url.match(/\/contas-fotos\/(.+)$/);
      return m?.[1] || null;
    }
    return url;
  };

  useEffect(() => {
    const generateSigned = async () => {
      const urls: string[] = [];
      if (conta.fotoUrl) urls.push(conta.fotoUrl);
      if (conta.fotos && conta.fotos.length > 0) {
        urls.push(...conta.fotos.map(f => f.fotoUrl));
      }
      const entries: [string, string][] = [];
      for (const url of urls) {
        const key = extractStorageKey(url);
        if (key) {
          const { data, error } = await supabase.storage.from('contas-fotos').createSignedUrl(key, 60 * 60 * 24 * 7);
          if (!error && data?.signedUrl) {
            entries.push([url, data.signedUrl]);
          }
        }
      }
      if (entries.length > 0) {
        setSignedUrls(prev => {
          const next = { ...prev };
          for (const [orig, signed] of entries) next[orig] = signed;
          return next;
        });
      }
    };
    generateSigned();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conta.fotoUrl, conta.fotos?.length]);

  const getContaContabilNome = (contaContabilId: string | null) => {
    if (!contaContabilId) return 'Não definida';
    const contaContabil = contasContabeis.find(c => c.id === contaContabilId);
    return contaContabil ? `${contaContabil.codigo} - ${contaContabil.nome}` : 'Não encontrada';
  };

  const copiarCodigoBarras = async () => {
    if (!conta.numeroDocumento) return;
    
    try {
      await navigator.clipboard.writeText(conta.numeroDocumento);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch (error) {
      console.error('Erro ao copiar código de barras:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'paga') return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (status === 'vencida') return <AlertTriangle className="w-4 h-4 text-red-600" />;
    return <Clock className="w-4 h-4 text-yellow-600" />;
  };

  const getStatusChipClass = (status: string) => {
    if (status === 'paga') return 'bg-green-100 text-green-800';
    if (status === 'vencida') return 'bg-red-100 text-red-800';
    if (status === 'cancelada') return 'bg-gray-100 text-gray-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Informações principais */}
        <div className="space-y-4">
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
              <Building className="w-4 h-4 mr-2" />
              Fornecedor
            </label>
            <p className="text-gray-900 font-medium">{conta.fornecedor}</p>
            {empresa && (
              <p className="text-sm text-gray-500">{empresa.razao_social}</p>
            )}
          </div>

          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
              <FileText className="w-4 h-4 mr-2" />
              Descrição
            </label>
            <p className="text-gray-900">{conta.descricao}</p>
          </div>

          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
              <DollarSign className="w-4 h-4 mr-2" />
              Valor
            </label>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(conta.valor)}</p>
          </div>

          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
              <Calendar className="w-4 h-4 mr-2" />
              Data de Vencimento
            </label>
            <p className="text-gray-900">{format(formatDateForDisplay(conta.dataVencimento), 'dd/MM/yyyy')}</p>
          </div>

          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
              {getStatusIcon(conta.status)}
              <span className="ml-2">Status</span>
            </label>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusChipClass(conta.status)}`}>
              {conta.status === 'pendente' ? 'Pendente' : conta.status === 'paga' ? 'Paga' : conta.status === 'vencida' ? 'Vencida' : 'Cancelada'}
            </span>
          </div>

          {conta.dataPagamento && (
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                <Calendar className="w-4 h-4 mr-2" />
                Data de Pagamento
              </label>
              <p className="text-green-600 font-medium">{format(formatDateForDisplay(conta.dataPagamento), 'dd/MM/yyyy')}</p>
            </div>
          )}
        </div>

        {/* Informações adicionais */}
        <div className="space-y-4">
          {conta.numeroDocumento && (
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                <Hash className="w-4 h-4 mr-2" />
                {detectDocumentType(conta.numeroDocumento)}
              </label>
              <div className="flex items-center space-x-2">
                <p className="text-gray-900 font-mono text-sm bg-gray-50 px-3 py-2 rounded border flex-1 break-all">
                  {conta.numeroDocumento}
                </p>
                <button
                  onClick={copiarCodigoBarras}
                  className="flex items-center justify-center w-10 h-10 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded border transition-colors"
                  title="Copiar código de barras"
                >
                  {copiado ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
              {copiado && (
                <p className="text-sm text-green-600 mt-1">Código copiado!</p>
              )}
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Conta Contábil
            </label>
            <p className="text-gray-900">{getContaContabilNome(conta.contaContabilId)}</p>
          </div>

          {conta.observacoes && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Observações
              </label>
              <p className="text-gray-900 text-sm">{conta.observacoes}</p>
            </div>
          )}

          {/* Fotos da Conta (Documentos originais) */}
          {conta.fotos && conta.fotos.length > 0 && (
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Image className="w-4 h-4 mr-2" />
                Documentos da Conta
                {conta.fotos.length > 1 && (
                  <span className="ml-1 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    {conta.fotos.length}
                  </span>
                )}
              </label>
              
              <div className="grid grid-cols-2 gap-3 mb-4">
                {conta.fotos.map((foto, index) => (
                  <div key={foto.id} className="flex items-center space-x-3">
                    <button
                      onClick={() => {
                      onImageClick(signedUrls[foto.fotoUrl] || foto.fotoUrl, foto.fotoNome);
                      }}
                      className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-lg overflow-hidden hover:bg-gray-200 transition-colors"
                    >
                      <img
                      src={signedUrls[foto.fotoUrl] || foto.fotoUrl}
                        alt={`Documento ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">
                        {foto.fotoNome}
                      </p>
                      <button
                      onClick={() => onImageClick(signedUrls[foto.fotoUrl] || foto.fotoUrl, foto.fotoNome)}
                        className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        Visualizar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comprovante de Pagamento */}
          {conta.status === 'paga' && (
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Image className="w-4 h-4 mr-2" />
                Comprovante de Pagamento
              </label>
              
              {conta.fotoUrl ? (
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => {
                      onImageClick(signedUrls[conta.fotoUrl!] || conta.fotoUrl!, conta.fotoNome || 'Comprovante de Pagamento');
                    }}
                    className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-lg overflow-hidden hover:bg-gray-200 transition-colors"
                  >
                    <img
                      src={signedUrls[conta.fotoUrl!] || conta.fotoUrl!}
                      alt="Comprovante de Pagamento"
                      className="w-full h-full object-cover"
                    />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">
                      {conta.fotoNome || 'Comprovante de Pagamento'}
                    </p>
                    <button
                      onClick={() => onImageClick(signedUrls[conta.fotoUrl!] || conta.fotoUrl!, conta.fotoNome || 'Comprovante de Pagamento')}
                      className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      Visualizar Comprovante
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0 w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                    <Image className="w-6 h-6 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">
                      Nenhum comprovante anexado
                    </p>
                    <p className="text-xs text-gray-400">
                      Conta marcada como paga sem comprovante
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
