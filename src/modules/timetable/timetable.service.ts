import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Timetable, DayOfWeek } from './entities/timetable.entity.js';
import { Teacher } from '../users/entities/teacher.entity.js';
import { Class } from '../classes/entities/class.entity.js';
import { Section } from '../classes/entities/section.entity.js';
import { Subject } from '../subjects/entities/subject.entity.js';

import { UsersService } from '../users/users.service.js';

@Injectable()
export class TimetableService {
    constructor(
        @InjectRepository(Timetable)
        private readonly timetableRepository: Repository<Timetable>,
        @InjectRepository(Teacher)
        private readonly teacherRepository: Repository<Teacher>,
        @InjectRepository(Class)
        private readonly classRepository: Repository<Class>,
        @InjectRepository(Section)
        private readonly sectionRepository: Repository<Section>,
        @InjectRepository(Subject)
        private readonly subjectRepository: Repository<Subject>,
        private readonly usersService: UsersService,
    ) { }

    async getStudentTimetable(userId: string): Promise<Timetable[]> {
        const student = await this.usersService.findOneStudentWithProfile(userId);
        if (!student || !student.studentProfile) {
            throw new NotFoundException('Student or enrollment profile not found');
        }

        return this.getTimetableByClassAndSection(
            student.studentProfile.class.id,
            student.studentProfile.section.id
        );
    }

    async getTimetableByClassAndSection(classId: string, sectionId: string): Promise<Timetable[]> {
        return this.timetableRepository.find({
            where: { class: { id: classId }, section: { id: sectionId } } as any,
            relations: ['subject', 'teacher', 'teacher.user'],
            order: { startTime: 'ASC' }
        });
    }

    async getTeacherTimetable(userId: string): Promise<Timetable[]> {
        const teacher = await this.teacherRepository.findOne({
            where: { user: { id: userId } } as any
        });
        if (!teacher) throw new NotFoundException('Teacher profile not found');

        return this.timetableRepository.find({
            where: { teacher: { id: teacher.id } } as any,
            relations: ['class', 'section', 'subject'],
            order: { startTime: 'ASC' }
        });
    }

    async create(data: any): Promise<Timetable> {
        // Resolve relations to ensure they exist and avoid type mismatches
        if (data.class?.id) data.class = await this.classRepository.findOne({ where: { id: data.class.id } as any }) || { id: data.class.id };
        if (data.section?.id) data.section = await this.sectionRepository.findOne({ where: { id: data.section.id } as any }) || { id: data.section.id };
        if (data.subject?.id) data.subject = await this.subjectRepository.findOne({ where: { id: data.subject.id } as any }) || { id: data.subject.id };

        // Resolve teacher profile if user ID is provided
        if (data.teacher?.id) {
            data.teacher = await this.usersService.ensureTeacherProfile(data.teacher.id);
        }
        const item = this.timetableRepository.create(data as object);
        return this.timetableRepository.save(item as any);
    }

    async remove(id: string): Promise<void> {
        const result = await this.timetableRepository.delete(id);
        if (result.affected === 0) throw new NotFoundException('Timetable entry not found');
    }
}
