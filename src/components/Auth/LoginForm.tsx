import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import PWAInstallButton from '../PWAInstallButton';


export const LoginForm: React.FC = () => {
    const navigate = useNavigate();
    const { signInWithEmail, resetPassword, loading, error } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showResetModal, setShowResetModal] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetMessage, setResetMessage] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        
        try {
            const success = await signInWithEmail({ email, password });
            
            if (success) {
                console.log('Login successful, redirecting to dashboard...');
                // Small delay to allow auth state to update
                setTimeout(() => {
                    navigate('/dashboard');
                }, 100);
            } else {
                console.log('Login failed, error should be displayed');
            }
        } catch (err) {
            console.error('Login error:', err);
        }
    };

    return (
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                    <strong className="font-bold">Erro! </strong>
                    <span className="block sm:inline">{error.message === 'Invalid login credentials' ? 'Email ou senha inválidos.' : error.message}</span>
                </div>
            )}
            <div className="rounded-md shadow-sm space-y-4">
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
                        />
                    </div>
                </div>
                <div>
                    <label htmlFor="password" className="sr-only">Senha</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="appearance-none rounded-md relative block w-full px-3 py-3 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                            placeholder="Senha"
                        />
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between">
                <div className="flex items-center">
                    <input id="remember-me" name="remember-me" type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                    <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">Lembrar-me</label>
                </div>
                <div className="text-sm">
                    <button 
                        type="button"
                        onClick={() => setShowResetModal(true)}
                        className="font-medium text-blue-600 hover:text-blue-500"
                    >
                        Esqueceu sua senha?
                    </button>
                </div>
            </div>

            <div>
                <button
                    type="submit"
                    disabled={loading}
                    className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
                >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Entrar'}
                </button>
            </div>

            {/* Botão de instalação PWA */}
            <PWAInstallButton className="mt-4" />
            
            {/* Link para cadastro */}
            <div className="text-center mt-4">
                <Link 
                    to="/activation" 
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                    Não tem uma conta? Cadastre-se
                </Link>
            </div>




            {/* Modal de Reset de Senha */}
            {showResetModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Redefinir Senha</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Digite seu e-mail e enviaremos um link para redefinir sua senha.
                        </p>
                        
                        {resetMessage && (
                            <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                                {resetMessage}
                            </div>
                        )}
                        
                        <div className="mb-4">
                            <input
                                type="email"
                                value={resetEmail}
                                onChange={(e) => setResetEmail(e.target.value)}
                                placeholder="Seu e-mail"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        
                        <div className="flex space-x-3">
                            <button
                                onClick={async () => {
                                    if (resetEmail) {
                                        const success = await resetPassword(resetEmail);
                                        if (success) {
                                            setResetMessage('E-mail de redefinição enviado! Verifique sua caixa de entrada.');
                                            setTimeout(() => {
                                                setShowResetModal(false);
                                                setResetMessage('');
                                                setResetEmail('');
                                            }, 3000);
                                        }
                                    }
                                }}
                                disabled={!resetEmail || loading}
                                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-400"
                            >
                                {loading ? 'Enviando...' : 'Enviar'}
                            </button>
                            <button
                                onClick={() => {
                                    setShowResetModal(false);
                                    setResetMessage('');
                                    setResetEmail('');
                                }}
                                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </form>
    );
};
