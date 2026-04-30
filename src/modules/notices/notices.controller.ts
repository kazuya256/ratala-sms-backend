import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { NoticesService } from './notices.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/constants/role.enum.js';

@Controller('notices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NoticesController {
  constructor(private readonly noticesService: NoticesService) {}

  @Get()
  async findAll() {
    return this.noticesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.noticesService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  async create(
    @Body('title') title: string,
    @Body('content') content: string,
    @Body('flair') flair: string,
    @Body('targetRole') targetRole: string | null,
    @Body('targetClassId') targetClassId: string | null,
    @Req() req: any,
  ) {
    return this.noticesService.create(
      title,
      content,
      flair,
      req.user,
      targetRole ?? null,
      targetClassId ?? null,
    );
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string) {
    return this.noticesService.remove(id);
  }
}
