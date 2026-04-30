import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
  Body,
  Delete,
  Req,
} from '@nestjs/common';
import { UsersService } from './users.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/constants/role.enum.js';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  async findAll(
    @Query('role') role: UserRole,
    @Query('classId') classId?: string,
    @Query('sectionId') sectionId?: string,
  ) {
    return this.usersService.findAllByRole(role, classId, sectionId);
  }

  @Get('search')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  async search(@Query('q') q: string, @Query('role') role: UserRole) {
    return this.usersService.searchUsers(q, role);
  }

  @Get('my-children')
  @Roles(UserRole.PARENT)
  async getMyChildren(@Req() req: any) {
    return this.usersService.getMyChildren(req.user.id);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  async findOne(@Param('id') id: string) {
    return this.usersService.findOneStudentWithProfile(id);
  }

  @Patch(':id/verify')
  @Roles(UserRole.ADMIN)
  async verify(@Param('id') id: string) {
    return this.usersService.verifyUser(id);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  async toggleStatus(@Param('id') id: string) {
    return this.usersService.toggleUserStatus(id);
  }

  @Patch(':id/password')
  @Roles(UserRole.ADMIN)
  async resetPassword(
    @Param('id') id: string,
    @Body('password') password?: string,
  ) {
    await this.usersService.resetPassword(id, password);
    return { message: 'Password reset successfully' };
  }

  @Patch('enroll')
  @Roles(UserRole.ADMIN)
  async enroll(
    @Body('studentId') studentId: string,
    @Body('classId') classId: string,
    @Body('sectionId') sectionId: string,
  ) {
    return this.usersService.enrollStudent(studentId, classId, sectionId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string) {
    await this.usersService.deleteUser(id);
    return { message: 'User deleted successfully' };
  }

  @Patch(':parentId/link-student/:studentId')
  @Roles(UserRole.ADMIN)
  async linkStudent(
    @Param('parentId') parentId: string,
    @Param('studentId') studentId: string,
  ) {
    await this.usersService.linkParentToStudent(parentId, studentId);
    return { message: 'Student linked to parent successfully' };
  }

  @Delete(':parentId/unlink-student/:studentId')
  @Roles(UserRole.ADMIN)
  async unlinkStudent(
    @Param('parentId') parentId: string,
    @Param('studentId') studentId: string,
  ) {
    await this.usersService.unlinkParentFromStudent(parentId, studentId);
    return { message: 'Student unlinked from parent successfully' };
  }

  @Patch(':id/student-profile')
  @Roles(UserRole.ADMIN)
  async updateStudent(@Param('id') id: string, @Body() data: any) {
    return this.usersService.updateStudentProfile(id, data);
  }

  @Patch(':id/teacher-profile')
  @Roles(UserRole.ADMIN)
  async updateTeacher(@Param('id') id: string, @Body() data: any) {
    return this.usersService.updateTeacherProfile(id, data);
  }

  @Patch(':id/parent-profile')
  @Roles(UserRole.ADMIN)
  async updateParent(@Param('id') id: string, @Body() data: any) {
    return this.usersService.updateParentProfile(id, data);
  }

  @Patch(':id/assign-subject')
  @Roles(UserRole.ADMIN)
  async assignSubject(
    @Param('id') id: string,
    @Body('subject') subject: string,
  ) {
    return this.usersService.assignTeacherSubject(id, subject);
  }
}
