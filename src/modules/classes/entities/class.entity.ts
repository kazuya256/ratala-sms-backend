import { Entity, Column, OneToMany, ManyToMany, JoinTable } from 'typeorm';
import { AbstractEntity } from '../../../common/abstract.entity.js';
import { Section } from './section.entity.js';
import { Subject } from '../../subjects/entities/subject.entity.js';
import { Student } from '../../users/entities/student.entity.js';

@Entity('classes')
export class Class extends AbstractEntity {
  @Column({ unique: true })
  name: string; // e.g., "Grade 10"

  @Column({ default: false })
  isPrePrimary: boolean;

  @OneToMany(() => Section, (section) => section.class)
  sections: Section[];

  @OneToMany(() => Student, (student) => student.class)
  students: Student[];

  @ManyToMany(() => Subject, (subject) => subject.classes)
  @JoinTable({
    name: 'class_subjects',
    joinColumn: { name: 'classId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'subjectId', referencedColumnName: 'id' },
  })
  subjects: Subject[];
}
