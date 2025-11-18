import { supabase } from '../lib/supabaseClient';

// Interface para o código de ativação
interface ActivationCodeRequest {
  email: string;
  fullName: string;
  company: string;
}

interface ActivationCode {
  id: string;
  code: string;
  email: string;
  fullName: string;
  company: string;
  isUsed: boolean;
  createdAt: string;
}

/**
 * Gera um código de ativação aleatório de 8 caracteres
 */
const generateActivationCode = (): string => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
};

/**
 * Solicita um código de ativação e retorna os dados para envio de email pelo frontend
 */
export const requestActivationCode = async (requestData: ActivationCodeRequest): Promise<{ success: boolean; message: string; emailData?: { adminEmail: string; code: string } }> => {
  try {
    const code = generateActivationCode();
    const adminEmail = 'contato@onebvots.com.br';
    
    // Armazenar o código no banco de dados
    const { error } = await supabase
      .from('activation_codes')
      .insert({
        code,
        email: requestData.email,
        full_name: requestData.fullName,
        company: requestData.company,
        is_used: false
      });

    if (error) {
      console.error('Erro ao salvar código de ativação:', error);
      return { success: false, message: 'Erro ao gerar código de ativação.' };
    }

    // Retornar dados para envio de email pelo frontend
    return { 
      success: true, 
      message: 'Código de ativação gerado com sucesso. Por favor, envie o email para o administrador.',
      emailData: {
        adminEmail,
        code
      }
    };
  } catch (error) {
    console.error('Erro ao solicitar código de ativação:', error);
    return { success: false, message: 'Ocorreu um erro ao processar sua solicitação.' };
  }
};

/**
 * Verifica se um código de ativação é válido
 */
export const validateActivationCode = async (code: string): Promise<{ valid: boolean; message: string }> => {
  try {
    console.log('Validando código de ativação:', code);
    
    if (!code || code.trim() === '') {
      console.log('Código vazio ou inválido');
      return { valid: false, message: 'Código de ativação inválido.' };
    }
    
    // Primeiro, verificar se o código existe (sem filtrar por is_used)
    const { data: codeExists, error: codeExistsError } = await supabase
      .from('activation_codes')
      .select('*')
      .eq('code', code.trim().toUpperCase())
      .single();
    
    if (codeExistsError) {
      console.log('Erro ao buscar código:', codeExistsError);
      return { valid: false, message: 'Erro ao validar código de ativação.' };
    }
    
    if (!codeExists) {
      console.log('Código não encontrado no banco de dados');
      return { valid: false, message: 'Código de ativação inválido.' };
    }
    
    console.log('Código encontrado:', codeExists);
    
    // Verificar se o código já foi usado
    if (codeExists.is_used) {
      console.log('Código já foi utilizado anteriormente');
      return { valid: false, message: 'Este código de ativação já foi utilizado.' };
    }
    
    // Código existe e não foi usado
    return { valid: true, message: 'Código de ativação válido.' };
  } catch (error) {
    console.error('Erro ao validar código de ativação:', error);
    return { valid: false, message: 'Ocorreu um erro ao validar o código de ativação.' };
  }
};

/**
 * Marca um código de ativação como utilizado
 */
export const markActivationCodeAsUsed = async (code: string): Promise<boolean> => {
  try {
    console.log('Marcando código como utilizado:', code);
    
    if (!code || code.trim() === '') {
      console.error('Tentativa de marcar código vazio como utilizado');
      return false;
    }
    
    // Verificar se o código existe antes de marcar como usado
    const { data: codeExists } = await supabase
      .from('activation_codes')
      .select('id, is_used')
      .eq('code', code.trim().toUpperCase())
      .single();
      
    if (!codeExists) {
      console.error('Tentativa de marcar código inexistente como utilizado');
      return false;
    }
    
    if (codeExists.is_used) {
      console.warn('Código já estava marcado como utilizado');
      return true; // Retorna true porque o código já está marcado como usado
    }
    
    const { error } = await supabase
      .from('activation_codes')
      .update({ 
        is_used: true,
        used_at: new Date().toISOString()
      })
      .eq('code', code.trim().toUpperCase());

    if (error) {
      console.error('Erro ao marcar código como utilizado:', error);
      return false;
    }
    
    console.log('Código marcado como utilizado com sucesso');
    return true;
  } catch (error) {
    console.error('Erro ao marcar código como utilizado:', error);
    return false;
  }
};