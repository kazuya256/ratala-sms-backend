import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { StudentFee } from './student-fee.entity.js';
import { User } from '../../users/entities/user.entity.js';

@Entity('payments')
export class Payment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => StudentFee, { onDelete: 'CASCADE' })
    studentFee: StudentFee;

    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
    collectedBy: User; // Admin who collected the fee

    @Column('decimal', { precision: 10, scale: 2 })
    amount: number;

    @Column({ nullable: true })
    paymentMethod: string; // 'CASH', 'ONLINE', etc.

    @Column({ nullable: true })
    transactionId: string;

    @Column({ nullable: true })
    receiptUrl: string;

    @Column({ default: 'SUCCESS' })
    status: string; // 'SUCCESS', 'FAILED', 'PENDING'

    @CreateDateColumn()
    paymentDate: Date;
}
