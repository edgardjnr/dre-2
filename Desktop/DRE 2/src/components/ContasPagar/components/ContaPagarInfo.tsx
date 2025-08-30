import React from 'react';
import { ContaPagar, ContaContabil } from '../../../types';
import { format } from 'date-fns';
import { Calendar, DollarSign, Building, FileText, Hash, Image } from 'lucide-react';

interface ContaPagarInfoProps {
  conta: ContaPagar;
  empresa?: { razao_social: string };
  contasContabeis: ContaContabil[];
  onImageClick: (imageUrl: string, imageName: string) => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);

// Remover a função getTipoDocumentoText (linhas 19-25)

export function ContaPagarInfo({ conta, empresa, contasContabeis, onImageClick }: ContaPagarInfoProps) {
  const getContaContabilNome = (contaContabilId: string | null) => {
    if (!contaContabilId) return 'Não definida';
    const contaContabil = contasContabeis.find(c => c.id === contaContabilId);
    return contaContabil ? `${contaContabil.codigo} - ${contaContabil.nome}` : 'Não encontrada';
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
            <p className="text-gray-900">{format(new Date(conta.dataVencimento), 'dd/MM/yyyy')}</p>
          </div>

          {conta.dataPagamento && (
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                <Calendar className="w-4 h-4 mr-2" />
                Data de Pagamento
              </label>
              <p className="text-green-600 font-medium">{format(new Date(conta.dataPagamento), 'dd/MM/yyyy')}</p>
            </div>
          )}
        </div>

        {/* Informações adicionais */}
        <div className="space-y-4">
          {conta.numeroDocumento && (
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                <Hash className="w-4 h-4 mr-2" />
                Descrição
              </label>
              <p className="text-gray-900">{conta.numeroDocumento}</p>
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
                        console.log('DEBUG - Clicking on foto:', { url: foto.fotoUrl, name: foto.fotoNome });
                        onImageClick(foto.fotoUrl, foto.fotoNome);
                      }}
                      className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-lg overflow-hidden hover:bg-gray-200 transition-colors"
                    >
                      <img
                        src={foto.fotoUrl}
                        alt={`Documento ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">
                        {foto.fotoNome}
                      </p>
                      <button
                        onClick={() => onImageClick(foto.fotoUrl, foto.fotoNome)}
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
                      console.log('DEBUG - Clicking on comprovante:', { url: conta.fotoUrl, name: conta.fotoNome || 'Comprovante de Pagamento' });
                      onImageClick(conta.fotoUrl!, conta.fotoNome || 'Comprovante de Pagamento');
                    }}
                    className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-lg overflow-hidden hover:bg-gray-200 transition-colors"
                  >
                    <img
                      src={conta.fotoUrl}
                      alt="Comprovante de Pagamento"
                      className="w-full h-full object-cover"
                    />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">
                      {conta.fotoNome || 'Comprovante de Pagamento'}
                    </p>
                    <button
                      onClick={() => onImageClick(conta.fotoUrl!, conta.fotoNome || 'Comprovante de Pagamento')}
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