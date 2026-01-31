import React from 'react';
import { AuthLayout } from '../components/Auth/AuthLayout';
import { LoginForm } from '../components/Auth/LoginForm';
import { ConfigurationStatus } from '../components/ConfigurationStatus';
import { isSupabaseConfigured } from '../utils/supabaseConfig';

const LoginPage: React.FC = () => {
    
    
    // Show configuration screen if Supabase is not configured
    if (!isSupabaseConfigured()) {
        return <ConfigurationStatus isConfigured={false} />;
    }

    return (
        <>
            <AuthLayout title="Bem-vindo de volta!" description="Faça login para acessar sua conta.">
                <LoginForm />
            </AuthLayout>
            
            

        </>
    );
};

export default LoginPage;
