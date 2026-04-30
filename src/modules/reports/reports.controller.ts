import { Controller, Get, Param, UseGuards, Query } from '@nestjs/common';
import { ReportsService } from './reports.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/constants/role.enum.js';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('student/:id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.PARENT, UserRole.STUDENT)
  async getStudentReport(@Param('id') id: string) {
    return this.reportsService.getStudentAcademicReport(id);
  }

  @Get('admin/dashboard')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.TEACHER)
  async getDashboardStats() {
    return this.reportsService.getAdminDashboardStats();
  }

  @Get('attendance-summary')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getAttendanceSummary(@Query('date') date?: string) {
    return this.reportsService.getAttendanceSummaryByClass(date);
  }
}
