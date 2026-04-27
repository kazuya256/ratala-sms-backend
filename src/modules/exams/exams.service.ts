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

    async getTerminalResults(studentId: string, term: string, classId: string) {
        // Get all subjects assigned to this class
        const subjects = await this.subjectRepository.createQueryBuilder('subject')
            .innerJoin('subject.classes', 'class')
            .where('class.id = :classId', { classId })
            .getMany();

        // Get existing marks for this student in this term
        // We check both term and name fields for compatibility
        const marks = await this.markRepository.find({
            where: [
                { 
                    student: { id: studentId },
                    exam: { term: term, class: { id: classId } }
                },
                {
                    student: { id: studentId },
                    exam: { name: term, class: { id: classId } }
                }
            ] as any,
            relations: ['exam', 'exam.subject']
        });

        return subjects.map(subject => {
            const mark = marks.find(m => m.exam.subject.id === subject.id);
            return {
                subjectId: subject.id,
                subjectName: subject.name,
                subjectCode: subject.code,
                marksObtained: mark?.marksObtained ?? null,
                maxMarks: mark?.exam.maxMarks ?? 100,
                isAbsent: mark?.isAbsent ?? false,
                remarks: mark?.remarks ?? '',
                examId: mark?.exam.id ?? null,
                markId: mark?.id ?? null
            };
        });
    }

    async saveTerminalMarks(data: { 
        studentId: string, 
        classId: string, 
        term: string, 
        marks: { subjectId: string, marksObtained: number, maxMarks?: number, isAbsent?: boolean, remarks?: string }[] 
    }) {
        const results: Mark[] = [];
        for (const m of data.marks) {
            // Find or create exam for this subject, class, and term
            let exam = await this.examRepository.findOne({
                where: [
                    { 
                        subject: { id: m.subjectId },
                        class: { id: data.classId },
                        term: data.term
                    },
                    { 
                        subject: { id: m.subjectId },
                        class: { id: data.classId },
                        name: data.term
                    }
                ] as any
            });

            if (!exam) {
                const subject = await this.subjectRepository.findOne({ where: { id: m.subjectId } as any });
                exam = this.examRepository.create({
                    name: `${data.term} - ${subject?.name || m.subjectId}`,
                    term: data.term,
                    class: { id: data.classId } as any,
                    subject: { id: m.subjectId } as any,
                    examDate: new Date(),
                    startTime: '00:00',
                    endTime: '00:00',
                    maxMarks: m.maxMarks ?? 100
                });
                exam = await this.examRepository.save(exam);
            } else if (m.maxMarks !== undefined) {
                exam.maxMarks = m.maxMarks;
                await this.examRepository.save(exam);
            }

            // Save mark
            const mark = await this.enterMarks(
                exam.id, 
                data.studentId, 
                m.marksObtained, 
                m.remarks, 
                m.isAbsent
            );
            results.push(mark);
        }
        return results;
    }

    async bulkUploadMarks(examId: string, marksData: any[]) {
        const results: Mark[] = [];
        for (const data of marksData) {
            // Identifier can be studentId, rollNumber, or username
            let studentId = data.studentId;
            
            if (!studentId && data.rollNumber) {
                const student = await this.sectionRepository.manager.getRepository('Student').findOne({
                    where: { rollNumber: data.rollNumber } as any,
                    relations: ['user']
                });
                if (student) studentId = student.user.id;
            }

            if (!studentId && data.username) {
                const user = await this.sectionRepository.manager.getRepository('User').findOne({
                    where: { username: data.username } as any
                });
                if (user) studentId = user.id;
            }

            if (studentId) {
                const result = await this.enterMarks(
                    examId, 
                    studentId, 
                    Number(data.marksObtained) || 0, 
                    data.remarks, 
                    !!data.isAbsent
                );
                results.push(result);
            }
        }
        return results;
    }
}
