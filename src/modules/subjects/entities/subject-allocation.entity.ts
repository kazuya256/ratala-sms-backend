import { Entity, ManyToOne } from 'typeorm';
import { AbstractEntity } from '../../../common/abstract.entity.js';
import { Teacher } from '../../users/entities/teacher.entity.js';
import { Subject } from './subject.entity.js';
import { Section } from '../../classes/entities/section.entity.js';

@Entity('subject_allocations')
export class SubjectAllocation extends AbstractEntity {
  @ManyToOne(() => Teacher, { onDelete: 'CASCADE' })
  teacher: Teacher;

  @ManyToOne(() => Subject)
  subject: Subject;

  @ManyToOne(() => Section)
  section: Section;
}
