import { validateFileNameForMimeType } from '@/lib/s3'

describe('validateFileNameForMimeType', () => {
  it('aceita extensao coerente com MIME permitido', () => {
    expect(validateFileNameForMimeType('foto-obra.jpg', 'image/jpeg')).toBe(true)
    expect(validateFileNameForMimeType('relatorio.pdf', 'application/pdf')).toBe(true)
    expect(validateFileNameForMimeType('planilha.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')).toBe(true)
  })

  it('bloqueia extensoes executaveis mesmo com MIME permitido', () => {
    expect(validateFileNameForMimeType('script.exe', 'application/pdf')).toBe(false)
    expect(validateFileNameForMimeType('instalador.bat', 'application/pdf')).toBe(false)
  })

  it('bloqueia dupla extensao com segmento perigoso', () => {
    expect(validateFileNameForMimeType('imagem_falsa_na_verdade.exe.jpg', 'image/jpeg')).toBe(false)
  })

  it('bloqueia mismatch entre extensao final e MIME declarado', () => {
    expect(validateFileNameForMimeType('foto.png', 'image/jpeg')).toBe(false)
    expect(validateFileNameForMimeType('documento.pdf', 'image/png')).toBe(false)
  })

  it('bloqueia nomes sem extensao ou com separadores de caminho', () => {
    expect(validateFileNameForMimeType('sem-extensao', 'image/jpeg')).toBe(false)
    expect(validateFileNameForMimeType('../foto.jpg', 'image/jpeg')).toBe(false)
    expect(validateFileNameForMimeType('..\\foto.jpg', 'image/jpeg')).toBe(false)
  })
})
