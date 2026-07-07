import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  Ip,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { UserRole } from '@ellixr/shared';
import type { JwtPayload } from '@ellixr/shared';
import { CurrentUser, Roles } from '../../common/decorators';
import { AuditService } from '../../common/audit.module';
import { ReportsService, REPORT_TYPES, type ReportType } from './reports.service';
import { toCsv, toXlsx } from './report-serializers';

const FORMATS = ['csv', 'xlsx'] as const;
type Format = (typeof FORMATS)[number];

const CONTENT_TYPE: Record<Format, string> = {
  csv: 'text/csv; charset=utf-8',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

@Controller('reports')
@Roles(UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER)
export class ReportsController {
  constructor(
    private readonly reports: ReportsService,
    private readonly audit: AuditService,
  ) {}

  private collegeId(user: JwtPayload): string {
    if (!user.collegeId) throw new BadRequestException('No college context');
    return user.collegeId;
  }

  /** Lists the report types a college can export (for the web picker). */
  @Get()
  list() {
    return { data: { reportTypes: REPORT_TYPES, formats: FORMATS } };
  }

  /**
   * Builds and streams a report as an attachment. Uses the raw express Response
   * (@Res), which bypasses the {data} envelope interceptor — the standard
   * download pattern. The dataset is tenant-scoped via the JWT collegeId.
   */
  @Post(':type/export')
  @HttpCode(200)
  async export(
    @CurrentUser() user: JwtPayload,
    @Param('type') type: string,
    @Query('format') format = 'csv',
    @Ip() ip: string,
    @Res() res: Response,
  ): Promise<void> {
    if (!REPORT_TYPES.includes(type as ReportType)) {
      throw new BadRequestException(`Unknown report type. Allowed: ${REPORT_TYPES.join(', ')}`);
    }
    if (!FORMATS.includes(format as Format)) {
      throw new BadRequestException(`Unknown format. Allowed: ${FORMATS.join(', ')}`);
    }

    const dataset = await this.reports.build(this.collegeId(user), type as ReportType);
    const fmt = format as Format;
    const buffer = fmt === 'xlsx' ? await toXlsx(dataset) : toCsv(dataset);

    // PII egress — record who exported what.
    await this.audit.record(user, {
      action: 'REPORT_EXPORT',
      targetType: 'report',
      targetId: type,
      metadata: { format: fmt, rows: dataset.rows.length },
      ip,
    });

    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `${dataset.filename}-${stamp}.${fmt}`;

    res.setHeader('Content-Type', CONTENT_TYPE[fmt]);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  }
}
