import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { handleError } from '@/lib/api-response'
import { getCurrentUser } from '@/lib/auth-helpers'
import {
  assertSameTenant, isWorksiteAssociated,
  ForbiddenError, NotFoundError, BusinessError, canGenerateReport,
} from '@/lib/permissions'
import { generatePdfBuffer } from '@/lib/pdf'
import { DailyLogPDF } from '@/components/pdf/DailyLogPDF'
import { logAuditEvent } from '@/lib/audit'
import { createElement } from 'react'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()
    if (!canGenerateReport(user)) throw new ForbiddenError()

    const log = await prisma.dailyLog.findUnique({
      where: { id: params.id },
      include: {
        worksite: { include: { company: true } },
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        activities: { orderBy: { order: 'asc' } },
        laborRecords: true,
        materials: true,
        occurrences: { include: { createdBy: { select: { name: true } } } },
      },
    })

    if (!log) throw new NotFoundError('Diário não encontrado')
    if (user.role !== 'SUPER_ADMIN') assertSameTenant(user, log.companyId)
    if (log.status !== 'APROVADO') {
      throw new BusinessError('Relatório só pode ser gerado para diários aprovados', 'DIARY_NOT_APPROVED')
    }

    const associated = await isWorksiteAssociated(user, log.worksiteId)
    if (!associated) throw new ForbiddenError()

    const pdfBuffer = await generatePdfBuffer(createElement(DailyLogPDF, { log }))

    await logAuditEvent({
      userId: user.id, companyId: log.companyId,
      action: 'report.generated', entityType: 'DailyLog', entityId: params.id,
      payload: { type: 'daily_log' }, req: _req,
    })

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="diario-${log.date.toISOString().split('T')[0]}.pdf"`,
        'Content-Length': String(pdfBuffer.length),
      },
    })
  } catch (err) {
    return handleError(err)
  }
}
