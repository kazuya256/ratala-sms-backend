import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Exam } from './entities/exam.entity.js';
import { Mark } from './entities/marks.entity.js';
import { Class } from '../classes/entities/class.entity.js';
import { Section } from '../classes/entities/section.entity.js';
import { Subject } from '../subjects/entities/subject.entity.js';

@Injectable()
export class ExamsService {
    constructor(
        @InjectRepository(Exam)
        private readonly examRepository: Repository<Exam>,
        @InjectRepository(Mark)
        private readonly markRepository: Repository<Mark>,
        @InjectRepository(Class)
        private readonly classRepository: Repository<Class>,
        @InjectRepository(Section)
        private readonly sectionRepository: Repository<Section>,
        @InjectRepository(Subject)
        private readonly subjectRepository: Repository<Subject>,
    ) { }

    async findAllExams(): Promise<Exam[]> {
        return this.examRepository.find({ relations: ['class', 'section', 'subject'] });
    }

    async createExam(data: any): Promise<Exam> {
        // Resolve relations to avoid null constraints or type mismatches
        if (data.class?.id) data.class = await this.classRepository.findOne({ where: { id: data.class.id } as any }) || { id: data.class.id };
        if (data.section?.id) data.section = await this.sectionRepository.findOne({ where: { id: data.section.id } as any }) || { id: data.section.id };
        if (data.subject?.id) data.subject = await this.subjectRepository.findOne({ where: { id: data.subject.id } as any }) || { id: data.subject.id };

        // Ensure date is a Date object if sent as string
        if (data.examDate && typeof data.examDate === 'string') {
            const parsedDate = new Date(data.examDate);
            if (isNaN(parsedDate.getTime())) {
                throw new Error('Invalid exam date provided');
            }
            data.examDate = parsedDate;
        }

        const exam = this.examRepository.create(data as object);
        return this.examRepository.save(exam as any);
    }

    async updateExam(id: string, data: any): Promise<Exam> {
        const exam = await this.examRepository.findOne({ where: { id } as any });
        if (!exam) throw new NotFoundException('Exam not found');

        // Handle date if present
        if (data.examDate && typeof data.examDate === 'string') {
            const parsedDate = new Date(data.examDate);
            if (isNaN(parsedDate.getTime())) {
                throw new Error('Invalid exam date');
            }
            data.examDate = parsedDate;
        }

        // Resolve relations if IDs are provided
        if (data.class?.id) data.class = await this.classRepository.findOne({ where: { id: data.class.id } as any }) || { id: data.class.id };
        if (data.section?.id) data.section = await this.sectionRepository.findOne({ where: { id: data.section.id } as any }) || { id: data.section.id };
        if (data.subject?.id) data.subject = await this.subjectRepository.findOne({ where: { id: data.subject.id } as any }) || { id: data.subject.id };

        Object.assign(exam, data);
        return this.examRepository.save(exam);
    }

    async deleteExam(id: string): Promise<void> {
        const result = await this.examRepository.delete(id);
        if (result.affected === 0) throw new NotFoundException('Exam not found');
    }

    async getMarksByExam(examId: string): Promise<Mark[]> {
        return this.markRepository.find({
            where: { exam: { id: examId } } as any,
            relations: ['student']
        });
    }

    async enterMarks(examId: string, studentId: string, marksObtained: number, remarks?: string, isAbsent?: boolean): Promise<Mark> {
        let mark = await this.markRepository.findOne({
            where: { exam: { id: examId }, student: { id: studentId } } as any
        });

        if (!mark) {
            mark = this.markRepository.create({
                exam: { id: examId } as any,
                student: { id: studentId } as any
            });
        }

        mark.marksObtained = marksObtained;
        mark.remarks = remarks ?? null;
        mark.isAbsent = !!isAbsent;

        return this.markRepository.save(mark);
    }

    async getStudentMarks(studentId: string): Promise<Mark[]> {
        return this.markRepository.find({
            where: { student: { id: studentId } } as any,
            relations: ['exam', 'exam.subject']
        });
    }
}
