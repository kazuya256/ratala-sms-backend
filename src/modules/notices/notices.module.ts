import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notice } from './entities/notice.entity.js';
import { NoticesService } from './notices.service.js';
import { NoticesController } from './notices.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Notice])],
  providers: [NoticesService],
  controllers: [NoticesController],
  exports: [NoticesService],
})
export class NoticesModule {}
