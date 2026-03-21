import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Exam } from './entities/exam.entity.js';
import { Mark } from './entities/marks.entity.js';
import { ExamsService } from './exams.service.js';
import { ExamsController } from './exams.controller.js';
import { Class } from '../classes/entities/class.entity.js';
import { Section } from '../classes/entities/section.entity.js';
import { Subject } from '../subjects/entities/subject.entity.js';

@Module({
    imports: [TypeOrmModule.forFeature([Exam, Mark, Class, Section, Subject])],
    controllers: [ExamsController],
    providers: [ExamsService],
    exports: [ExamsService],
})
export class ExamsModule { }
