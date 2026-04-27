import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { AbstractEntity } from '../../../common/abstract.entity.js';
import { Exam } from './exam.entity.js';
import { User } from '../../users/entities/user.entity.js';

@Entity('marks')
export class Mark extends AbstractEntity {
    @ManyToOne(() => Exam, (exam) => exam.marks, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'examId' })
    exam: Exam;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'studentId' })
    student: User;

    @Column({ type: 'float', default: 0 })
    marksObtained: number;

    @Column({ type: 'text', nullable: true })
    remarks: string | null;

    @Column({ default: false })
    isAbsent: boolean;
}
