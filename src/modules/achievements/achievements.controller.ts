import { Controller, Get, Post, Body, Param, Put, Delete, UseInterceptors, UploadedFile, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AchievementsService } from './achievements.service.js';
import { CreateAchievementDto } from './dto/create-achievement.dto.js';
import { UpdateAchievementDto } from './dto/update-achievement.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/constants/role.enum.js';

@Controller('achievements')
export class AchievementsController {
  constructor(private readonly achievementsService: AchievementsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseInterceptors(FileInterceptor('image'))
  create(
    @Body() createAchievementDto: CreateAchievementDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.achievementsService.create(createAchievementDto, file);
  }

  @Get()
  findAll() {
    return this.achievementsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.achievementsService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseInterceptors(FileInterceptor('image'))
  update(
    @Param('id') id: string,
    @Body() updateAchievementDto: UpdateAchievementDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.achievementsService.update(id, updateAchievementDto, file);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.achievementsService.remove(id);
  }
}
