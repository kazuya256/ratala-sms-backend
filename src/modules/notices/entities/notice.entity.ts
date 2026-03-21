import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { UserRole } from '../../../common/constants/role.enum.js';

@Entity('notices')
export class Notice {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    title: string;

    @Column('text')
    content: string;

    @Column()
    flair: string;

    @Column({
        type: 'enum',
        enum: UserRole,
        nullable: true
    })
    targetRole: UserRole | null;

    @Column({ type: 'varchar', nullable: true })
    targetClassId: string | null;

    @CreateDateColumn()
    date: Date;

    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
    author: User;

    @Column()
    authorName: string;
}
