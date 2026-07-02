import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { handleError, ok } from '@/lib/api-response'
import { getCurrentUser } from '@/lib/auth-helpers'
import {
  assertSameTenant, isWorksiteAssociated,
  ForbiddenError, NotFoundError, BusinessError, canGenerateReport,
} from '@/lib/permissions'
import { generatePdfBuffer } from '@/lib/pdf'
import { PeriodReportPDF } from '@/components/pdf/PeriodReportPDF'
import { logAuditEvent } from '@/lib/audit'
import { z } from 'zod'
import { createElement } from 'react'

const schema = z.object({
  dateFrom: z.string().date(),
  dateTo: z.string().date(),
  includePhotos: z.boolean().default(false),
  includeOccurrences: z.boolean().default(true),
  includeLabor: z.boolean().default(true),
  includeMaterials: z.boolean().default(true),
}).refine((d) => new Date(d.dateFrom) <= new Date(d.dateTo), {
  message: 'Data inicial deve ser anterior ou igual à data final',
  path: ['dateTo'],
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()
    if (!canGenerateReport(user)) throw new ForbiddenError()

    const worksite = await prisma.worksite.findUnique({
      where: { id: params.id },
      include: { company: true },
    })
    if (!worksite) throw new NotFoundError('Obra não encontrada')
    if (user.role !== 'SUPER_ADMIN') assertSameTenant(user, worksite.companyId)

    const associated = await isWorksiteAssociated(user, params.id)
    if (!associated) throw new ForbiddenError()

    const body = await req.json()
    const options = schema.parse(body)

    // Max 90 days
    const from = new Date(options.dateFrom)
    const to = new Date(options.dateTo)
    const diffDays = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)
    if (diffDays > 90) {
      throw new BusinessError('Período máximo de 90 dias por relatório', 'RANGE_TOO_LARGE')
    }

    const logs = await prisma.dailyLog.findMany({
      where: {
        worksiteId: params.id,
        companyId: worksite.companyId,
        status: 'APROVADO',
        date: { gte: from, lte: to },
      },
      include: {
        createdBy: { select: { name: true } },
        approvedBy: { select: { name: true } },
        activities: { orderBy: { order: 'asc' } },
        laborRecords: true,
        materials: true,
        occurrences: true,
      },
      orderBy: { date: 'asc' },
    })

    if (logs.length === 0) {
      throw new BusinessError('Nenhum diário aprovado encontrado no período', 'NO_APPROVED_LOGS')
    }

    const pdfBuffer = await generatePdfBuffer(
      createElement(PeriodReportPDF, { worksite, logs, options, generatedBy: user })
    )

    await logAuditEvent({
      userId: user.id, companyId: worksite.companyId,
      action: 'report.generated', entityType: 'Worksite', entityId: params.id,
      payload: { type: 'period', dateFrom: options.dateFrom, dateTo: options.dateTo, totalLogs: logs.length },
      req,
    })

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="relatorio-${options.dateFrom}-${options.dateTo}.pdf"`,
        'Content-Length': String(pdfBuffer.length),
      },
    })
  } catch (err) {
    return handleError(err)
  }
}
