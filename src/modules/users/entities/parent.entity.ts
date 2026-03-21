import { Entity, Column, OneToOne, JoinColumn } from 'typeorm';
import { AbstractEntity } from '../../../common/abstract.entity.js';
import { User } from './user.entity.js';

@Entity('parents')
export class Parent extends AbstractEntity {
    @Column()
    name: string;

    @Column()
    phoneNumber: string;

    @Column()
    email: string;

    @Column()
    address: string;

    @OneToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn()
    user: User;
}
