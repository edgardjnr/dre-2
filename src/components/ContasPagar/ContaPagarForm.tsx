import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { ContaPagar, ContaPagarFormData, ContaPagarStatus, ContaContabil } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { Building2, FileText, DollarSign, Calendar, Tag, Camera, Upload, X, Check, Barcode } from 'lucide-react';
import { toast } from 'sonner';
import { Spinner } from '../ui/Spinner';
import { useDebounce } from '../../hooks/useDebounce';
import { applyDateMask, isValidDate, convertToISODate, convertFromISODate, formatDateForDatabase } from '../../utils/dateUtils';
import { DatePicker } from '../ui/DatePicker';

interface ContaPagarFormProps {
  conta?: ContaPagar;
  onSave: () => void;
  onCancel: () => void;
}

export function ContaPagarForm({ conta, onSave, onCancel }: ContaPagarFormProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Função para garantir que a data seja salva sem conversão de timezone
  const formatDateForDatabase = (dateString: string): string => {
    if (!dateString) return dateString;
    
    // Se a data já está no formato correto (YYYY-MM-DD), retorna como está
    // Isso evita conversões de timezone desnecessárias
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (dateRegex.test(dateString)) {
      return dateString;
    }
    
    // Se por algum motivo a data não está no formato esperado, 
    // cria uma nova data e formata corretamente
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  };
  
  // Listener para receber dados do scanner
  useEffect(() => {
    const handleBarcodeDetected = (event: CustomEvent) => {
      const codigo = event.detail;
      setFormData(prev => ({ ...prev, numeroDocumento: codigo }));
      const novoTipo = detectarTipoDocumento(codigo);
      setTipoDocumento(novoTipo);
    };
    
    window.addEventListener('barcodeDetected', handleBarcodeDetected as EventListener);
    
    return () => {
      window.removeEventListener('barcodeDetected', handleBarcodeDetected as EventListener);
    };
  }, []);
  
  // Estado do formulário corrigido
  const [formData, setFormData] = useState<ContaPagarFormData>({
    fornecedor: '',
    valor: 0,
    dataVencimento: '',
    contaContabilId: '',
    numeroDocumento: '',
    descricao: '',
    observacoes: ''
  });
  
  // Debounce para busca de fornecedores
  const debouncedFornecedor = useDebounce(formData.fornecedor, 300);

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
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  // Estados para suportar múltiplas imagens
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<Array<{id: string, url: string, name: string}>>([]);
  const [photosToRemove, setPhotosToRemove] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  
  // Estados para sugestões de fornecedores
  const [fornecedoresSugeridos, setFornecedoresSugeridos] = useState<string[]>([]);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
  
  // Estado para data formatada dd/mm/yyyy
  const [dataVencimentoFormatada, setDataVencimentoFormatada] = useState<string>('');
  
  // Estado para tipo de documento
  const [tipoDocumento, setTipoDocumento] = useState<'codigo_barras' | 'pix' | 'padrao'>('padrao');



  // useEffect corrigido
  useEffect(() => {
    fetchEmpresas();
    fetchContasContabeis();
  }, []);


  

  
  // Efeito para buscar fornecedores quando o texto digitado mudar
  useEffect(() => {
    if (debouncedFornecedor && debouncedFornecedor.length >= 2) {
      buscarFornecedoresSugeridos(debouncedFornecedor);
    } else {
      setFornecedoresSugeridos([]);
      setMostrarSugestoes(false);
    }
  }, [debouncedFornecedor]);

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
        observacoes: conta.observacoes || '',
        descricao: conta.descricao || ''
      });
      setSelectedEmpresaId(conta.empresaId);
      setValorFormatado(formatarMoeda(conta.valor));
      setDataVencimentoFormatada(convertFromISODate(conta.dataVencimento));
      
      // Carregar fotos existentes
      loadExistingPhotos(conta.id);
    } else {
      // Limpar estados ao criar nova conta
      setExistingPhotos([]);
      setPhotosToRemove([]);
      setPhotoFiles([]);
      setPhotoPreviews([]);
      setDataVencimentoFormatada('');
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
  
  // Função para buscar fornecedores já cadastrados
  const buscarFornecedoresSugeridos = async (termo: string) => {
    if (!termo || termo.length < 2) return;
    
    try {
      const { data, error } = await supabase
        .from('contas_a_pagar')
        .select('fornecedor')
        .ilike('fornecedor', `%${termo}%`)
        .order('fornecedor')
        .limit(5);

      if (error) throw error;
      
      // Filtrar fornecedores únicos
      const fornecedoresUnicos = [...new Set(data?.map(item => item.fornecedor))];
      setFornecedoresSugeridos(fornecedoresUnicos);
      setMostrarSugestoes(fornecedoresUnicos.length > 0);
    } catch (error) {
      console.error('Erro ao buscar fornecedores:', error);
    }
  };
  
  // Função para detectar o tipo de documento (código de barras ou PIX)
  const detectarTipoDocumento = (valor: string): 'codigo_barras' | 'pix' | 'padrao' => {
    if (!valor || valor.trim() === '') return 'padrao';
    
    const valorLimpo = valor.replace(/\s/g, '');
    
    // Código de barras: mais de 44 caracteres numéricos
    if (valorLimpo.length > 44 && /^\d+$/.test(valorLimpo)) {
      return 'codigo_barras';
    }
    
    // PIX - Verificar diferentes formatos
    // Email
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valorLimpo)) {
      return 'pix';
    }
    
    // Celular (formato brasileiro)
    if (/^\(?\d{2}\)?\s?9?\d{4}-?\d{4}$/.test(valorLimpo) || /^\d{10,11}$/.test(valorLimpo)) {
      return 'pix';
    }
    
    // CNPJ
    if (/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(valorLimpo) || /^\d{14}$/.test(valorLimpo)) {
      return 'pix';
    }
    
    // CPF
    if (/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(valorLimpo) || /^\d{11}$/.test(valorLimpo)) {
      return 'pix';
    }
    
    // Chave aleatória PIX (UUID ou string alfanumérica longa)
    if (/^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/.test(valorLimpo) || 
        (valorLimpo.length >= 20 && /^[a-zA-Z0-9]+$/.test(valorLimpo))) {
      return 'pix';
    }
    
    // Se não se encaixa em nenhum padrão específico mas tem conteúdo, pode ser PIX
    if (valorLimpo.length > 0) {
      return 'pix';
    }
    
    return 'padrao';
  };
  
  // Função para obter o texto do label baseado no tipo detectado
  const getLabelTexto = (tipo: 'codigo_barras' | 'pix' | 'padrao'): string => {
    switch (tipo) {
      case 'codigo_barras':
        return 'Código de Barras';
      case 'pix':
        return 'PIX';
      default:
        return 'Código de Barras ou PIX';
    }
  };

  // Função para selecionar um fornecedor da lista de sugestões
  const selecionarFornecedor = async (fornecedor: string) => {
    setFormData(prev => ({ ...prev, fornecedor }));
    setMostrarSugestoes(false);
    
    // Buscar o último lançamento desse fornecedor para preencher os campos automaticamente
    await buscarUltimoLancamentoFornecedor(fornecedor);
  };
  
  // Função para buscar o último lançamento de um fornecedor
  const buscarUltimoLancamentoFornecedor = async (fornecedor: string) => {
    try {
      const { data, error } = await supabase
        .from('contas_a_pagar')
        .select('*')
        .eq('fornecedor', fornecedor)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error) {
        console.error('Erro ao buscar último lançamento:', error);
        return;
      }
      
      if (data) {
        // Preencher os campos com os dados do último lançamento
        // Não preenchemos observações e código de barras para evitar confusão
        setSelectedEmpresaId(data.empresa_id);
        setFormData(prev => ({
          ...prev,
          contaContabilId: data.conta_contabil_id || ''
          // Removido preenchimento automático de numeroDocumento e observacoes
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar último lançamento:', error);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validar se todos os arquivos são imagens válidas
    const validExtensions = ['jpg', 'jpeg', 'png', 'webp'];
    const invalidFiles = files.filter(file => {
      const extension = file.name.split('.').pop()?.toLowerCase();
      return !extension || !validExtensions.includes(extension) || !file.type.startsWith('image/');
    });

    if (invalidFiles.length > 0) {
      setUploadError('Apenas arquivos de imagem são permitidos (JPG, JPEG, PNG, WEBP)');
      // Limpar a seleção de arquivos
      if (e.target) {
        e.target.value = '';
      }
      return;
    }

    // Limitar a 2 arquivos
    const newFiles = files.slice(0, 2 - photoFiles.length);
    
    newFiles.forEach(file => {
      if (file.size > 10 * 1024 * 1024) {
        setUploadError('Arquivo muito grande. Máximo 10MB por arquivo.');
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
    setUploadError(null);
  };

  // Função para carregar fotos existentes
  const loadExistingPhotos = async (contaId: string) => {
    try {
      const { data, error } = await supabase
        .from('conta_pagar_fotos')
        .select('id, foto_url, foto_nome')
        .eq('conta_pagar_id', contaId)
        .order('ordem');

      if (error) throw error;

      const photos = (data || []).map(photo => ({
        id: photo.id,
        url: photo.foto_url,
        name: photo.foto_nome || 'Imagem'
      }));

      setExistingPhotos(photos);
    } catch (error) {
      console.error('Erro ao carregar fotos existentes:', error);
    }
  };

  // Função para remover uma imagem específica
  const removePhoto = (index: number, isExisting: boolean = false) => {
    if (isExisting) {
      const photoToRemove = existingPhotos[index];
      if (photoToRemove) {
        setPhotosToRemove(prev => [...prev, photoToRemove.id]);
        setExistingPhotos(prev => prev.filter((_, i) => i !== index));
      }
    } else {
      setPhotoFiles(prev => prev.filter((_, i) => i !== index));
      setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Função para lidar com drag and drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    
    // Validar se todos os arquivos são imagens válidas
    const validExtensions = ['jpg', 'jpeg', 'png', 'webp'];
    const invalidFiles = files.filter(file => {
      const extension = file.name.split('.').pop()?.toLowerCase();
      return !extension || !validExtensions.includes(extension) || !file.type.startsWith('image/');
    });

    if (invalidFiles.length > 0) {
      setUploadError('Apenas arquivos de imagem são permitidos (JPG, JPEG, PNG, WEBP)');
      return;
    }

    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length > 0) {
      const newFiles = imageFiles.slice(0, 2 - photoFiles.length);
      
      newFiles.forEach(file => {
        if (file.size > 10 * 1024 * 1024) {
          setUploadError('Arquivo muito grande. Máximo 10MB por arquivo.');
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
      setUploadError(null);
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
        const filePath = `${user?.id || 'anonymous'}/${fileName}`;
    
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
        descricao: formData.descricao,
        valor: Number(formData.valor),
        data_vencimento: formatDateForDatabase(formData.dataVencimento),
        conta_contabil_id: formData.contaContabilId || null,
        numero_documento: formData.numeroDocumento || null,
        observacoes: formData.observacoes || null,
        empresa_id: selectedEmpresaId,
        // Manter compatibilidade com foto única (primeira foto)
        foto_url: uploadedPhotos.length > 0 ? uploadedPhotos[0].url : null,
        foto_nome: uploadedPhotos.length > 0 ? uploadedPhotos[0].name : null,
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

        // Remover apenas fotos marcadas para exclusão
        if (photosToRemove.length > 0) {
          const { error: removeError } = await supabase
            .from('conta_pagar_fotos')
            .delete()
            .in('id', photosToRemove);
          
          if (removeError) throw removeError;
        }
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
    <div className="space-y-4 sm:space-y-6 max-w-full overflow-x-hidden">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 max-w-full">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base text-ellipsis"
              required
            >
              <option value="">Selecione uma empresa</option>
              {empresas.map(empresa => (
                <option key={empresa.id} value={empresa.id} className="text-ellipsis overflow-hidden">
                  {empresa.razao_social}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="inline w-4 h-4 mr-1" />
              Fornecedor *
            </label>
            <input
              type="text"
              value={formData.fornecedor}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, fornecedor: e.target.value }));
                if (e.target.value.length >= 2) {
                  setMostrarSugestoes(true);
                } else {
                  setMostrarSugestoes(false);
                }
              }}
              onFocus={() => {
                if (formData.fornecedor.length >= 2 && fornecedoresSugeridos.length > 0) {
                  setMostrarSugestoes(true);
                }
              }}
              onBlur={() => {
                // Pequeno delay para permitir que o clique na sugestão seja processado
                setTimeout(() => setMostrarSugestoes(false), 200);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base truncate"
              placeholder="Nome do fornecedor"
              required
            />
            
            {/* Lista de sugestões */}
            {mostrarSugestoes && fornecedoresSugeridos.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                {fornecedoresSugeridos.map((fornecedor, index) => (
                  <div 
                    key={index}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                    onClick={() => selecionarFornecedor(fornecedor)}
                  >
                    {fornecedor}
                  </div>
                ))}
              </div>
            )}
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
              <Barcode className="inline w-4 h-4 mr-1" />
              {getLabelTexto(tipoDocumento)}
            </label>
            <div className="flex w-full overflow-hidden">
              <input
                type="text"
                value={formData.numeroDocumento || ''}
                onChange={(e) => {
                  const novoValor = e.target.value;
                  setFormData(prev => ({ ...prev, numeroDocumento: novoValor }));
                  const novoTipo = detectarTipoDocumento(novoValor);
                  setTipoDocumento(novoTipo);
                }}
                className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base truncate"
                placeholder="Digite ou escaneie o código"
              />
              <button
                type="button"
                onClick={() => {
                  // Comunicar com o componente pai para abrir o scanner
                  if (window.openBarcodeScanner) {
                    window.openBarcodeScanner();
                  }
                }}
                className="px-3 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 transition-colors flex-shrink-0"
                title="Ler código de barras"
              >
                <Barcode className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="inline w-4 h-4 mr-1" />
              Data de Vencimento *
            </label>
            <DatePicker
              value={dataVencimentoFormatada}
              onChange={(value) => {
                setDataVencimentoFormatada(value);
              }}
              onISOChange={(isoValue) => {
                setFormData(prev => ({ ...prev, dataVencimento: isoValue }));
              }}
              placeholder="dd/mm/yyyy"
              className="text-sm sm:text-base"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base text-ellipsis"
              >
                <option value="">Selecione uma conta contábil</option>
                {contasContabeisFiltradas.map(conta => (
                  <option key={conta.id} value={conta.id} className="text-ellipsis overflow-hidden">
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
              value={formData.descricao || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
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
          
          {/* Mensagem de erro de upload */}
          {uploadError && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-md" style={{ zIndex: 9999 }}>
              <p className="text-sm text-red-600">{uploadError}</p>
            </div>
          )}
          
          {/* Input de arquivo oculto */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileInputChange}
            className="hidden"
          />
          
          {/* Área de drag and drop */}
          <div
            className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors overflow-hidden ${
              dragActive 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {(existingPhotos.length > 0 || photoPreviews.length > 0) ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {/* Imagens existentes */}
                  {existingPhotos.map((photo, index) => (
                    <div key={`existing-${photo.id}`} className="relative group">
                      <img
                        src={photo.url}
                        alt={photo.name}
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index, true)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                        Existente
                      </div>
                    </div>
                  ))}
                  {/* Novas imagens */}
                  {photoPreviews.map((preview, index) => (
                    <div key={`new-${index}`} className="relative group">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index, false)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-2 left-2 bg-green-600 bg-opacity-80 text-white text-xs px-2 py-1 rounded">
                        Nova
                      </div>
                    </div>
                  ))}
                </div>
                {(existingPhotos.length + photoPreviews.length) < 2 && (
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
                  Máximo 2 arquivos, 10MB cada (JPG, JPEG, PNG, WEBP)
                </p>
              </div>
            )}
          </div>
        </div>

        
        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors text-sm sm:text-base"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading || uploadingPhoto}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base flex items-center justify-center gap-2"
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