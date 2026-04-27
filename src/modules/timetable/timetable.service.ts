import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
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

        return this.getAllByClass(student.studentProfile.class.id);
    }

    /** Returns ALL timetable entries for a class (all sections), let client filter */
    async getAllByClass(classId: string): Promise<Timetable[]> {
        console.log(`[Timetable] Fetching all slots for class: ${classId}`);
        const results = await this.timetableRepository.find({
            where: { class: { id: classId } } as any,
            relations: ['subject', 'section', 'teacher', 'teacher.user'],
            order: { startTime: 'ASC' }
        });
        console.log(`[Timetable] Found ${results.length} total entries for class ${classId}`);
        return results;
    }

    /** Filter by class + section. If no valid sectionId, returns ALL entries for the class. */
    async getTimetableByClassAndSection(classId: string, sectionId: string): Promise<Timetable[]> {
        const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

        console.log(`[Timetable] Fetching for Class: ${classId}, Section: ${sectionId}`);

        // Use explicit join so TypeORM maps the relation correctly regardless of naming strategy
        const qb = this.timetableRepository.createQueryBuilder('t')
            .innerJoin('t.class', 'cls')
            .leftJoinAndSelect('t.subject', 'subject')
            .leftJoinAndSelect('t.section', 'section')
            .leftJoinAndSelect('t.teacher', 'teacher')
            .leftJoinAndSelect('teacher.user', 'user')
            .where('cls.id = :classId', { classId });

        // Only filter by section UUID if explicitly provided
        if (sectionId && isUuid(sectionId)) {
            qb.andWhere('section.id = :sectionId', { sectionId });
        }

        const results = await qb.orderBy('t.startTime', 'ASC').getMany();
        console.log(`[Timetable] Found ${results.length} entries for class ${classId}`);
        return results;
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

    async findAllToday(day: string): Promise<Timetable[]> {
        return this.timetableRepository.find({
            where: { dayOfWeek: day as any },
            relations: ['class', 'section', 'subject', 'teacher', 'teacher.user'],
            order: { startTime: 'ASC' }
        });
    }

    async create(data: any): Promise<Timetable> {
        const { classId, sectionId, subjectId, teacherId, dayOfWeek, startTime, endTime, room } = data;

        console.log(`[Timetable] Creating: ${dayOfWeek} ${startTime}-${endTime} | Class: ${classId} | Section: ${sectionId} | Subject: ${subjectId} | Teacher: ${teacherId}`);

        const classEntity = await this.classRepository.findOne({ where: { id: classId } as any });
        if (!classEntity) throw new NotFoundException(`Class not found: ${classId}`);

        let sectionEntity: Section | null = null;
        if (sectionId && sectionId !== 'null') {
            sectionEntity = await this.sectionRepository.findOne({ where: { id: sectionId } as any });
            if (!sectionEntity) console.warn(`[Timetable] Section ${sectionId} not found, saving without section`);
        }

        const subjectEntity = await this.subjectRepository.findOne({ where: { id: subjectId } as any });
        if (!subjectEntity) throw new NotFoundException(`Subject not found: ${subjectId}`);

        const teacherEntity = await this.usersService.ensureTeacherProfile(teacherId);
        if (!teacherEntity) throw new NotFoundException(`Teacher profile not found for user: ${teacherId}`);

        // Use direct property assignment — more reliable than create() for ManyToOne relations
        const item = new Timetable();
        item.class = classEntity;
        item.section = sectionEntity;
        item.subject = subjectEntity;
        item.teacher = teacherEntity;
        item.dayOfWeek = dayOfWeek as DayOfWeek;
        item.startTime = startTime;
        item.endTime = endTime;
        item.roomNumber = room || null;

        const saved = await this.timetableRepository.save(item);
        console.log(`[Timetable] Saved entry ID: ${saved.id}, classId: ${(saved as any).classId}`);
        return saved;
    }

    async remove(id: string): Promise<void> {
        const result = await this.timetableRepository.delete(id);
        if (result.affected === 0) throw new NotFoundException('Timetable entry not found');
    }
}
