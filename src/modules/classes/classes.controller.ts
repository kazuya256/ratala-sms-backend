import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Patch,
  Param,
  Delete,
  Put,
} from '@nestjs/common';
import { ClassesService } from './classes.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/constants/role.enum.js';

@Controller('classes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.ACCOUNTANT)
  async findAll() {
    return this.classesService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.ACCOUNTANT)
  async findOne(@Param('id') id: string) {
    return this.classesService.findOne(id);
  }

  @Get(':classId/sections')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async getSections(@Param('classId') classId: string) {
    return this.classesService.getSectionsByClassId(classId);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  async createClass(@Body('name') name: string) {
    return this.classesService.createClass(name);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  async updateClass(@Param('id') id: string, @Body('name') name: string) {
    return this.classesService.updateClass(id, name);
  }

  @Post(':classId/sections')
  @Roles(UserRole.ADMIN)
  async createSection(
    @Param('classId') classId: string,
    @Body('name') name: string,
    @Body('roomNumber') roomNumber?: string,
  ) {
    return this.classesService.createSection(classId, name, roomNumber);
  }

  @Patch('sections/:sectionId/class-teacher')
  @Roles(UserRole.ADMIN)
  async assignClassTeacher(
    @Param('sectionId') sectionId: string,
    @Body('teacherId') teacherId: string,
  ) {
    return this.classesService.assignClassTeacher(sectionId, teacherId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async removeClass(@Param('id') id: string) {
    await this.classesService.deleteClass(id);
    return { message: 'Class deleted successfully' };
  }

  @Delete('sections/:sectionId')
  @Roles(UserRole.ADMIN)
  async removeSection(@Param('sectionId') sectionId: string) {
    await this.classesService.deleteSection(sectionId);
    return { message: 'Section deleted successfully' };
  }
}
