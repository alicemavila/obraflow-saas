import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'crypto'

// Cloudflare R2 é compatível com S3 API
const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT ?? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
  },
})

const BUCKET = process.env.R2_BUCKET_NAME ?? 'diario-obras-files'

// ─── Tipos de arquivo permitidos ─────────────────────────────────────────────

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'image/vnd.dwg',
  'image/x-dwg',
]
export const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES]

export const MAX_IMAGE_SIZE_BYTES = (parseInt(process.env.MAX_UPLOAD_SIZE_MB ?? '20', 10)) * 1024 * 1024
export const MAX_PDF_SIZE_BYTES = (parseInt(process.env.MAX_PDF_SIZE_MB ?? '50', 10)) * 1024 * 1024

// ─── Helpers de chave ─────────────────────────────────────────────────────────

export function generateStorageKey(
  companyId: string,
  entityType: string,
  entityId: string,
  originalFileName: string
): string {
  const ext = originalFileName.split('.').pop()?.toLowerCase() ?? 'bin'
  const uuid = randomUUID()
  return `companies/${companyId}/${entityType}/${entityId}/${uuid}.${ext}`
}

export function generateTempKey(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? 'bin'
  return `temp/${randomUUID()}.${ext}`
}

export function generateReportKey(companyId: string, reportId: string): string {
  return `companies/${companyId}/reports/${reportId}.pdf`
}

// ─── Operações S3 ─────────────────────────────────────────────────────────────

/**
 * Gera uma URL pré-assinada para upload direto do browser.
 */
export async function generatePresignedUploadUrl(
  storageKey: string,
  mimeType: string,
  expiresInSeconds = 900 // 15 minutos
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: storageKey,
    ContentType: mimeType,
  })
  return getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds })
}

/**
 * Gera uma URL pré-assinada para download/visualização temporária.
 */
export async function generatePresignedDownloadUrl(
  storageKey: string,
  expiresInSeconds = 3600 // 1 hora
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: storageKey,
  })
  return getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds })
}

/**
 * Deleta um objeto do bucket.
 */
export async function deleteObject(storageKey: string): Promise<void> {
  await s3Client.send(
    new DeleteObjectCommand({ Bucket: BUCKET, Key: storageKey })
  )
}

/**
 * Valida se o MIME type é permitido.
 */
export function validateMimeType(mimeType: string): boolean {
  return ALLOWED_TYPES.includes(mimeType)
}

/**
 * Valida se o tamanho é aceito para o tipo.
 */
export function validateFileSize(mimeType: string, size: number): boolean {
  if (ALLOWED_IMAGE_TYPES.includes(mimeType)) {
    return size <= MAX_IMAGE_SIZE_BYTES
  }
  return size <= MAX_PDF_SIZE_BYTES
}

/**
 * Retorna URL pública (para arquivos públicos com CDN).
 */
export function getPublicUrl(storageKey: string): string {
  const base = process.env.R2_PUBLIC_URL ?? ''
  return `${base}/${storageKey}`
}
