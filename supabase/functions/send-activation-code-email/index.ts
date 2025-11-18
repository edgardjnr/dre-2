// Função Supabase Edge para enviar email com código de ativação
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
// Usando diretamente o serviço de email do Supabase, sem dependência do Resend

interface EmailPayload {
  adminEmail: string;
  userEmail: string;
  userName: string;
  company: string;
  activationCode: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Lidar com requisições OPTIONS para CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: EmailPayload = await req.json();
    const { adminEmail, userEmail, userName, company, activationCode } = payload;

    // Validar os dados recebidos
    if (!adminEmail || !userEmail || !userName || !company || !activationCode) {
      return new Response(
        JSON.stringify({ error: 'Dados incompletos para envio de email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Configurar o email para o administrador
    const emailContent = `
      <h2>Solicitação de Código de Ativação</h2>
      <p>Um novo usuário solicitou acesso ao sistema:</p>
      <ul>
        <li><strong>Nome:</strong> ${userName}</li>
        <li><strong>Email:</strong> ${userEmail}</li>
        <li><strong>Empresa:</strong> ${company}</li>
      </ul>
      <p><strong>Código de Ativação:</strong> ${activationCode}</p>
      <p>Este código pode ser fornecido ao usuário para completar o cadastro no sistema.</p>
    `;

    // Enviar email usando o serviço de email do Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Variáveis de ambiente do Supabase não configuradas');
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        to: adminEmail,
        subject: 'Nova Solicitação de Código de Ativação',
        html: emailContent,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Erro ao enviar email: ${JSON.stringify(errorData)}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});