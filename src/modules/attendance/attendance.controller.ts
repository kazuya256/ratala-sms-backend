import { Controller, Get, Post, Body, Param, UseGuards, Query, Req } from '@nestjs/common';
import { AttendanceService } from './attendance.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/constants/role.enum.js';

@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendanceController {
    constructor(private readonly attendanceService: AttendanceService) { }

    @Post('student')
    @Roles(UserRole.ADMIN, UserRole.TEACHER)
    async recordStudent(@Req() req: any, @Body() data: any) {
        return this.attendanceService.recordStudentAttendance(req.user, data);
    }

    @Post('student/batch')
    @Roles(UserRole.ADMIN, UserRole.TEACHER)
    async recordBatch(@Req() req: any, @Body() data: any) {
        return this.attendanceService.recordBatchAttendance(req.user, data);
    }

    @Get('student/:id')
    async getStudentAttendance(
        @Param('id') id: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string
    ) {
        return this.attendanceService.getStudentAttendance(
            id,
            startDate ? new Date(startDate) : undefined,
            endDate ? new Date(endDate) : undefined
        );
    }

    @Get('class')
    @Roles(UserRole.ADMIN, UserRole.TEACHER)
    async getClassAttendance(
        @Query('classId') classId?: string,
        @Query('sectionId') sectionId?: string,
        @Query('date') date?: string
    ) {
        return this.attendanceService.getClassAttendance(classId, sectionId, date);
    }

    @Get('teachers')
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.TEACHER)
    async getTeacherAttendance(
        @Req() req: any,
        @Query('teacherId') teacherId?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string
    ) {
        // Teachers can only see their own unless they are admins
        let finalTeacherId = teacherId;
        if (req.user.role === UserRole.TEACHER) {
            finalTeacherId = req.user.id;
        }

        return this.attendanceService.getTeacherAttendanceReport(
            finalTeacherId,
            startDate ? new Date(startDate) : undefined,
            endDate ? new Date(endDate) : undefined
        );
    }

    @Post('teacher/check-in')
    @Roles(UserRole.TEACHER)
    async teacherCheckIn(@Req() req: any) {
        return this.attendanceService.teacherCheckIn(req.user.id);
    }

    @Post('teacher/check-out')
    @Roles(UserRole.TEACHER)
    async teacherCheckOut(@Req() req: any) {
        return this.attendanceService.teacherCheckOut(req.user.id);
    }

    @Get('teacher/status')
    @Roles(UserRole.TEACHER)
    async getTeacherTodayStatus(@Req() req: any) {
        return this.attendanceService.getTeacherTodayStatus(req.user.id);
    }

    @Get('teacher-sections')
    @Roles(UserRole.TEACHER)
    async getTeacherSections(@Req() req: any) {
        return this.attendanceService.getTeacherSections(req.user.id);
    }

    @Get('report/detailed')
    @Roles(UserRole.ADMIN)
    async getDetailedReport(@Query('date') date: string) {
        return this.attendanceService.getDetailedDailyReport(date);
    }

    @Get('report/students')
    @Roles(UserRole.ADMIN)
    async getStudentReport(
        @Query('classId') classId: string,
        @Query('sectionId') sectionId?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string
    ) {
        return this.attendanceService.getStudentAttendanceReport(classId, sectionId, startDate, endDate);
    }

    @Get('report/teachers')
    @Roles(UserRole.ADMIN)
    async getTeachersReport(
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string
    ) {
        return this.attendanceService.getTeachersAttendanceReport(startDate, endDate);
    }

    @Get('report/individual/:userId')
    @Roles(UserRole.ADMIN, UserRole.TEACHER)
    async getIndividualReport(
        @Param('userId') userId: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string
    ) {
        return this.attendanceService.getIndividualDetailedReport(userId, startDate, endDate);
    }
}
