import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { AbstractEntity } from '../../../common/abstract.entity.js';
import { Class } from '../../classes/entities/class.entity.js';
import { Section } from '../../classes/entities/section.entity.js';
import { Subject } from '../../subjects/entities/subject.entity.js';
import { Mark } from './marks.entity.js';

@Entity('exams')
export class Exam extends AbstractEntity {
    @Column()
    name: string;

    @ManyToOne(() => Class)
    @JoinColumn({ name: 'classId' })
    class: Class;

    @ManyToOne(() => Section)
    @JoinColumn({ name: 'sectionId' })
    section: Section;

    @ManyToOne(() => Subject)
    @JoinColumn({ name: 'subjectId' })
    subject: Subject;

    @Column({ type: 'date' })
    examDate: Date;

    @Column()
    startTime: string;

    @Column()
    endTime: string;

    @Column({ nullable: true })
    roomNumber: string;

    @Column({ default: 100 })
    maxMarks: number;

    @OneToMany(() => Mark, (mark) => mark.exam)
    marks: Mark[];
}
