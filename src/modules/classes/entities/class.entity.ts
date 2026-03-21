import { Entity, Column, OneToMany } from 'typeorm';
import { AbstractEntity } from '../../../common/abstract.entity.js';
import { Section } from './section.entity.js';

@Entity('classes')
export class Class extends AbstractEntity {
    @Column({ unique: true })
    name: string; // e.g., "Grade 10"

    @OneToMany(() => Section, (section) => section.class)
    sections: Section[];
}
