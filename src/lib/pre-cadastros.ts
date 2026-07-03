/**
 * Pré-cadastros genéricos por empresa
 * Cada categoria é uma tabela separada com os campos: id, companyId, name, createdAt, updatedAt
 * Implementado com JSONB no PostgreSQL via uma única tabela PreCadastro com campo "category"
 * para simplificar o MVP sem migrations extras.
 */

import { prisma } from '@/lib/db'
import type { NextRequest } from 'next/server'
import { ok, created, handleError } from '@/lib/api-response'
import { getCurrentUser } from '@/lib/auth-helpers'
import { ForbiddenError, NotFoundError, assertSameTenant } from '@/lib/permissions'
import { z } from 'zod'

export type PreCadastroCategory =
  | 'mao-de-obra'
  | 'equipamentos'
  | 'tipos-ocorrencia'
  | 'checklist'
  | 'modelos-relatorio'

const VALID_CATEGORIES: PreCadastroCategory[] = [
  'mao-de-obra',
  'equipamentos',
  'tipos-ocorrencia',
  'checklist',
  'modelos-relatorio',
]

export function isValidCategory(cat: string): cat is PreCadastroCategory {
  return VALID_CATEGORIES.includes(cat as PreCadastroCategory)
}

const createSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(255),
  description: z.string().max(1000).optional(),
})

// ─── Handlers reutilizáveis ───────────────────────────────────────────────────

export async function handleList(req: NextRequest, category: PreCadastroCategory) {
  try {
    const user = await getCurrentUser()
    const items = await prisma.preCadastro.findMany({
      where: {
        category,
        companyId: user.role !== 'SUPER_ADMIN' ? (user.companyId ?? undefined) : undefined,
      },
      select: { id: true, name: true, description: true, createdAt: true },
      orderBy: { name: 'asc' },
    })
    return ok(items)
  } catch (err) {
    return handleError(err)
  }
}

export async function handleCreate(req: NextRequest, category: PreCadastroCategory) {
  try {
    const user = await getCurrentUser()
    if (!['SUPER_ADMIN', 'ADMIN_EMPRESA'].includes(user.role)) throw new ForbiddenError()

    const body = await req.json()
    const { name, description } = createSchema.parse(body)

    const item = await prisma.preCadastro.create({
      data: {
        category,
        name,
        description: description ?? null,
        companyId: user.role === 'SUPER_ADMIN'
          ? ((body.companyId as string) ?? user.companyId!)
          : user.companyId!,
      },
    })
    return created(item)
  } catch (err) {
    return handleError(err)
  }
}

export async function handleUpdate(req: NextRequest, category: PreCadastroCategory, id: string) {
  try {
    const user = await getCurrentUser()
    if (!['SUPER_ADMIN', 'ADMIN_EMPRESA'].includes(user.role)) throw new ForbiddenError()

    const item = await prisma.preCadastro.findFirst({ where: { id, category } })
    if (!item) throw new NotFoundError('Item não encontrado')
    if (user.role !== 'SUPER_ADMIN') assertSameTenant(user, item.companyId)

    const body = await req.json()
    const { name, description } = createSchema.partial().parse(body)
    const updated = await prisma.preCadastro.update({ where: { id }, data: { name, description } })
    return ok(updated)
  } catch (err) {
    return handleError(err)
  }
}

export async function handleDelete(req: NextRequest, category: PreCadastroCategory, id: string) {
  try {
    const user = await getCurrentUser()
    if (!['SUPER_ADMIN', 'ADMIN_EMPRESA'].includes(user.role)) throw new ForbiddenError()

    const item = await prisma.preCadastro.findFirst({ where: { id, category } })
    if (!item) throw new NotFoundError('Item não encontrado')
    if (user.role !== 'SUPER_ADMIN') assertSameTenant(user, item.companyId)

    await prisma.preCadastro.delete({ where: { id } })
    return ok(null, 'Item removido')
  } catch (err) {
    return handleError(err)
  }
}
