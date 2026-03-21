import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { AbstractEntity } from '../../../common/abstract.entity.js';
import { User } from '../../users/entities/user.entity.js';
import { Student } from '../../users/entities/student.entity.js';

export enum ComplainType {
    COMPLAINT = 'COMPLAINT',
    SUGGESTION = 'SUGGESTION'
}

@Entity('complains')
export class Complain extends AbstractEntity {
    @ManyToOne(() => User)
    @JoinColumn({ name: 'senderId' })
    sender: User;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'recipientId' })
    recipient: User;

    @ManyToOne(() => Student, { nullable: true })
    @JoinColumn({ name: 'studentId' })
    student: Student;

    @Column({ type: 'text' })
    content: string;

    @Column({
        type: 'enum',
        enum: ComplainType,
        default: ComplainType.COMPLAINT
    })
    type: ComplainType;

    @Column({ default: 'PENDING' })
    status: string; // PENDING, RESOLVED
}
