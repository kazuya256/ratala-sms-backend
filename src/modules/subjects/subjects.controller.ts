import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { SubjectsService } from './subjects.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/constants/role.enum.js';

@Controller('subjects')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubjectsController {
    constructor(private readonly subjectsService: SubjectsService) { }

    @Post()
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    create(@Body() data: any) {
        return this.subjectsService.create(data);
    }

    @Get()
    findAll() {
        return this.subjectsService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.subjectsService.findOne(id);
    }

    @Patch(':id')
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    update(@Param('id') id: string, @Body() data: any) {
        return this.subjectsService.update(id, data);
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    remove(@Param('id') id: string) {
        return this.subjectsService.remove(id);
    }

    // Granular Allocation
    @Get('allocations/all')
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    findAllAllocations() {
        return this.subjectsService.findAllAllocations();
    }

    @Post('allocate')
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    allocate(@Body() data: { teacherId: string, subjectId: string, sectionId: string }) {
        return this.subjectsService.allocate(data);
    }

    @Delete('allocations/:id')
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    removeAllocation(@Param('id') id: string) {
        return this.subjectsService.removeAllocation(id);
    }

    // Class-Subject Assignment
    @Post(':id/assign-class/:classId')
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    assignToClass(@Param('id') subjectId: string, @Param('classId') classId: string) {
        return this.subjectsService.assignToClass(subjectId, classId);
    }

    @Delete(':id/remove-class/:classId')
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    removeFromClass(@Param('id') subjectId: string, @Param('classId') classId: string) {
        return this.subjectsService.removeFromClass(subjectId, classId);
    }

    @Get('class/:classId')
    findByClass(@Param('classId') classId: string) {
        return this.subjectsService.findByClass(classId);
    }
}
