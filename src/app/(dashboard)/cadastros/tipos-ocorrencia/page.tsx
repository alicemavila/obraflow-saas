import type { Metadata } from 'next'
import { PreCadastroPage } from '@/components/domain/cadastros/PreCadastroPage'
export const metadata: Metadata = { title: 'Tipos de Ocorrências' }
export default function TiposOcorrenciaPage() {
  return (
    <PreCadastroPage
      title="Tipos de ocorrências"
      description="Defina os tipos de ocorrências disponíveis nos diários de obra"
      apiPath="/api/pre-cadastros/tipos-ocorrencia"
      itemLabel="tipo de ocorrência"
      placeholder="Ex: Acidente, Paralisação, Visita técnica..."
    />
  )
}
