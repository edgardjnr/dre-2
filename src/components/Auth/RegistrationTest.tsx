import React, { useState } from 'react';
import { UserService, UserRegistrationData } from '../services/userService';

/**
 * Test component to demonstrate user registration functionality
 * This component can be used for testing the Supabase connection
 */
export const RegistrationTest: React.FC = () => {
  const [formData, setFormData] = useState<UserRegistrationData>({
    email: '',
    password: '',
    fullName: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [success, setSuccess] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const result = await UserService.registerUser(formData);
      
      if (result.error) {
        setMessage(`Erro: ${result.error.message}`);
        setSuccess(false);
      } else if (result.user) {
        setMessage('Usuário cadastrado com sucesso! Verifique seu email para confirmar a conta.');
        setSuccess(true);
        // Reset form
        setFormData({ email: '', password: '', fullName: '' });
      }
    } catch (error) {
      setMessage('Erro inesperado durante o cadastro.');
      setSuccess(false);
      console.error('Registration error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className=\"max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md\">
      <h2 className=\"text-2xl font-bold mb-6 text-center text-gray-800\">
        Teste de Cadastro - Supabase
      </h2>
      
      <form onSubmit={handleSubmit} className=\"space-y-4\">
        <div>
          <label htmlFor=\"fullName\" className=\"block text-sm font-medium text-gray-700 mb-1\">
            Nome Completo
          </label>
          <input
            type=\"text\"
            id=\"fullName\"
            name=\"fullName\"
            value={formData.fullName}
            onChange={handleInputChange}
            required
            className=\"w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500\"
            placeholder=\"Seu nome completo\"
          />
        </div>

        <div>
          <label htmlFor=\"email\" className=\"block text-sm font-medium text-gray-700 mb-1\">
            Email
          </label>
          <input
            type=\"email\"
            id=\"email\"
            name=\"email\"
            value={formData.email}
            onChange={handleInputChange}
            required
            className=\"w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500\"
            placeholder=\"seu@email.com\"
          />
        </div>

        <div>
          <label htmlFor=\"password\" className=\"block text-sm font-medium text-gray-700 mb-1\">
            Senha
          </label>
          <input
            type=\"password\"
            id=\"password\"
            name=\"password\"
            value={formData.password}
            onChange={handleInputChange}
            required
            minLength={6}
            className=\"w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500\"
            placeholder=\"Mínimo 6 caracteres\"
          />
        </div>

        <button
          type=\"submit\"
          disabled={loading}
          className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${\n            loading\n              ? 'bg-gray-400 cursor-not-allowed'\n              : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500'\n          } text-white`}
        >
          {loading ? 'Cadastrando...' : 'Cadastrar Usuário'}
        </button>
      </form>

      {message && (
        <div className={`mt-4 p-3 rounded-md text-sm ${\n          success\n            ? 'bg-green-100 text-green-700 border border-green-200'\n            : 'bg-red-100 text-red-700 border border-red-200'\n        }`}>
          {message}
        </div>
      )}

      <div className=\"mt-6 text-xs text-gray-500\">
        <p><strong>Configuração necessária:</strong></p>
        <ul className=\"list-disc list-inside mt-1 space-y-1\">
          <li>Arquivo .env com VITE_SUPABASE_URL</li>
          <li>Arquivo .env com VITE_SUPABASE_ANON_KEY</li>
          <li>Migrações do banco executadas</li>
          <li>Autenticação por email habilitada no Supabase</li>
        </ul>
      </div>
    </div>
  );
};