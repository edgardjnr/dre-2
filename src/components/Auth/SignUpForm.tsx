import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { validateActivationCode, markActivationCodeAsUsed } from '../../services/activationCodeService';

export const SignUpForm: React.FC = () => {
    const navigate = useNavigate();
    const { signUpWithEmail, loading, error } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [signupSuccess, setSignupSuccess] = useState(false);

    const [activationCode, setActivationCode] = useState('');
    const [codeError, setCodeError] = useState('');
    
    // Verificar se há um código de ativação válido no localStorage
    useEffect(() => {
        const storedCode = localStorage.getItem('validActivationCode');
        if (storedCode) {
            setActivationCode(storedCode);
        } else {
            // Redirecionar para a página de verificação de código se não houver código válido
            navigate('/activation');
        }
    }, [navigate]);

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validação básica
        setPasswordError('');
        setCodeError('');
        
        if (password !== confirmPassword) {
            setPasswordError('As senhas não coincidem.');
            return;
        }
        
        if (password.length < 6) {
            setPasswordError('A senha deve ter pelo menos 6 caracteres.');
            return;
        }
        
        // Verificar o código de ativação
        if (!activationCode || activationCode.trim() === '') {
            setCodeError('É necessário um código de ativação válido para se cadastrar.');
            navigate('/activation');
            return;
        }
        
        try {
            const formattedCode = activationCode.trim().toUpperCase();
            console.log('Validando código de ativação antes do cadastro:', formattedCode);
            // Validar o código de ativação novamente antes de prosseguir
            const codeValidation = await validateActivationCode(formattedCode);
            console.log('Resultado da validação no cadastro:', codeValidation);
            
            if (!codeValidation.valid) {
                setCodeError(codeValidation.message);
                localStorage.removeItem('validActivationCode');
                console.log('Código inválido, redirecionando para ativação. Motivo:', codeValidation.message);
                navigate('/activation');
                return;
            }
            
            // Atualizar o código formatado
            setActivationCode(formattedCode);
            
            // Prosseguir com o cadastro
            const success = await signUpWithEmail({ 
                email, 
                password, 
                full_name: fullName 
            });
            
            if (success) {
                // Marcar o código como utilizado
                const formattedCode = activationCode.trim().toUpperCase();
                console.log('Marcando código como utilizado após cadastro:', formattedCode);
                const markResult = await markActivationCodeAsUsed(formattedCode);
                console.log('Resultado da marcação do código como utilizado:', markResult ? 'Sucesso' : 'Falha');
                
                // Limpar o código do localStorage
                localStorage.removeItem('validActivationCode');
                
                setSignupSuccess(true);
                // Limpar formulário
                setEmail('');
                setPassword('');
                setConfirmPassword('');
                setFullName('');
                
                // Redirecionar após alguns segundos ou mostrar mensagem de sucesso
                setTimeout(() => {
                    navigate('/login');
                }, 3000);
            }
        } catch (err) {
            console.error('Erro no cadastro:', err);
        }
    };

    return (
        <form className="mt-8 space-y-6" onSubmit={handleSignUp}>
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                    <strong className="font-bold">Erro! </strong>
                    <span className="block sm:inline">
                        {error.message === 'User already registered' 
                            ? 'Este e-mail já está cadastrado.' 
                            : error.message}
                    </span>
                </div>
            )}
            
            {codeError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                    <strong className="font-bold">Erro de código! </strong>
                    <span className="block sm:inline">{codeError}</span>
                </div>
            )}
            
            {signupSuccess && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
                    <strong className="font-bold">Sucesso! </strong>
                    <span className="block sm:inline">
                        Cadastro realizado com sucesso! Verifique seu e-mail para confirmar sua conta.
                    </span>
                </div>
            )}
            
            <div className="rounded-md shadow-sm space-y-4">
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
                            autoComplete="new-password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="appearance-none rounded-md relative block w-full px-3 py-3 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                            placeholder="Senha"
                        />
                    </div>
                </div>
                
                <div>
                    <label htmlFor="confirm-password" className="sr-only">Confirmar Senha</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            id="confirm-password"
                            name="confirmPassword"
                            type="password"
                            autoComplete="new-password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="appearance-none rounded-md relative block w-full px-3 py-3 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                            placeholder="Confirmar senha"
                        />
                    </div>
                </div>
                
                {passwordError && (
                    <div className="text-red-500 text-sm">{passwordError}</div>
                )}
            </div>

            <div>
                <button
                    type="submit"
                    disabled={loading}
                    className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
                >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Cadastrar'}
                </button>
            </div>
            
            <div className="text-center mt-4">
                <button 
                    type="button" 
                    onClick={() => navigate('/login')} 
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                    Já tem uma conta? Faça login
                </button>
            </div>
        </form>
    );
};

export default SignUpForm;