import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusRoute } from './entities/bus-route.entity.js';
import { CreateBusRouteDto } from './dto/create-bus-route.dto.js';
import { UpdateBusRouteDto } from './dto/update-bus-route.dto.js';

@Injectable()
export class TransportService {
    constructor(
        @InjectRepository(BusRoute)
        private readonly busRouteRepository: Repository<BusRoute>,
    ) {}

    async create(createBusRouteDto: CreateBusRouteDto): Promise<BusRoute> {
        const busRoute = this.busRouteRepository.create(createBusRouteDto);
        return await this.busRouteRepository.save(busRoute);
    }

    async findAll(): Promise<BusRoute[]> {
        return await this.busRouteRepository.find();
    }

    async findOne(id: string): Promise<BusRoute> {
        const busRoute = await this.busRouteRepository.findOne({ where: { id } });
        if (!busRoute) {
            throw new NotFoundException(`Bus route with ID ${id} not found`);
        }
        return busRoute;
    }

    async update(id: string, updateBusRouteDto: UpdateBusRouteDto): Promise<BusRoute> {
        const busRoute = await this.findOne(id);
        Object.assign(busRoute, updateBusRouteDto);
        return await this.busRouteRepository.save(busRoute);
    }

    async remove(id: string): Promise<void> {
        const result = await this.busRouteRepository.delete(id);
        if (result.affected === 0) {
            throw new NotFoundException(`Bus route with ID ${id} not found`);
        }
    }
}
