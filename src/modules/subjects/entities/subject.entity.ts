import { Entity, Column, ManyToMany, JoinTable } from 'typeorm';
import { AbstractEntity } from '../../../common/abstract.entity.js';
import { Teacher } from '../../users/entities/teacher.entity.js';

@Entity('subjects')
export class Subject extends AbstractEntity {
    @Column({ unique: true })
    name: string;

    @Column({ nullable: true })
    description: string;

    @Column({ nullable: true })
    code: string;

    @ManyToMany(() => Teacher)
    @JoinTable({
        name: 'subject_teachers',
        joinColumn: { name: 'subjectId', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'teacherId', referencedColumnName: 'id' },
    })
    teachers: Teacher[];
}
