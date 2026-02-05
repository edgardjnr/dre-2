import React, { useMemo, useRef, useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { ContaPagar, ContaPagarFormData, ContaPagarStatus, ContaContabil } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { Building2, FileText, DollarSign, Calendar, Tag, Camera, Upload, X, Check, Barcode, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Spinner } from '../ui/Spinner';
import { useDebounce } from '../../hooks/useDebounce';
import { applyDateMask, isValidDate, convertToISODate, convertFromISODate, formatDateForDatabase } from '../../utils/dateUtils';
import { DatePicker } from '../ui/DatePicker';
import { ImageModal } from './components/ImageModal';
import { barcode44ToLinhaDigitavel47, isValidBarcode44, isValidLinhaDigitavel47, normalizeDigits } from '../../utils/boletoUtils';

interface ContaPagarFormProps {
  conta?: ContaPagar;
  onSave: () => void;
  onCancel: () => void;
}

export function ContaPagarForm({ conta, onSave, onCancel }: ContaPagarFormProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const comprovanteInputRef = useRef<HTMLInputElement>(null);
  
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
      const codigo = String(event.detail || '');
      const digits = normalizeDigits(codigo);
      let finalValue = digits || codigo;
      if (digits.length === 44 && digits[0] !== '8' && isValidBarcode44(digits)) {
        const linha = barcode44ToLinhaDigitavel47(digits);
        finalValue = linha || digits;
      } else if (digits.length === 47 && isValidLinhaDigitavel47(digits)) {
        finalValue = digits;
      }

      setFormData(prev => ({ ...prev, numeroDocumento: finalValue }));
      const novoTipo = detectarTipoDocumento(finalValue);
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
  const [selectedCategoriaDre, setSelectedCategoriaDre] = useState<string>('');
  
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [contasContabeis, setContasContabeis] = useState<ContaContabil[]>([]);
  
  // Filtrar contas contábeis por empresa selecionada
  const contasContabeisFiltradas = contasContabeis.filter(
    conta => conta.empresaId === selectedEmpresaId
  );

  const categoriasDisponiveis = useMemo(() => {
    return Array.from(new Set(contasContabeisFiltradas.map(c => c.categoria).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
  }, [contasContabeisFiltradas]);

  const contasContabeisPorCategoria = useMemo(() => {
    if (!selectedCategoriaDre) return [];
    return contasContabeisFiltradas.filter(c => c.categoria === selectedCategoriaDre);
  }, [contasContabeisFiltradas, selectedCategoriaDre]);

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
    if (selectedCategoriaDre && !categoriasDisponiveis.includes(selectedCategoriaDre)) {
      setSelectedCategoriaDre('');
    }
  }, [categoriasDisponiveis, selectedCategoriaDre]);

  useEffect(() => {
    if (!formData.contaContabilId) return;
    const contaAtual = contasContabeisFiltradas.find(c => c.id === formData.contaContabilId);
    if (contaAtual && contaAtual.categoria !== selectedCategoriaDre) {
      setSelectedCategoriaDre(contaAtual.categoria);
    }
  }, [contasContabeisFiltradas, formData.contaContabilId, selectedCategoriaDre]);

  useEffect(() => {
    if (!formData.contaContabilId) return;
    const contaAtual = contasContabeisFiltradas.find(c => c.id === formData.contaContabilId);
    if (!contaAtual) return;
    if (selectedCategoriaDre && contaAtual.categoria !== selectedCategoriaDre) {
      setFormData(prev => ({ ...prev, contaContabilId: '' }));
    }
  }, [contasContabeisFiltradas, formData.contaContabilId, selectedCategoriaDre]);

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
  const [signedPhotoUrls, setSignedPhotoUrls] = useState<Record<string, string>>({});
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ url: string; name: string } | null>(null);
  const [existingComprovante, setExistingComprovante] = useState<{ url: string; name: string } | null>(null);
  const [signedComprovanteUrl, setSignedComprovanteUrl] = useState<string>('');
  const [comprovanteFile, setComprovanteFile] = useState<File | null>(null);
  const [comprovantePreview, setComprovantePreview] = useState<string>('');
  const [comprovanteRemoved, setComprovanteRemoved] = useState(false);
  
  // Estados para sugestões de fornecedores
  const [fornecedoresSugeridos, setFornecedoresSugeridos] = useState<string[]>([]);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
  const [fornecedorFocused, setFornecedorFocused] = useState(false);
  const [fornecedorDigitado, setFornecedorDigitado] = useState(false);
  
  // Estado para data formatada dd/mm/yyyy
  const [dataVencimentoFormatada, setDataVencimentoFormatada] = useState<string>('');
  // Estado para status e data de pagamento
  const [status, setStatus] = useState<ContaPagarStatus>(conta?.status || 'pendente');
  const [dataPagamentoFormatada, setDataPagamentoFormatada] = useState<string>('');
  const [dataPagamento, setDataPagamento] = useState<string>('');
  
  // Estado para tipo de documento
  const [tipoDocumento, setTipoDocumento] = useState<'codigo_barras' | 'pix' | 'padrao'>('padrao');



  // useEffect corrigido
  useEffect(() => {
    fetchEmpresas();
    fetchContasContabeis();
  }, []);


  

  
  // Efeito para buscar fornecedores quando o texto digitado mudar
  useEffect(() => {
    const termo = String(debouncedFornecedor || '').trim();
    if (!fornecedorFocused || !fornecedorDigitado) {
      setFornecedoresSugeridos([]);
      setMostrarSugestoes(false);
      return;
    }
    if (termo.length >= 2) {
      buscarFornecedoresSugeridos(termo);
      return;
    }
    setFornecedoresSugeridos([]);
    setMostrarSugestoes(false);
  }, [debouncedFornecedor, fornecedorDigitado, fornecedorFocused]);

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
      setFornecedorDigitado(false);
      setSelectedEmpresaId(conta.empresaId);
      setSelectedCategoriaDre('');
      setValorFormatado(formatarMoeda(conta.valor));
      setDataVencimentoFormatada(convertFromISODate(conta.dataVencimento));
      setStatus(conta.status);
      setDataPagamentoFormatada(conta.dataPagamento ? convertFromISODate(conta.dataPagamento) : '');
      setDataPagamento(conta.dataPagamento || '');
      setExistingComprovante(conta.fotoUrl ? { url: conta.fotoUrl, name: conta.fotoNome || 'Comprovante de Pagamento' } : null);
      setSignedComprovanteUrl('');
      setComprovanteFile(null);
      setComprovantePreview('');
      setComprovanteRemoved(false);
      
      // Carregar fotos existentes
      loadExistingPhotos(conta.id);
    } else {
      // Limpar estados ao criar nova conta
      setSelectedCategoriaDre('');
      setExistingPhotos([]);
      setPhotosToRemove([]);
      setPhotoFiles([]);
      setPhotoPreviews([]);
      setFornecedorDigitado(false);
      setDataVencimentoFormatada('');
      setStatus('pendente');
      setDataPagamentoFormatada('');
      setDataPagamento('');
      setExistingComprovante(null);
      setSignedComprovanteUrl('');
      setComprovanteFile(null);
      setComprovantePreview('');
      setComprovanteRemoved(false);
    }
  }, [conta]);

  useEffect(() => {
    const generateSigned = async () => {
      const entries: [string, string][] = [];
      for (const photo of existingPhotos) {
        const key = extractStorageKey(photo.url);
        if (!key) continue;
        const { data, error } = await supabase.storage
          .from('contas-fotos')
          .createSignedUrl(key, 60 * 60 * 24 * 7);
        if (!error && data?.signedUrl) {
          entries.push([photo.url, data.signedUrl]);
        }
      }
      if (entries.length > 0) {
        setSignedPhotoUrls(prev => {
          const next = { ...prev };
          for (const [orig, signed] of entries) next[orig] = signed;
          return next;
        });
      }
    };
    if (existingPhotos.length > 0) {
      generateSigned();
    }
  }, [existingPhotos]);

  useEffect(() => {
    const generateSignedComprovante = async () => {
      if (!existingComprovante?.url) return;
      const key = extractStorageKey(existingComprovante.url);
      if (!key) return;
      const { data, error } = await supabase.storage
        .from('contas-fotos')
        .createSignedUrl(key, 60 * 60 * 24 * 7);
      if (!error && data?.signedUrl) {
        setSignedComprovanteUrl(data.signedUrl);
      }
    };
    generateSignedComprovante();
  }, [existingComprovante]);

  const contaParaModal = useMemo<ContaPagar>(() => {
    const fotos: ContaPagar['fotos'] = [
      ...existingPhotos.map((p, idx) => ({
        id: p.id,
        contaPagarId: conta?.id || 'temp',
        fotoUrl: p.url,
        fotoNome: p.name,
        ordem: idx + 1,
        createdAt: conta?.createdAt || new Date().toISOString()
      })),
      ...photoPreviews.map((url, idx) => ({
        id: `new-${idx}`,
        contaPagarId: conta?.id || 'temp',
        fotoUrl: url,
        fotoNome: `Preview ${idx + 1}`,
        ordem: existingPhotos.length + idx + 1,
        createdAt: conta?.createdAt || new Date().toISOString()
      }))
    ];

    return {
      id: conta?.id || 'temp',
      fornecedor: formData.fornecedor || conta?.fornecedor || '',
      descricao: formData.descricao || conta?.descricao || '',
      valor: formData.valor || conta?.valor || 0,
      dataVencimento: formData.dataVencimento || conta?.dataVencimento || '',
      status: status || conta?.status || 'pendente',
      dataPagamento: dataPagamento || conta?.dataPagamento || undefined,
      contaContabilId: formData.contaContabilId || conta?.contaContabilId,
      numeroDocumento: formData.numeroDocumento || conta?.numeroDocumento,
      observacoes: formData.observacoes || conta?.observacoes,
      empresaId: selectedEmpresaId || conta?.empresaId || '',
      fotoUrl: comprovantePreview || existingComprovante?.url || undefined,
      fotoNome: comprovanteFile?.name || existingComprovante?.name || undefined,
      fotos,
      createdAt: conta?.createdAt || new Date().toISOString(),
      updatedAt: conta?.updatedAt || new Date().toISOString()
    };
  }, [
    conta,
    existingPhotos,
    formData.contaContabilId,
    formData.dataVencimento,
    formData.descricao,
    formData.fornecedor,
    formData.numeroDocumento,
    formData.observacoes,
    formData.valor,
    photoPreviews,
    selectedEmpresaId,
    status,
    dataPagamento,
    comprovantePreview,
    comprovanteFile,
    existingComprovante
  ]);

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
      setMostrarSugestoes(fornecedorFocused && fornecedorDigitado && fornecedoresUnicos.length > 0);
    } catch (error) {
      console.error('Erro ao buscar fornecedores:', error);
    }
  };
  
  // Função para detectar o tipo de documento (código de barras ou PIX)
  const detectarTipoDocumento = (valor: string): 'codigo_barras' | 'pix' | 'padrao' => {
    if (!valor || valor.trim() === '') return 'padrao';
    
    const valorLimpo = valor.trim();
    const apenasDigitos = valorLimpo.replace(/\D/g, '');
    
    // Código de barras / linha digitável (boleto costuma ser 44 dígitos no código de barras, 47/48 na linha digitável)
    if (apenasDigitos.length === 44 || apenasDigitos.length === 47 || apenasDigitos.length === 48) {
      return 'codigo_barras';
    }
    
    // PIX - Verificar diferentes formatos
    // Email
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valorLimpo)) {
      return 'pix';
    }
    
    // Celular (formato brasileiro)
    if (/^\(?\d{2}\)?\s?9?\d{4}-?\d{4}$/.test(valorLimpo) || /^\d{10,11}$/.test(apenasDigitos)) {
      return 'pix';
    }
    
    // CNPJ
    if (/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(valorLimpo) || apenasDigitos.length === 14) {
      return 'pix';
    }
    
    // CPF
    if (/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(valorLimpo) || apenasDigitos.length === 11) {
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
    setFornecedorDigitado(true);
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

  const handleComprovanteInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const file = files[0];
    const validExtensions = ['jpg', 'jpeg', 'png', 'webp'];
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !validExtensions.includes(extension) || !file.type.startsWith('image/')) {
      setUploadError('Apenas arquivos de imagem são permitidos (JPG, JPEG, PNG, WEBP)');
      if (e.target) {
        e.target.value = '';
      }
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Arquivo muito grande. Máximo 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setComprovantePreview(result);
    };
    reader.readAsDataURL(file);

    setComprovanteFile(file);
    setComprovanteRemoved(false);
    setUploadError(null);
  };

  const handleRemoveComprovante = async () => {
    setComprovanteFile(null);
    setComprovantePreview('');
    setComprovanteRemoved(true);
    setExistingComprovante(null);
    setSignedComprovanteUrl('');
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
  const removePhoto = async (index: number, isExisting: boolean = false) => {
    if (isExisting) {
      const photoToRemove = existingPhotos[index];
      if (photoToRemove) {
        const key = extractStorageKey(photoToRemove.url);
        if (key) {
          await supabase.storage.from('contas-fotos').remove([key]);
        }
        await supabase
          .from('conta_pagar_fotos')
          .delete()
          .eq('id', photoToRemove.id);
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

        return { url: filePath, name: file.name };
      });

      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error('Erro ao fazer upload das fotos:', error);
      throw error;
    } finally {
      setUploadingPhoto(false);
    }
  };

  const uploadComprovante = async (): Promise<{ url: string; name: string } | null> => {
    if (!comprovanteFile) return null;

    setUploadingPhoto(true);
    try {
      const fileExt = comprovanteFile.name.split('.').pop();
      const fileName = `${Date.now()}_comprovante.${fileExt}`;
      const filePath = `${user?.id || 'anonymous'}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('contas-fotos')
        .upload(filePath, comprovanteFile);

      if (uploadError) throw uploadError;

      return { url: filePath, name: comprovanteFile.name };
    } catch (error) {
      console.error('Erro ao fazer upload do comprovante:', error);
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
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        setError('Usuário não autenticado. Faça login novamente.');
        setLoading(false);
        return;
      }
      if (!selectedEmpresaId) {
        setError('Selecione uma empresa antes de salvar.');
        setLoading(false);
        return;
      }
      // Upload das fotos se houver arquivos
      const uploadedPhotos = await uploadPhotos();
      const uploadedComprovante = await uploadComprovante();
      const comprovanteAtual = uploadedComprovante
        ? uploadedComprovante
        : comprovanteRemoved
          ? null
          : existingComprovante;
      const previousComprovanteKey = conta?.fotoUrl ? extractStorageKey(conta.fotoUrl) : null;
  
      // Dados corrigidos para o banco (usando snake_case para colunas do banco)
      const contaData = {
        user_id: currentUser.id,
        fornecedor: formData.fornecedor,
        descricao: formData.descricao,
        valor: Number(formData.valor),
        data_vencimento: formatDateForDatabase(formData.dataVencimento),
        conta_contabil_id: formData.contaContabilId || null,
        numero_documento: formData.numeroDocumento || null,
        observacoes: formData.observacoes || null,
        empresa_id: selectedEmpresaId,
        tipo_documento: tipoDocumento === 'pix' ? 'pix' : 'boleto',
        foto_url: comprovanteAtual?.url || null,
        foto_nome: comprovanteAtual?.name || null,
        status: status as ContaPagarStatus,
        data_pagamento: status === 'paga'
          ? formatDateForDatabase(dataPagamento || new Date().toISOString().split('T')[0])
          : null
      };

      let contaId: string;

      if (conta) {
        const { error } = await supabase
          .from('contas_a_pagar')
          .update(contaData)
          .eq('id', conta.id);

        if (error) throw error;
        contaId = conta.id;

        if (previousComprovanteKey && (uploadedComprovante || comprovanteRemoved)) {
          const { error: removeComprovanteError } = await supabase.storage
            .from('contas-fotos')
            .remove([previousComprovanteKey]);
          if (removeComprovanteError) throw removeComprovanteError;
        }

        if (photosToRemove.length > 0) {
          const { data: fotosParaRemover, error: buscarFotosError } = await supabase
            .from('conta_pagar_fotos')
            .select('id, foto_url')
            .in('id', photosToRemove);

          if (buscarFotosError) throw buscarFotosError;

          const keys = (fotosParaRemover || [])
            .map(f => extractStorageKey(f.foto_url))
            .filter((k): k is string => Boolean(k));

          if (keys.length) {
            const { error: storageDeleteError } = await supabase.storage
              .from('contas-fotos')
              .remove(keys);
            if (storageDeleteError) throw storageDeleteError;
          }

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

      try {
        const { data: contaDataAtualizada, error: contaFetchError } = await supabase
          .from('contas_a_pagar')
          .select('*')
          .eq('id', contaId)
          .single();

        if (contaFetchError) throw contaFetchError;

        if (contaDataAtualizada) {
          const contaAtualizada: ContaPagar = {
            id: contaDataAtualizada.id,
            empresaId: contaDataAtualizada.empresa_id,
            fornecedor: contaDataAtualizada.fornecedor,
            descricao: contaDataAtualizada.descricao,
            valor: contaDataAtualizada.valor,
            dataVencimento: contaDataAtualizada.data_vencimento,
            dataPagamento: contaDataAtualizada.data_pagamento || undefined,
            status: contaDataAtualizada.status,
            observacoes: contaDataAtualizada.observacoes || undefined,
            numeroDocumento: contaDataAtualizada.numero_documento || undefined,
            fotoUrl: contaDataAtualizada.foto_url || undefined,
            fotoNome: contaDataAtualizada.foto_nome || undefined,
            fotos: [],
            contaContabilId: contaDataAtualizada.conta_contabil_id || undefined,
            lancamentoGeradoId: contaDataAtualizada.lancamento_gerado_id || undefined,
            createdAt: contaDataAtualizada.created_at,
            updatedAt: contaDataAtualizada.updated_at
          };
          const { useDRELancamento } = await import('./hooks/useDRELancamento');
          const { sincronizarLancamentoDRE } = useDRELancamento(onSave);
          await sincronizarLancamentoDRE(contaAtualizada);
        }
      } catch (e) {
        console.error('Erro ao gerar lançamento DRE automático:', e);
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
                setSelectedCategoriaDre('');
                setFormData(prev => ({ ...prev, contaContabilId: '' })); // Limpar conta contábil ao trocar empresa
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset focus:ring-offset-1 focus:ring-offset-white text-sm sm:text-base text-ellipsis"
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

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <CheckCircle className="inline w-4 h-4 mr-1" />
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ContaPagarStatus)}
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset focus:ring-offset-1 focus:ring-offset-white text-sm sm:text-base"
            >
              <option value="pendente">Pendente</option>
              <option value="paga">Paga</option>
              <option value="vencida">Vencida</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>

          {status === 'paga' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline w-4 h-4 mr-1" />
                Data de Pagamento
              </label>
              <DatePicker
                value={dataPagamentoFormatada}
                onChange={(value) => setDataPagamentoFormatada(value)}
                onISOChange={(isoValue) => setDataPagamento(isoValue)}
                placeholder="dd/mm/yyyy"
                className="text-sm sm:text-base"
              />
            </div>
          )}

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
                setFornecedorDigitado(true);
              }}
              onFocus={() => {
                setFornecedorFocused(true);
                const termo = String(formData.fornecedor || '').trim();
                if (fornecedorDigitado && termo.length >= 2 && fornecedoresSugeridos.length > 0) {
                  setMostrarSugestoes(true);
                }
              }}
              onBlur={() => {
                setFornecedorFocused(false);
                setMostrarSugestoes(false);
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset focus:ring-offset-1 focus:ring-offset-white text-sm sm:text-base truncate"
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
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selecionarFornecedor(fornecedor);
                    }}
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
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset focus:ring-offset-1 focus:ring-offset-white text-sm sm:text-base"
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
                  const digits = normalizeDigits(novoValor);
                  const finalValue = digits ? digits : novoValor;
                  setFormData(prev => ({ ...prev, numeroDocumento: finalValue }));
                  setTipoDocumento(detectarTipoDocumento(finalValue));
                }}
                className="flex-1 min-w-0 px-4 py-3 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset focus:ring-offset-1 focus:ring-offset-white text-sm sm:text-base truncate"
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
              Categoria DRE
            </label>
            <select
              value={selectedCategoriaDre}
              onChange={(e) => {
                setSelectedCategoriaDre(e.target.value);
                setFormData(prev => ({ ...prev, contaContabilId: '' }));
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset focus:ring-offset-1 focus:ring-offset-white text-sm sm:text-base text-ellipsis"
              disabled={!selectedEmpresaId || categoriasDisponiveis.length === 0}
            >
              <option value="">
                {!selectedEmpresaId
                  ? 'Selecione uma empresa primeiro'
                  : categoriasDisponiveis.length === 0
                    ? 'Nenhuma categoria disponível'
                    : 'Selecione uma categoria'
                }
              </option>
              {categoriasDisponiveis.map(categoria => (
                <option key={categoria} value={categoria} className="text-ellipsis overflow-hidden">
                  {categoria}
                </option>
              ))}
            </select>
          </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Tag className="inline w-4 h-4 mr-1" />
                Conta Contábil
              </label>
              <select
                value={formData.contaContabilId || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, contaContabilId: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset focus:ring-offset-1 focus:ring-offset-white text-sm sm:text-base text-ellipsis"
                disabled={!selectedEmpresaId || !selectedCategoriaDre || contasContabeisPorCategoria.length === 0}
              >
                <option value="">Selecione uma conta contábil</option>
                {contasContabeisPorCategoria.map(conta => (
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
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset focus:ring-offset-1 focus:ring-offset-white text-sm sm:text-base"
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
            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset focus:ring-offset-1 focus:ring-offset-white text-sm sm:text-base"
            rows={3}
            placeholder="Observações adicionais"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Camera className="inline w-4 h-4 mr-1" />
            Comprovante de Pagamento
          </label>

          <input
            ref={comprovanteInputRef}
            type="file"
            accept="image/*"
            onChange={handleComprovanteInputChange}
            className="hidden"
          />

          {(existingComprovante || comprovantePreview) ? (
            <div className="space-y-3">
              <div className="relative group w-full sm:w-64">
                <img
                  src={comprovantePreview || signedComprovanteUrl || existingComprovante?.url || ''}
                  alt={comprovanteFile?.name || existingComprovante?.name || 'Comprovante'}
                  className="w-full h-40 object-cover rounded-lg border cursor-pointer"
                  loading="lazy"
                  onClick={() => {
                    const url = comprovantePreview || signedComprovanteUrl || existingComprovante?.url;
                    if (!url) return;
                    setSelectedImage({ url, name: comprovanteFile?.name || existingComprovante?.name || 'Comprovante de Pagamento' });
                    setShowImageModal(true);
                  }}
                />
                <button
                  type="button"
                  onClick={handleRemoveComprovante}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => comprovanteInputRef.current?.click()}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Trocar comprovante
                </button>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed rounded-lg p-4 text-center">
              <Upload className="mx-auto h-10 w-10 text-gray-400 mb-3" />
              <p className="text-gray-600 mb-2">Arraste o comprovante aqui ou</p>
              <button
                type="button"
                onClick={() => comprovanteInputRef.current?.click()}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                clique para selecionar
              </button>
              <p className="text-xs text-gray-500 mt-2">
                Máximo 10MB (JPG, JPEG, PNG, WEBP)
              </p>
            </div>
          )}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Imagens existentes */}
                  {existingPhotos.map((photo, index) => (
                    <div key={`existing-${photo.id}`} className="relative group">
                      <img
                        src={signedPhotoUrls[photo.url] || photo.url}
                        alt={photo.name}
                        className="w-full h-40 sm:h-32 object-cover rounded-lg border cursor-pointer"
                        loading="lazy"
                        onClick={() => {
                          setSelectedImage({ url: photo.url, name: photo.name });
                          setShowImageModal(true);
                        }}
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
                        className="w-full h-40 sm:h-32 object-cover rounded-lg border cursor-pointer"
                        loading="lazy"
                        onClick={() => {
                          setSelectedImage({ url: preview, name: `Preview ${index + 1}` });
                          setShowImageModal(true);
                        }}
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

        {showImageModal && selectedImage && (
          <ImageModal
            isOpen={showImageModal}
            imageUrl={selectedImage.url}
            imageName={selectedImage.name}
            conta={contaParaModal}
            onClose={() => {
              setShowImageModal(false);
              setSelectedImage(null);
            }}
          />
        )}
        
        
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
