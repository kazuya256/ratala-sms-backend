import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { AbstractEntity } from '../../../common/abstract.entity.js';
import { Class } from '../../classes/entities/class.entity.js';
import { Section } from '../../classes/entities/section.entity.js';
import { Subject } from '../../subjects/entities/subject.entity.js';
import { Teacher } from '../../users/entities/teacher.entity.js';

export enum DayOfWeek {
    MONDAY = 'MONDAY',
    TUESDAY = 'TUESDAY',
    WEDNESDAY = 'WEDNESDAY',
    THURSDAY = 'THURSDAY',
    FRIDAY = 'FRIDAY',
    SATURDAY = 'SATURDAY',
    SUNDAY = 'SUNDAY',
}

@Entity('timetable')
export class Timetable extends AbstractEntity {
    @ManyToOne(() => Class, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'classId' })
    class: Class;

    @ManyToOne(() => Section, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'sectionId' })
    section: Section | null;

    @ManyToOne(() => Subject)
    @JoinColumn({ name: 'subjectId' })
    subject: Subject;

    @ManyToOne(() => Teacher, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'teacherId' })
    teacher: Teacher;

    @Column({
        type: 'enum',
        enum: DayOfWeek,
    })
    dayOfWeek: DayOfWeek;

    @Column({ type: 'varchar' })
    startTime: string;

    @Column({ type: 'varchar' })
    endTime: string;

    @Column({ type: 'varchar', nullable: true })
    roomNumber: string | null;
}
