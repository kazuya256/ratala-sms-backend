import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  Patch,
  Delete,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { FeesService } from './fees.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/constants/role.enum.js';

@Controller('fees')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FeesController {
  constructor(private readonly feesService: FeesService) {}

  @Post('structures')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ACCOUNTANT)
  async createStructure(@Body() data: any) {
    return this.feesService.createStructure(
      data.name,
      data.amount,
      data.classId,
      data.description,
    );
  }

  @Patch('structures/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ACCOUNTANT)
  async updateStructure(@Param('id') id: string, @Body() data: any) {
    return this.feesService.updateStructure(id, data);
  }

  @Delete('structures/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ACCOUNTANT)
  async deleteStructure(@Param('id') id: string) {
    return this.feesService.deleteStructure(id);
  }

  @Get('structures')
  async getStructures(@Query('classId') classId?: string) {
    return this.feesService.findAllStructures(classId);
  }

  @Post('assign')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ACCOUNTANT)
  async assignFee(@Body() data: any) {
    const dueDate = data.dueDate ? new Date(data.dueDate) : null;
    const finalDueDate = dueDate && !isNaN(dueDate.getTime()) ? dueDate : null;

    return this.feesService.assignFeeToStudent(
      data.studentId,
      data.structureId,
      finalDueDate,
      data.installments,
    );
  }

  @Post('assign-class')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ACCOUNTANT)
  async assignFeeToClass(@Body() data: any) {
    const dueDate = new Date(data.dueDate);
    if (isNaN(dueDate.getTime())) {
      throw new BadRequestException('A valid settlement deadline is required');
    }
    const classIds = Array.isArray(data.classId)
      ? data.classId
      : [data.classId];
    return this.feesService.bulkAssignFeeToClasses(
      classIds,
      data.structureId,
      dueDate,
      data.installments,
      data.amount,
    );
  }

  @Post('deassign-class')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ACCOUNTANT)
  async deassignFeeFromClass(@Body() data: any) {
    const classIds = Array.isArray(data.classId)
      ? data.classId
      : [data.classId];
    return this.feesService.bulkRemoveFeeFromClasses(
      classIds,
      data.structureId,
    );
  }

  @Get('student/:studentId')
  async getStudentFees(@Param('studentId') studentId: string) {
    return this.feesService.getStudentFees(studentId);
  }

  @Patch('student/:studentId/bill/:studentFeeId')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ACCOUNTANT)
  async updateStudentBill(
    @Param('studentId') studentId: string,
    @Param('studentFeeId') studentFeeId: string,
    @Body() data: any,
  ) {
    return this.feesService.updateStudentFeeBill(studentId, studentFeeId, data);
  }

  @Patch('student/:studentId/bill')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ACCOUNTANT)
  async updateStudentBillByBody(
    @Param('studentId') studentId: string,
    @Body() data: any,
  ) {
    return this.feesService.updateStudentFeeBill(
      studentId,
      data.studentFeeId,
      data,
    );
  }

  @Delete('student/:studentId/bill/:studentFeeId')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ACCOUNTANT)
  async deleteStudentBill(
    @Param('studentId') studentId: string,
    @Param('studentFeeId') studentFeeId: string,
  ) {
    return this.feesService.deassignStudentFee(studentId, studentFeeId);
  }

  @Post('student/:studentId/deassign')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ACCOUNTANT)
  async deassignStudentBill(
    @Param('studentId') studentId: string,
    @Body('studentFeeId') studentFeeId: string,
  ) {
    return this.feesService.deassignStudentFee(studentId, studentFeeId);
  }

  @Post('collect')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ACCOUNTANT)
  async collectPayment(@Body() data: any, @Req() req: any) {
    return this.feesService.collectPayment(
      data.studentFeeId,
      data.amount,
      req.user,
      data.method,
      data.transactionId,
    );
  }

  @Post('pay-online')
  async recordOnlinePayment(@Body() data: any) {
    return this.feesService.recordOnlinePayment(
      data.studentFeeId,
      data.amount,
      data.transactionId,
      data.method,
    );
  }

  @Post('refund/:paymentId')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async refundPayment(
    @Param('paymentId') paymentId: string,
    @Body('reason') reason: string,
  ) {
    return this.feesService.refundPayment(paymentId, reason);
  }

  @Get('payments')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ACCOUNTANT)
  async getPayments() {
    return this.feesService.getRecentPayments();
  }

  @Get('pending')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ACCOUNTANT)
  async getPendingFees() {
    return this.feesService.getPendingFees();
  }
}
