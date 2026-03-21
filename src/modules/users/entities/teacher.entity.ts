import { Entity, Column, OneToOne, JoinColumn } from 'typeorm';
import { AbstractEntity } from '../../../common/abstract.entity.js';
import { User } from './user.entity.js';

@Entity('teachers')
export class Teacher extends AbstractEntity {
    @Column({ nullable: true })
    subject: string;

    @Column({ nullable: true })
    contactNumber: string;

    @Column({ nullable: true })
    email: string;

    @Column({ nullable: true })
    qualification: string;

    @Column({ default: false })
    isClassTeacher: boolean;

    @OneToOne(() => User, (user) => user.teacherProfile, { onDelete: 'CASCADE' })
    @JoinColumn()
    user: User;
}
