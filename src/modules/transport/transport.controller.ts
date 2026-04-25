import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { TransportService } from './transport.service.js';
import { CreateBusRouteDto } from './dto/create-bus-route.dto.js';
import { UpdateBusRouteDto } from './dto/update-bus-route.dto.js';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js'; // Assuming you have these
// import { RolesGuard } from '../../common/guards/roles.guard.js';
// import { Roles } from '../../common/decorators/roles.decorator.js';
// import { UserRole } from '../../common/constants/role.enum.js';

@Controller('transport/bus-routes')
export class TransportController {
    constructor(private readonly transportService: TransportService) {}

    @Post()
    create(@Body() createBusRouteDto: CreateBusRouteDto) {
        return this.transportService.create(createBusRouteDto);
    }

    @Get()
    findAll() {
        return this.transportService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.transportService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateBusRouteDto: UpdateBusRouteDto) {
        return this.transportService.update(id, updateBusRouteDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.transportService.remove(id);
    }
}
