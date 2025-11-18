import React, { useState } from 'react';
import { KeyRound, Loader2 } from 'lucide-react';
import { validateActivationCode } from '../../services/activationCodeService';

interface ActivationCodeVerificationProps {
  onCodeVerified: () => void;
  onRequestCode: () => void;
  onBackToLogin: () => void;
}

export const ActivationCodeVerification: React.FC<ActivationCodeVerificationProps> = ({ 
  onCodeVerified, 
  onRequestCode,
  onBackToLogin
}) => {
  const [activationCode, setActivationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validação básica
      if (!activationCode || activationCode.trim() === '') {
        setError('Por favor, insira o código de ativação.');
        setLoading(false);
        return;
      }

      const formattedCode = activationCode.trim().toUpperCase();
      console.log('Enviando código para validação:', formattedCode);
      const result = await validateActivationCode(formattedCode);
      console.log('Resultado da validação:', result);

      if (result.valid) {
        // Armazenar o código validado para uso posterior no cadastro
        localStorage.setItem('validActivationCode', formattedCode);
        console.log('Código válido armazenado no localStorage:', formattedCode);
        onCodeVerified();
      } else {
        setError(result.message);
        console.log('Erro na validação do código:', result.message);
      }
    } catch (err) {
      console.error('Erro ao verificar código:', err);
      setError('Ocorreu um erro ao verificar o código. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-8 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Verificação de Código</h2>
        <p className="mt-2 text-sm text-gray-600">
          Insira o código de ativação fornecido pelo administrador para continuar com o cadastro.
        </p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="activation-code" className="sr-only">Código de Ativação</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <KeyRound className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="activation-code"
              name="activationCode"
              type="text"
              required
              value={activationCode}
              onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
              className="appearance-none rounded-md relative block w-full px-3 py-3 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm uppercase"
              placeholder="Código de Ativação"
              disabled={loading}
              maxLength={8}
            />
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={loading}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Verificar Código'}
          </button>
        </div>

        <div className="text-center mt-4">
          <button 
            type="button" 
            onClick={onRequestCode} 
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            disabled={loading}
          >
            Não tem um código? Solicite aqui
          </button>
        </div>

        <div className="text-center mt-2">
          <button 
            type="button" 
            onClick={onBackToLogin} 
            className="text-gray-500 hover:text-gray-700 text-sm font-medium"
            disabled={loading}
          >
            Voltar para o login
          </button>
        </div>
      </form>
    </div>
  );
};