import { redirect } from 'next/navigation'

// /cadastros → /cadastros/perfil
export default function CadastrosPage() {
  redirect('/cadastros/perfil')
}
