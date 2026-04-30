import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransportService } from './transport.service.js';
import { TransportController } from './transport.controller.js';
import { BusRoute } from './entities/bus-route.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([BusRoute])],
  controllers: [TransportController],
  providers: [TransportService],
  exports: [TransportService],
})
export class TransportModule {}
