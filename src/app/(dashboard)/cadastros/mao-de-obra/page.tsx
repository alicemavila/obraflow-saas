import type { Metadata } from 'next'
import { PreCadastroPage } from '@/components/domain/cadastros/PreCadastroPage'

export const metadata: Metadata = { title: 'Mão de Obra' }

export default function MaoDeObraPage() {
  return (
    <PreCadastroPage
      title="Mão de obra"
      description="Cadastre funções e categorias de mão de obra para uso nos diários"
      apiPath="/api/pre-cadastros/mao-de-obra"
      itemLabel="função"
      placeholder="Ex: Pedreiro, Eletricista, Armador..."
    />
  )
}
