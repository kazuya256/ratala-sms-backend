import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service.js';
import { ReportsController } from './reports.controller.js';
import { UsersModule } from '../users/users.module.js';
import { FeesModule } from '../fees/fees.module.js';
import { AttendanceModule } from '../attendance/attendance.module.js';
import { ExamsModule } from '../exams/exams.module.js';
import { CommunicationsModule } from '../communications/communications.module.js';
import { TimetableModule } from '../timetable/timetable.module.js';

@Module({
  imports: [
    UsersModule,
    FeesModule,
    AttendanceModule,
    ExamsModule,
    CommunicationsModule,
    TimetableModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
