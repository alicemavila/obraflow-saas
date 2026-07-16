// Configuração do Sentry executada no navegador.
// Responsável por monitorar erros do frontend, desempenho e Session Replay.

import * as Sentry from '@sentry/nextjs'

const isProduction = process.env.NODE_ENV === 'production'
const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN

Sentry.init({
  /**
   * O DSN identifica o projeto do ObraFlow no Sentry.
   * Ele é carregado por variável de ambiente para permitir configurações
   * diferentes em desenvolvimento, homologação e produção.
   */
  dsn: sentryDsn,

  /**
   * Evita inicializar o Sentry quando o DSN não estiver configurado.
   */
  enabled: Boolean(sentryDsn),

  /**
   * Session Replay.
   *
   * Os textos, campos digitados, imagens e vídeos permanecem ocultos.
   * Isso reduz o risco de registrar informações pessoais ou dados das obras.
   */
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      maskAllInputs: true,
      blockAllMedia: true,
    }),
  ],

  /**
   * Monitoramento de desempenho.
   *
   * Desenvolvimento: registra todas as transações para facilitar os testes.
   * Produção: registra aproximadamente 10% para reduzir volume e custo.
   */
  tracesSampleRate: isProduction ? 0.1 : 1.0,

  /**
   * Permite enviar logs estruturados para o Sentry.
   *
   * Os logs da aplicação não devem conter senhas, tokens, CPF,
   * conteúdo de relatórios, dados pessoais ou corpos completos de requisição.
   */
  enableLogs: true,

  /**
   * Session Replay temporariamente desativado em produção.
   *
   * Em desenvolvimento:
   * - registra aproximadamente 10% das sessões normais;
   * - registra as sessões nas quais ocorrer um erro.
   *
   * Em produção, o recurso permanece desligado até a revisão de LGPD,
   * consentimento, retenção e política de privacidade.
   */
  replaysSessionSampleRate: isProduction ? 0 : 0.1,
  replaysOnErrorSampleRate: isProduction ? 0 : 1.0,

  /**
   * Impede o envio automático de identificação de usuário e
   * corpos de requisições HTTP.
   */
  dataCollection: {
    userInfo: false,
    httpBodies: [],
  },
})

/**
 * Registra transições de rota do App Router para o tracing do Sentry.
 */
export const onRouterTransitionStart =
  Sentry.captureRouterTransitionStart