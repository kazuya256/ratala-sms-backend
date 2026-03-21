import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { FeesService } from './fees.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/constants/role.enum.js';

@Controller('fees')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FeesController {
    constructor(private readonly feesService: FeesService) { }

    @Post('structures')
    @Roles(UserRole.ADMIN)
    async createStructure(@Body() data: any) {
        return this.feesService.createStructure(data.name, data.amount, data.classId, data.description);
    }

    @Get('structures')
    async getStructures() {
        return this.feesService.findAllStructures();
    }

    @Post('assign')
    @Roles(UserRole.ADMIN)
    async assignFee(@Body() data: any) {
        return this.feesService.assignFeeToStudent(data.studentId, data.structureId, new Date(data.dueDate), data.installments);
    }

    @Get('student/:studentId')
    async getStudentFees(@Param('studentId') studentId: string) {
        return this.feesService.getStudentFees(studentId);
    }

    @Post('collect')
    @Roles(UserRole.ADMIN)
    async collectPayment(@Body() data: any, @Req() req: any) {
        return this.feesService.collectPayment(data.studentFeeId, data.amount, req.user, data.method, data.transactionId);
    }

    @Post('pay-online')
    async recordOnlinePayment(@Body() data: any) {
        return this.feesService.recordOnlinePayment(data.studentFeeId, data.amount, data.transactionId, data.method);
    }

    @Post('refund/:paymentId')
    @Roles(UserRole.ADMIN)
    async refundPayment(@Param('paymentId') paymentId: string, @Body('reason') reason: string) {
        return this.feesService.refundPayment(paymentId, reason);
    }

    @Get('payments')
    @Roles(UserRole.ADMIN)
    async getPayments() {
        return this.feesService.getRecentPayments();
    }

    @Get('pending')
    @Roles(UserRole.ADMIN)
    async getPendingFees() {
        return this.feesService.getPendingFees();
    }
}
