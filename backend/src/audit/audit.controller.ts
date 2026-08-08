import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AuditController {
    constructor(private readonly auditService: AuditService) {}

    @Get('audit')
    recent(@Query('limit') limit?: string) {
        const n = limit ? parseInt(limit, 10) : 100;
        return {
            total: this.auditService.count(),
            events: this.auditService.recent(Number.isFinite(n) ? n : 100),
        };
    }
}
