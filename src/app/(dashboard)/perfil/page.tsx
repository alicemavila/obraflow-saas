import { redirect } from 'next/navigation'
// Compatibilidade: /perfil → /cadastros/perfil
export default function PerfilRedirect() {
  redirect('/cadastros/perfil')
}
