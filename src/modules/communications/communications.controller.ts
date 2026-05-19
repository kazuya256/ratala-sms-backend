import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  Patch,
  Delete,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { CommunicationsService } from './communications.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/constants/role.enum.js';
import { AnyFilesInterceptor } from '@nestjs/platform-express';

@Controller('communications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CommunicationsController {
  constructor(private readonly communicationsService: CommunicationsService) {}

  @Post()
  @Roles(UserRole.TEACHER, UserRole.PARENT)
  @UseInterceptors(AnyFilesInterceptor())
  async create(
    @Req() req: any,
    @Body() data: any,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.communicationsService.createComplain(req.user.id, data, files);
  }

  @Get()
  async getMyComplains(@Req() req: any) {
    return this.communicationsService.getMyComplains(req.user.id);
  }

  @Patch(':id/status')
  @Roles(UserRole.TEACHER, UserRole.PARENT)
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.communicationsService.updateStatus(id, status);
  }

  @Patch(':id')
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body('content') content: string,
  ) {
    return this.communicationsService.updateComplain(id, req.user.id, content);
  }

  @Delete(':id')
  async delete(@Req() req: any, @Param('id') id: string) {
    return this.communicationsService.deleteComplain(
      id,
      req.user.id,
      req.user.role,
    );
  }
}
