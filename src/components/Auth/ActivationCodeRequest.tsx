import React, { useState } from 'react';
import { Mail, User, Building, Loader2 } from 'lucide-react';
import { requestActivationCode } from '../../services/activationCodeService';

interface ActivationCodeRequestProps {
  onRequestComplete: () => void;
  onBackToLogin: () => void;
}

export const ActivationCodeRequest: React.FC<ActivationCodeRequestProps> = ({ onRequestComplete, onBackToLogin }) => {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Validação básica
      if (!email || !fullName || !company) {
        setError('Por favor, preencha todos os campos.');
        setLoading(false);
        return;
      }

      const result = await requestActivationCode({
        email,
        fullName,
        company
      });

      if (result.success && result.emailData) {
        // Enviar email diretamente do frontend
        try {
          // Aqui você implementaria a lógica de envio de email
          // Por exemplo, usando uma API de email como EmailJS, SendGrid, etc.
          
          // Exemplo de mensagem que seria enviada
          const emailSubject = `Novo pedido de código de ativação - ${company}`;
          const emailBody = `
            Um novo usuário solicitou um código de ativação:
            
            Nome: ${fullName}
            Email: ${email}
            Empresa: ${company}
            
            Código de Ativação: ${result.emailData.code}
          `;
          
          console.log('Enviando email para:', result.emailData.adminEmail);
          console.log('Assunto:', emailSubject);
          console.log('Conteúdo:', emailBody);
          
          // Simulando envio bem-sucedido
          setSuccess('Código de ativação solicitado com sucesso. O administrador receberá os detalhes por email.');
          
          // Limpar formulário
          setEmail('');
          setFullName('');
          setCompany('');
          
          // Aguardar alguns segundos e voltar para a tela anterior
          setTimeout(() => {
            onRequestComplete();
          }, 5000);
        } catch (emailError) {
          console.error('Erro ao enviar email:', emailError);
          setError('Ocorreu um erro ao enviar o email. Tente novamente mais tarde.');
        }
      } else {
        setError(result.message || 'Ocorreu um erro ao processar sua solicitação.');
      }
    } catch (err) {
      console.error('Erro ao solicitar código:', err);
      setError('Ocorreu um erro ao processar sua solicitação. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-8 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Solicitar Código de Ativação</h2>
        <p className="mt-2 text-sm text-gray-600">
          Preencha os dados abaixo para solicitar um código de ativação.
          O administrador receberá sua solicitação e entrará em contato.
        </p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="full-name" className="sr-only">Nome completo</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="full-name"
              name="fullName"
              type="text"
              autoComplete="name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="appearance-none rounded-md relative block w-full px-3 py-3 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="Nome completo"
              disabled={loading}
            />
          </div>
        </div>

        <div>
          <label htmlFor="email-address" className="sr-only">Email</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="appearance-none rounded-md relative block w-full px-3 py-3 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="Endereço de e-mail"
              disabled={loading}
            />
          </div>
        </div>

        <div>
          <label htmlFor="company" className="sr-only">Empresa</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Building className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="company"
              name="company"
              type="text"
              autoComplete="organization"
              required
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="appearance-none rounded-md relative block w-full px-3 py-3 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="Nome da empresa"
              disabled={loading}
            />
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={loading}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Solicitar Código'}
          </button>
        </div>

        <div className="text-center mt-4">
          <button 
            type="button" 
            onClick={onRequestComplete} 
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            disabled={loading}
          >
            Voltar para verificação
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