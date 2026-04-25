import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards } from '@nestjs/common';
import { HolidaysService } from './holidays.service.js';
import { CreateHolidayDto, UpdateHolidayDto } from './dto/holiday.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/constants/role.enum.js';

@Controller('holidays')
export class HolidaysController {
  constructor(private readonly holidaysService: HolidaysService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  create(@Body() createHolidayDto: CreateHolidayDto) {
    return this.holidaysService.create(createHolidayDto);
  }

  @Get()
  findAll() {
    return this.holidaysService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.holidaysService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() updateHolidayDto: UpdateHolidayDto) {
    return this.holidaysService.update(id, updateHolidayDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.holidaysService.remove(id);
  }
}
