import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { ExamsService } from './exams.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/constants/role.enum.js';

@Controller('exams')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExamsController {
    constructor(private readonly examsService: ExamsService) { }

    @Post()
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    createExam(@Body() data: any) {
        return this.examsService.createExam(data);
    }

    @Get()
    findAll() {
        return this.examsService.findAllExams();
    }

    @Get(':id/marks')
    async getMarks(@Param('id') id: string) {
        const marks = await this.examsService.getMarksByExam(id);
        return marks.map(m => ({
            id: m.id,
            studentId: m.student?.id,
            studentName: m.student?.username || 'Unknown Student',
            marksObtained: m.marksObtained,
            remarks: m.remarks,
            isAbsent: m.isAbsent
        }));
    }

    @Post(':id/marks')
    @Roles(UserRole.ADMIN, UserRole.TEACHER)
    enterMarks(
        @Param('id') examId: string,
        @Body() body: { studentId: string; marksObtained: number; remarks?: string; isAbsent?: boolean }
    ) {
        return this.examsService.enterMarks(examId, body.studentId, body.marksObtained, body.remarks, body.isAbsent);
    }

    @Patch(':id')
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    update(@Param('id') id: string, @Body() data: any) {
        return this.examsService.updateExam(id, data);
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    remove(@Param('id') id: string) {
        return this.examsService.deleteExam(id);
    }
}
