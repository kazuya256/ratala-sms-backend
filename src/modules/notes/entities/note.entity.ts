import { Entity, Column, ManyToOne } from 'typeorm';
import { AbstractEntity } from '../../../common/abstract.entity.js';
import { Class } from '../../classes/entities/class.entity.js';
import { Section } from '../../classes/entities/section.entity.js';
import { Subject } from '../../subjects/entities/subject.entity.js';
import { User } from '../../users/entities/user.entity.js';

@Entity('notes')
export class Note extends AbstractEntity {
    @Column()
    title: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'text', nullable: true })
    fileUrl: string | null;

    @Column({ type: 'text', nullable: true })
    publicId: string | null;
 
    @Column({ type: 'text', nullable: true })
    resourceType: string | null;

    @ManyToOne(() => Class, { eager: true })
    class: Class;

    @ManyToOne(() => Section, { nullable: true, eager: true })
    section: Section;

    @ManyToOne(() => Subject, { eager: true })
    subject: Subject;

    @ManyToOne(() => User, { eager: true })
    teacher: User;
}
