import { Controller, Get, Post, Body, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { TimetableService } from './timetable.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/constants/role.enum.js';

@Controller('timetable')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TimetableController {
    constructor(private readonly timetableService: TimetableService) { }

    @Post()
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    create(@Body() data: any) {
        return this.timetableService.create(data);
    }

    @Get('class/:classId/section/:sectionId')
    getByClass(@Param('classId') classId: string, @Param('sectionId') sectionId: string) {
        return this.timetableService.getTimetableByClassAndSection(classId, sectionId);
    }

    @Get('teacher/:teacherId')
    getByTeacher(@Param('teacherId') teacherId: string) {
        return this.timetableService.getTeacherTimetable(teacherId);
    }

    @Get('student/:studentId')
    getByStudent(@Param('studentId') studentId: string) {
        return this.timetableService.getStudentTimetable(studentId);
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    remove(@Param('id') id: string) {
        return this.timetableService.remove(id);
    }
}
