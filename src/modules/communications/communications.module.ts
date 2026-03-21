import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Complain } from './entities/complain.entity.js';
import { CommunicationsService } from './communications.service.js';
import { CommunicationsController } from './communications.controller.js';
import { UsersModule } from '../users/users.module.js';
import { Section } from '../classes/entities/section.entity.js';
import { Student } from '../users/entities/student.entity.js';

@Module({
    imports: [
        TypeOrmModule.forFeature([Complain, Section, Student]),
        UsersModule,
    ],
    providers: [CommunicationsService],
    controllers: [CommunicationsController],
    exports: [CommunicationsService],
})
export class CommunicationsModule { }
