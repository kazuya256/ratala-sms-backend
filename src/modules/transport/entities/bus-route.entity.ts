import { Entity, Column } from 'typeorm';
import { AbstractEntity } from '../../../common/abstract.entity.js';

@Entity('bus_routes')
export class BusRoute extends AbstractEntity {
    @Column()
    routeName: string;

    @Column()
    vehicleNumber: string;

    @Column()
    driverName: string;

    @Column()
    driverPhone: string;

    @Column('text', { array: true, nullable: true })
    stops: string[];

    @Column({ default: true })
    isActive: boolean;
}
