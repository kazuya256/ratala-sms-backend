import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { StudentFee } from './student-fee.entity.js';
import { User } from '../../users/entities/user.entity.js';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => StudentFee, { onDelete: 'CASCADE' })
  studentFee: StudentFee;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  collectedBy: User | null; // Admin who collected the fee

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', nullable: true })
  paymentMethod: string | null; // 'CASH', 'ONLINE', etc.

  @Column({ type: 'varchar', nullable: true })
  transactionId: string | null;

  @Column({ type: 'varchar', nullable: true })
  receiptUrl: string | null;

  @Column({ default: 'SUCCESS' })
  status: string; // 'SUCCESS', 'FAILED', 'PENDING'

  @CreateDateColumn()
  paymentDate: Date;
}
