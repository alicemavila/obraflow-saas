import { redirect } from 'next/navigation'

/**
 * /obras/nova agora redireciona para /obras
 * O cadastro de obras é feito via modal "+ ADICIONAR" no header (AppLayout).
 * Manter esta rota para compatibilidade com links antigos.
 */
export default function NovaObraRedirect() {
  redirect('/obras')
}
