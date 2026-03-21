import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentAttendance } from './entities/student-attendance.entity.js';
import { TeacherAttendance } from './entities/teacher-attendance.entity.js';
import { AttendanceService } from './attendance.service.js';
import { AttendanceController } from './attendance.controller.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { UsersModule } from '../users/users.module.js';
import { Section } from '../classes/entities/section.entity.js';
import { Student } from '../users/entities/student.entity.js';
import { SubjectAllocation } from '../subjects/entities/subject-allocation.entity.js';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            StudentAttendance, 
            TeacherAttendance,
            Section,
            Student,
            SubjectAllocation
        ]),
        NotificationsModule,
        UsersModule
    ],
    controllers: [AttendanceController],
    providers: [AttendanceService],
    exports: [AttendanceService],
})
export class AttendanceModule { }
