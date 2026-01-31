import React from 'react';
import { SignUpForm } from '../components/Auth/SignUpForm';
import { AuthLayout } from '../components/Auth/AuthLayout';
import { ConfigurationStatus } from '../components/ConfigurationStatus';
import PWAInstallBanner from '../components/PWAInstallBanner';
import { isSupabaseConfigured } from '../utils/supabaseConfig';

export const SignUpPage: React.FC = () => {
    // Verificar se o Supabase está configurado
    const supabaseConfigured = isSupabaseConfigured();

    return (
        <>
            <AuthLayout title="Cadastre-se" subtitle="Crie sua conta para acessar o sistema">
                {supabaseConfigured ? (
                    <SignUpForm />
                ) : (
                    <ConfigurationStatus isConfigured={false} />
                )}
            </AuthLayout>
            <PWAInstallBanner />
        </>
    );
};

export default SignUpPage;
