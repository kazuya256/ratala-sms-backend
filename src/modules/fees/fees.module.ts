import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeeStructure } from './entities/fee-structure.entity.js';
import { StudentFee } from './entities/student-fee.entity.js';
import { Payment } from './entities/payment.entity.js';
import { FeesService } from './fees.service.js';
import { FeesController } from './fees.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([FeeStructure, StudentFee, Payment])],
  providers: [FeesService],
  controllers: [FeesController],
  exports: [FeesService],
})
export class FeesModule {}
