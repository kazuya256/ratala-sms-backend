import { Entity, Column, OneToOne, JoinColumn, ManyToOne } from 'typeorm';
import { AbstractEntity } from '../../../common/abstract.entity.js';
import { User } from './user.entity.js';
import { Class } from '../../classes/entities/class.entity.js';
import { Section } from '../../classes/entities/section.entity.js';

@Entity('students')
export class Student extends AbstractEntity {
  @Column({ unique: true, nullable: true })
  rollNumber: string;

  @Column({ nullable: true })
  dob: Date;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  contactNumber: string;

  @ManyToOne(() => Class)
  @JoinColumn({ name: 'classId' })
  class: Class;

  @ManyToOne(() => Section)
  @JoinColumn({ name: 'sectionId' })
  section: Section;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;
}
