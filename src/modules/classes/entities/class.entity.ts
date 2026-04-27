import { Entity, Column, OneToMany, ManyToMany, JoinTable } from 'typeorm';
import { AbstractEntity } from '../../../common/abstract.entity.js';
import { Section } from './section.entity.js';
import { Student } from '../../users/entities/student.entity.js';

@Entity('classes')
export class Class extends AbstractEntity {
    @Column({ unique: true })
    name: string; // e.g., "Grade 10"

    @OneToMany(() => Section, (section) => section.class)
    sections: Section[];

    @OneToMany(() => Student, (student) => student.class)
    students: Student[];

    @ManyToMany('Subject', 'classes')
    @JoinTable({
        name: 'class_subjects',
        joinColumn: { name: 'classId', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'subjectId', referencedColumnName: 'id' },
    })
    subjects: any[];
}
