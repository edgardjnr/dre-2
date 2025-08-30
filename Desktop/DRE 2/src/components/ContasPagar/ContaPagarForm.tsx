import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { ContaPagar, ContaPagarFormData, ContaPagarStatus, ContaContabil } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { Building2, FileText, DollarSign, Calendar, Tag, Camera, Upload, X, Check } from 'lucide-react';
import { Spinner } from '../ui/Spinner';

interface ContaPagarFormProps {
  conta?: ContaPagar;
  onSave: () => void;
  onCancel: () => void;
}

export function ContaPagarForm({ conta, onSave, onCancel }: ContaPagarFormProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estado do formulário corrigido
  const [formData, setFormData] = useState<ContaPagarFormData>({
    fornecedor: '',
    valor: 0,
    dataVencimento: '',
    contaContabilId: '',
    numeroDocumento: '',
    observacoes: ''
  });

  // Estado para o valor formatado
  const [valorFormatado, setValorFormatado] = useState<string>('');

  // Estado para empresa selecionada (separado do formData)
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string>('');
  
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [contasContabeis, setContasContabeis] = useState<ContaContabil[]>([]);
  
  // Filtrar contas contábeis por empresa selecionada
  const contasContabeisFiltradas = contasContabeis.filter(
    conta => conta.empresaId === selectedEmpresaId
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  // Estados para suportar múltiplas imagens
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);

  // useEffect corrigido
  useEffect(() => {
    fetchEmpresas();
    fetchContasContabeis();
  }, []);

  // Função para formatar valor como moeda brasileira
  const formatarMoeda = (valor: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor).replace('R$', '').trim();
  };

  // Função para converter string formatada em número
  const desformatarMoeda = (valorFormatado: string): number => {
    const numeroLimpo = valorFormatado
      .replace(/\./g, '') // Remove pontos de milhares
      .replace(',', '.'); // Substitui vírgula por ponto decimal
    return parseFloat(numeroLimpo) || 0;
  };

  // Função para aplicar formatação durante a digitação
  const aplicarFormatacao = (valor: string): string => {
    // Remove tudo que não é dígito
    const apenasNumeros = valor.replace(/\D/g, '');
    
    // Se não há números, retorna vazio
    if (!apenasNumeros) return '';
    
    // Converte para centavos
    const valorEmCentavos = parseInt(apenasNumeros);
    const valorEmReais = valorEmCentavos / 100;
    
    // Formata como moeda brasileira
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(valorEmReais);
  };

  useEffect(() => {
    if (conta) {
      setFormData({
        fornecedor: conta.fornecedor,
        valor: conta.valor,
        dataVencimento: conta.dataVencimento,
        contaContabilId: conta.contaContabilId || '',
        numeroDocumento: conta.numeroDocumento || '',
        observacoes: conta.observacoes || ''
      });
      setSelectedEmpresaId(conta.empresaId);
      setValorFormatado(formatarMoeda(conta.valor));
    }
  }, [conta]);

  const fetchEmpresas = async () => {
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('id, razao_social')
        .eq('ativa', true)
        .order('razao_social');

      if (error) throw error;
      setEmpresas(data || []);
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
      setError('Erro ao carregar empresas');
    }
  };

  const fetchContasContabeis = async () => {
    try {
      const { data, error } = await supabase
        .from('contas_contabeis')
        .select('id, codigo, nome, categoria, empresa_id')
        .eq('ativa', true)
        .order('codigo');

      if (error) throw error;
      setContasContabeis(data?.map(conta => ({
        ...conta,
        empresaId: conta.empresa_id
      })) || []);
    } catch (error) {
      console.error('Erro ao carregar contas contábeis:', error);
      setError('Erro ao carregar contas contábeis');
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Limitar a 2 arquivos
    const newFiles = files.slice(0, 2 - photoFiles.length);
    
    newFiles.forEach(file => {
      if (file.size > 10 * 1024 * 1024) {
        setError('Arquivo muito grande. Máximo 10MB por arquivo.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setPhotoPreviews(prev => [...prev, result]);
      };
      reader.readAsDataURL(file);
    });

    setPhotoFiles(prev => [...prev, ...newFiles]);
    setError(null);
  };

  // Função para remover uma imagem específica
  const removePhoto = (index: number) => {
    setPhotoFiles(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Função para lidar com drag and drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => 
      file.type.startsWith('image/') || file.type === 'application/pdf'
    );

    if (imageFiles.length > 0) {
      const newFiles = imageFiles.slice(0, 2 - photoFiles.length);
      
      newFiles.forEach(file => {
        if (file.size > 10 * 1024 * 1024) {
          setError('Arquivo muito grande. Máximo 10MB por arquivo.');
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          setPhotoPreviews(prev => [...prev, result]);
        };
        reader.readAsDataURL(file);
      });

      setPhotoFiles(prev => [...prev, ...newFiles]);
      setError(null);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const uploadPhotos = async (): Promise<Array<{url: string, name: string}>> => {
    if (photoFiles.length === 0) return [];

    setUploadingPhoto(true);
    try {
      const uploadPromises = photoFiles.map(async (file, index) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${index}.${fileExt}`;
        const filePath = `contas-pagar/${fileName}`;
    
        const { error: uploadError } = await supabase.storage
          .from('contas-fotos')
          .upload(filePath, file);
    
        if (uploadError) throw uploadError;
    
        const { data: { publicUrl } } = supabase.storage
          .from('contas-fotos')
          .getPublicUrl(filePath);
    
        return { url: publicUrl, name: file.name };
      });

      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error('Erro ao fazer upload das fotos:', error);
      throw error;
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
  
    try {
      // Upload das fotos se houver arquivos
      const uploadedPhotos = await uploadPhotos();
  
      // Dados corrigidos para o banco (usando snake_case para colunas do banco)
      const contaData = {
        user_id: user?.id,
        fornecedor: formData.fornecedor,
        descricao: formData.fornecedor,
        valor: Number(formData.valor),
        data_vencimento: formData.dataVencimento,
        conta_contabil_id: formData.contaContabilId || null,
        numero_documento: formData.numeroDocumento || null,
        observacoes: formData.observacoes || null,
        empresa_id: selectedEmpresaId,
        // Manter compatibilidade com foto única (primeira foto)
        foto_url: uploadedPhotos.length > 0 ? uploadedPhotos[0].url : null,
        foto_nome: uploadedPhotos.length > 0 ? uploadedPhotos[0].name : null,
        tipo_documento: 'boleto',
        status: 'pendente' as ContaPagarStatus
      };

      let contaId: string;

      if (conta) {
        const { error } = await supabase
          .from('contas_a_pagar')
          .update(contaData)
          .eq('id', conta.id);

        if (error) throw error;
        contaId = conta.id;

        // Remover fotos antigas se estiver editando
        await supabase
          .from('conta_pagar_fotos')
          .delete()
          .eq('conta_pagar_id', contaId);
      } else {
        const { data, error } = await supabase
          .from('contas_a_pagar')
          .insert([contaData])
          .select('id')
          .single();

        if (error) throw error;
        contaId = data.id;
      }

      // Salvar múltiplas fotos na nova tabela
      if (uploadedPhotos.length > 0) {
        const fotosData = uploadedPhotos.map((photo, index) => ({
          conta_pagar_id: contaId,
          foto_url: photo.url,
          foto_nome: photo.name,
          ordem: index + 1
        }));

        const { error: fotosError } = await supabase
          .from('conta_pagar_fotos')
          .insert(fotosData);

        if (fotosError) throw fotosError;
      }

      onSave();
    } catch (error: any) {
      console.error('Erro ao salvar conta:', error);
      setError(error.message || 'Erro ao salvar conta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* Grid responsivo para campos principais */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Building2 className="inline w-4 h-4 mr-1" />
              Empresa *
            </label>
            <select
              value={selectedEmpresaId}
              onChange={(e) => {
                setSelectedEmpresaId(e.target.value);
                setFormData(prev => ({ ...prev, contaContabilId: '' })); // Limpar conta contábil ao trocar empresa
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
              required
            >
              <option value="">Selecione uma empresa</option>
              {empresas.map(empresa => (
                <option key={empresa.id} value={empresa.id}>
                  {empresa.razao_social}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="inline w-4 h-4 mr-1" />
              Fornecedor *
            </label>
            <input
              type="text"
              value={formData.fornecedor}
              onChange={(e) => setFormData(prev => ({ ...prev, fornecedor: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
              placeholder="Nome do fornecedor"
              required
            />
          </div>


          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <DollarSign className="inline w-4 h-4 mr-1" />
              Valor *
            </label>
            <input
              type="text"
              value={valorFormatado}
              onChange={(e) => {
                const valorDigitado = e.target.value;
                const valorFormatadoNovo = aplicarFormatacao(valorDigitado);
                setValorFormatado(valorFormatadoNovo);
                
                // Atualiza o valor numérico no formData
                const valorNumerico = desformatarMoeda(valorFormatadoNovo);
                setFormData(prev => ({ ...prev, valor: valorNumerico }));
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
              placeholder="0,00"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="inline w-4 h-4 mr-1" />
              Data de Vencimento *
            </label>
            <input
              type="date"
              value={formData.dataVencimento}
              onChange={(e) => setFormData(prev => ({ ...prev, dataVencimento: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
              required
            />
          </div>

          
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Tag className="inline w-4 h-4 mr-1" />
                Conta Contábil
              </label>
              <select
                value={formData.contaContabilId || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, contaContabilId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
              >
                <option value="">Selecione uma conta contábil</option>
                {contasContabeisFiltradas.map(conta => (
                  <option key={conta.id} value={conta.id}>
                    {conta.codigo} - {conta.nome}
                  </option>
                ))}
              </select>
            </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrição
            </label>
            <input
              type="text"
              value={formData.numeroDocumento || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, numeroDocumento: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
              placeholder="Descrição da conta"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Observações
          </label>
          <textarea
            value={formData.observacoes || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
            rows={3}
            placeholder="Observações adicionais"
          />
        </div>

        {/* Seção de Upload de Fotos */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Camera className="inline w-4 h-4 mr-1" />
            Comprovante (Opcional)
          </label>
          
          {/* Input de arquivo oculto */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            multiple
            onChange={handleFileInputChange}
            className="hidden"
          />
          
          {/* Área de drag and drop */}
          <div
            className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
              dragActive 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {photoPreviews.length > 0 ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {photoPreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                {photoPreviews.length < 2 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    + Adicionar mais fotos (máx. 2)
                  </button>
                )}
              </div>
            ) : (
              <div className="py-8">
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-600 mb-2">Arraste arquivos aqui ou</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  clique para selecionar
                </button>
                <p className="text-xs text-gray-500 mt-2">
                  Máximo 2 arquivos, 10MB cada (JPG, PNG, PDF)
                </p>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors text-sm sm:text-base"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading || uploadingPhoto}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base flex items-center justify-center gap-2"
          >
            {loading || uploadingPhoto ? (
              <>
                <Spinner size="sm" />
                {uploadingPhoto ? 'Enviando foto...' : 'Salvando...'}
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                {conta ? 'Atualizar' : 'Salvar'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}