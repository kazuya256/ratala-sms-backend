import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Timetable } from './entities/timetable.entity.js';
import { TimetableService } from './timetable.service.js';
import { TimetableController } from './timetable.controller.js';
import { Teacher } from '../users/entities/teacher.entity.js';
import { Class } from '../classes/entities/class.entity.js';
import { Section } from '../classes/entities/section.entity.js';
import { Subject } from '../subjects/entities/subject.entity.js';

import { UsersModule } from '../users/users.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Timetable, Teacher, Class, Section, Subject]),
    UsersModule,
  ],
  controllers: [TimetableController],
  providers: [TimetableService],
  exports: [TimetableService],
})
export class TimetableModule {}
