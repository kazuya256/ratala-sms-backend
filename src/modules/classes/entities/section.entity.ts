import { Entity, Column, ManyToOne } from 'typeorm';
import { AbstractEntity } from '../../../common/abstract.entity.js';
import { Class } from './class.entity.js';
import { User } from '../../users/entities/user.entity.js';

@Entity('sections')
export class Section extends AbstractEntity {
  @Column()
  name: string; // e.g., "A"

  @ManyToOne(() => Class, (cls) => cls.sections, { onDelete: 'CASCADE' })
  class: Class;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  classTeacher: User;

  @Column({ nullable: true })
  roomNumber: string;
}
