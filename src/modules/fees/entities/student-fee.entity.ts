import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { FeeStructure } from './fee-structure.entity.js';

@Entity('student_fees')
export class StudentFee {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    student: User;

    @ManyToOne(() => FeeStructure)
    feeStructure: FeeStructure;

    @Column('decimal', { precision: 10, scale: 2 })
    totalAmount: number;

    @Column('decimal', { precision: 10, scale: 2, default: 0 })
    paidAmount: number;

    @Column('decimal', { precision: 10, scale: 2 })
    remainingAmount: number;

    @Column({ default: 'UNPAID' })
    status: string; // 'UNPAID', 'PARTIAL', 'PAID'

    @Column({ type: 'timestamp', nullable: true })
    dueDate: Date;

    @Column({ default: 1 })
    totalInstallments: number;

    @Column({ default: 0 })
    paidInstallments: number;

    @Column({ type: 'timestamp', nullable: true })
    lastReminderDate: Date;

    @CreateDateColumn()
    createdAt: Date;
}
