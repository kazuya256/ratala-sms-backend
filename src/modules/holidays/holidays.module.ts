import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HolidaysService } from './holidays.service.js';
import { HolidaysController } from './holidays.controller.js';
import { Holiday } from './entities/holiday.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Holiday])],
  controllers: [HolidaysController],
  providers: [HolidaysService],
  exports: [HolidaysService],
})
export class HolidaysModule {}
