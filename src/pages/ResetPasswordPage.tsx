import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { AuthLayout } from '../components/Auth/AuthLayout';

const ResetPasswordPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Verificar tokens na URL (hash ou query) e preparar sessão
    useEffect(() => {
        const hash = window.location.hash?.startsWith('#') ? window.location.hash.slice(1) : '';
        const hashParams = new URLSearchParams(hash);
        const queryAccessToken = searchParams.get('access_token');
        const queryRefreshToken = searchParams.get('refresh_token');
        const accessToken = queryAccessToken || hashParams.get('access_token');
        const refreshToken = queryRefreshToken || hashParams.get('refresh_token');
        const type = searchParams.get('type') || hashParams.get('type');

        if (accessToken && refreshToken) {
            supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
            });
            setError(null);
        } else {
            const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
                if (event === 'PASSWORD_RECOVERY' && session) {
                    setError(null);
                } else if (!session) {
                    setError('Abra a página pelo link recebido no e-mail para concluir a redefinição.');
                }
            });
            return () => {
                authListener.subscription.unsubscribe();
            };
        }
    }, [searchParams]);

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }

        if (password.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) {
                setError(error.message);
            } else {
                setSuccess(true);
                setTimeout(() => {
                    navigate('/login');
                }, 3000);
            }
        } catch {
            setError('Erro ao redefinir senha. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <AuthLayout title="Senha Redefinida!" description="Sua senha foi alterada com sucesso.">
                <div className="text-center">
                    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                        <p className="font-medium">Senha redefinida com sucesso!</p>
                        <p className="text-sm">Você será redirecionado para a página de login em alguns segundos...</p>
                    </div>
                </div>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout title="Redefinir Senha" description="Digite sua nova senha abaixo.">
            <form className="mt-8 space-y-6" onSubmit={handleResetPassword}>
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                        <strong className="font-bold">Erro! </strong>
                        <span className="block sm:inline">{error}</span>
                    </div>
                )}
                
                <div className="rounded-md shadow-sm space-y-4">
                    <div>
                        <label htmlFor="password" className="sr-only">Nova Senha</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="appearance-none rounded-md relative block w-full px-3 py-3 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                placeholder="Nova senha"
                            />
                        </div>
                    </div>
                    
                    <div>
                        <label htmlFor="confirmPassword" className="sr-only">Confirmar Nova Senha</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="appearance-none rounded-md relative block w-full px-3 py-3 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                placeholder="Confirmar nova senha"
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
                    >
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Redefinir Senha'}
                    </button>
                </div>
            </form>
        </AuthLayout>
    );
};

export default ResetPasswordPage;
