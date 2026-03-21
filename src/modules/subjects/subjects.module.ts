import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subject } from './entities/subject.entity.js';
import { SubjectAllocation } from './entities/subject-allocation.entity.js';
import { SubjectsService } from './subjects.service.js';
import { SubjectsController } from './subjects.controller.js';
import { Teacher } from '../users/entities/teacher.entity.js';
import { Section } from '../classes/entities/section.entity.js';

import { User } from '../users/entities/user.entity.js';

import { UsersModule } from '../users/users.module.js';

@Module({
    imports: [
        TypeOrmModule.forFeature([Subject, SubjectAllocation, Teacher, Section, User]),
        UsersModule
    ],
    controllers: [SubjectsController],
    providers: [SubjectsService],
    exports: [SubjectsService],
})
export class SubjectsModule { }
