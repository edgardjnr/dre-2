import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { CheckCircle, XCircle, Loader2, Database, Key, User } from 'lucide-react';

export const SupabaseConnectionTest: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [authStatus, setAuthStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [databaseStatus, setDatabaseStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errors, setErrors] = useState<string[]>([]);
  const [testUser, setTestUser] = useState<any>(null);

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    const errorsList: string[] = [];
    
    try {
      // Test 1: Basic connection
      console.log('Testing Supabase connection...');
      setConnectionStatus('loading');
      
      // Check if we have valid credentials
      const url = import.meta.env.VITE_SUPABASE_URL;
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!url || !key || url.includes('your-project') || key.includes('your-anon')) {
        errorsList.push('Invalid Supabase credentials in .env file');
        setConnectionStatus('error');
      } else {
        setConnectionStatus('success');
      }

      // Test 2: Auth service
      console.log('Testing auth service...');
      setAuthStatus('loading');
      
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          errorsList.push(`Auth error: ${sessionError.message}`);
          setAuthStatus('error');
        } else {
          setAuthStatus('success');
          if (session) {
            setTestUser(session.user);
          }
        }
      } catch (authError: any) {
        errorsList.push(`Auth connection failed: ${authError.message}`);
        setAuthStatus('error');
      }

      // Test 3: Database connection (try to access profiles table)
      console.log('Testing database connection...');
      setDatabaseStatus('loading');
      
      try {
        const { data, error: dbError } = await supabase
          .from('profiles')
          .select('id')
          .limit(1);
          
        if (dbError) {
          if (dbError.message.includes('relation "public.profiles" does not exist')) {
            errorsList.push('Profiles table not found - migrations may not have been run');
          } else {
            errorsList.push(`Database error: ${dbError.message}`);
          }
          setDatabaseStatus('error');
        } else {
          setDatabaseStatus('success');
        }
      } catch (dbError: any) {
        errorsList.push(`Database connection failed: ${dbError.message}`);
        setDatabaseStatus('error');
      }

    } catch (generalError: any) {
      errorsList.push(`General error: ${generalError.message}`);
      setConnectionStatus('error');
      setAuthStatus('error');
      setDatabaseStatus('error');
    }

    setErrors(errorsList);
    console.log('Supabase connection test completed');
  };

  const createTestUser = async () => {
    try {
      const testEmail = 'test@example.com';
      const testPassword = 'test123456';
      
      console.log('Creating test user...');
      
      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
        options: {
          data: {
            full_name: 'Test User'
          }
        }
      });

      if (error) {
        console.error('Test user creation failed:', error);
        alert(`Erro ao criar usuário teste: ${error.message}`);
      } else {
        console.log('Test user created:', data);
        alert(`Usuário teste criado com sucesso! Email: ${testEmail}, Senha: ${testPassword}`);
      }
    } catch (error: any) {
      console.error('Test user creation error:', error);
      alert(`Erro: ${error.message}`);
    }
  };

  const StatusIcon = ({ status }: { status: 'loading' | 'success' | 'error' }) => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center">Teste de Conexão Supabase</h2>
      
      <div className="space-y-4">
        <div className="flex items-center space-x-3 p-4 border rounded-lg">
          <Database className="h-6 w-6 text-blue-600" />
          <div className="flex-1">
            <h3 className="font-medium">Configuração Básica</h3>
            <p className="text-sm text-gray-600">URL e chave anônima</p>
          </div>
          <StatusIcon status={connectionStatus} />
        </div>

        <div className="flex items-center space-x-3 p-4 border rounded-lg">
          <Key className="h-6 w-6 text-blue-600" />
          <div className="flex-1">
            <h3 className="font-medium">Serviço de Autenticação</h3>
            <p className="text-sm text-gray-600">Conexão com Supabase Auth</p>
          </div>
          <StatusIcon status={authStatus} />
        </div>

        <div className="flex items-center space-x-3 p-4 border rounded-lg">
          <User className="h-6 w-6 text-blue-600" />
          <div className="flex-1">
            <h3 className="font-medium">Banco de Dados</h3>
            <p className="text-sm text-gray-600">Acesso às tabelas</p>
          </div>
          <StatusIcon status={databaseStatus} />
        </div>
      </div>

      {errors.length > 0 && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="font-medium text-red-800 mb-2">Erros Encontrados:</h3>
          <ul className="text-sm text-red-700 space-y-1">
            {errors.map((error, index) => (
              <li key={index} className="list-disc list-inside">{error}</li>
            ))}
          </ul>
        </div>
      )}

      {testUser && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-medium text-green-800 mb-2">Usuário Logado:</h3>
          <p className="text-sm text-green-700">{testUser.email}</p>
        </div>
      )}

      <div className="mt-6 space-y-3">
        <button
          onClick={testConnection}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Testar Novamente
        </button>
        
        <button
          onClick={createTestUser}
          className="w-full py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          Criar Usuário Teste
        </button>
      </div>

      <div className="mt-4 text-xs text-gray-500">
        <p><strong>Credenciais de teste:</strong></p>
        <p>Email: test@example.com | Senha: test123456</p>
      </div>
    </div>
  );
};