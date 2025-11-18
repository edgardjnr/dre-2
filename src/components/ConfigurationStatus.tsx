import React from 'react';
import { AlertTriangle, Settings, Database, Key } from 'lucide-react';

interface ConfigurationStatusProps {
  isConfigured: boolean;
}

export const ConfigurationStatus: React.FC<ConfigurationStatusProps> = ({ isConfigured }) => {
  if (isConfigured) {
    return null; // Don't render anything if properly configured
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg border border-red-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Configuração do Supabase Necessária
              </h1>
              <p className="text-sm text-gray-600">
                As variáveis de ambiente não estão configuradas corretamente
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Settings className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-yellow-800">
                  Status da Configuração
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
                  O arquivo .env não contém as credenciais válidas do Supabase. 
                  A aplicação está funcionando em modo de demonstração.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
              <Database className="h-5 w-5" />
              <span>Como Configurar o Supabase</span>
            </h3>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">1. Criar Projeto no Supabase</h4>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Acesse <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">supabase.com</a></li>
                  <li>Crie uma conta e um novo projeto</li>
                  <li>Aguarde a configuração completa do projeto</li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">2. Obter Credenciais</h4>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>No dashboard do Supabase, vá em <strong>Settings → API</strong></li>
                  <li>Copie a <strong>Project URL</strong></li>
                  <li>Copie a <strong>anon public key</strong></li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">3. Configurar Variáveis de Ambiente</h4>
                <p className="text-sm text-gray-600 mb-2">
                  Edite o arquivo <code className="bg-gray-200 px-1 rounded">.env</code> na raiz do projeto:
                </p>
                <div className="bg-gray-800 text-gray-100 p-3 rounded text-xs font-mono overflow-x-auto">
                  <div className="space-y-1">
                    <div>VITE_SUPABASE_URL=https://seu-projeto-id.supabase.co</div>
                    <div>VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui</div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">4. Executar Migrações</h4>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>No dashboard do Supabase, vá em <strong>SQL Editor</strong></li>
                  <li>Execute os arquivos em <code>supabase/migrations/</code></li>
                  <li>Ou use o Supabase CLI para executar as migrações</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Key className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-blue-800">
                  Após a Configuração
                </h3>
                <p className="text-sm text-blue-700 mt-1">
                  Reinicie o servidor de desenvolvimento (<code>npm run dev</code>) 
                  para que as novas variáveis de ambiente sejam carregadas.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-4 rounded-b-lg">
          <p className="text-xs text-gray-500">
            💡 <strong>Dica:</strong> Verifique o console do navegador (F12) para mensagens 
            de erro detalhadas durante o desenvolvimento.
          </p>
        </div>
      </div>
    </div>
  );
};