import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('fee_structures')
export class FeeStructure {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string; // e.g., 'Monthly Tuition'

    @Column('decimal', { precision: 10, scale: 2 })
    amount: number;

    @Column({ nullable: true })
    description: string;

    @Column({ nullable: true })
    classId: string;

    @CreateDateColumn()
    createdAt: Date;
}
