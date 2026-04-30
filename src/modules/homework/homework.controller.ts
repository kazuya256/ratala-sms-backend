import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { HomeworkService } from './homework.service.js';
import { CloudinaryService } from '../cloudinary/cloudinary.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/constants/role.enum.js';
import axios from 'axios';

@Controller('homework')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HomeworkController {
  constructor(
    private readonly homeworkService: HomeworkService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Get(':id/download')
  @Roles(UserRole.STUDENT, UserRole.TEACHER, UserRole.ADMIN, UserRole.PARENT)
  async download(@Param('id') id: string, @Res() res: Response) {
    const homework = await this.homeworkService.findOne(id);
    if (!homework || !homework.fileUrl) {
      return res.status(404).send('File not found');
    }

    // High-reliability extraction for old items missing publicId
    if (!homework.publicId && homework.fileUrl.includes('cloudinary.com')) {
      try {
        const parts = homework.fileUrl.split('/');
        const uploadIndex = parts.indexOf('upload');
        if (uploadIndex !== -1) {
          const pathParts = parts.slice(uploadIndex + 2);
          const fullName = pathParts.join('/');
          homework.publicId =
            fullName.substring(0, fullName.lastIndexOf('.')) || fullName;
          homework.resourceType = parts.includes('raw') ? 'raw' : 'image';
        }
      } catch (e) {
        /* ignore extraction errors, fallback to fileUrl */
      }
    }

    try {
      // Use high-reliability authenticated URLs for private folder access
      const imgUrl = homework.publicId
        ? this.cloudinaryService.getDownloadUrl(homework.publicId, 'image')
        : homework.fileUrl;

      const rawUrl = homework.publicId
        ? this.cloudinaryService.getDownloadUrl(homework.publicId, 'raw')
        : homework.fileUrl;

      try {
        // Try image resource type first (standard for most PDFs in Cloudinary)
        const response = await axios.get(imgUrl, { responseType: 'stream' });
        res.setHeader('Content-Type', response.headers['content-type']);
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${homework.title}.pdf"`,
        );
        return response.data.pipe(res);
      } catch {
        // Fallback to raw resource type if image fetch fails
        const response = await axios.get(rawUrl, { responseType: 'stream' });
        res.setHeader('Content-Type', response.headers['content-type']);
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${homework.title}.pdf"`,
        );
        return response.data.pipe(res);
      }
    } catch (error) {
      res.status(500).send('Error downloading file');
    }
  }

  @Delete(':id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async remove(@Param('id') id: string) {
    return this.homeworkService.remove(id);
  }

  private mapToDto(hw: any) {
    return {
      id: hw.id,
      title: hw.title,
      description: hw.description,
      fileUrl: hw.fileUrl,
      dueDate: hw.dueDate,
      classId: hw.class?.id,
      className: hw.class?.name,
      sectionId: hw.section?.id,
      sectionName: hw.section?.name,
      subjectId: hw.subject?.id,
      subjectName: hw.subject?.name,
      teacherName: hw.teacher?.fullName || hw.teacher?.username,
      createdAt: hw.createdAt,
    };
  }

  @Post()
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @Body('title') title: string,
    @Body('description') description: string,
    @Body('dueDate') dueDate: string,
    @Body('classId') classId: string,
    @Body('sectionId') sectionId: string | null,
    @Body('subjectId') subjectId: string,
    @Req() req: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const res = await this.homeworkService.create(
      title,
      description,
      new Date(dueDate),
      classId,
      sectionId,
      subjectId,
      req.user,
      file,
    );
    return this.mapToDto(res);
  }

  @Get('class/:classId')
  async findByClass(
    @Param('classId') classId: string,
    @Query('sectionId') sectionId?: string,
  ) {
    const res = await this.homeworkService.findByClass(classId, sectionId);
    return res.map((hw) => this.mapToDto(hw));
  }

  @Get('section/:sectionId')
  async findBySection(@Param('sectionId') sectionId: string) {
    const res = await this.homeworkService.findBySection(sectionId);
    return res.map((hw) => this.mapToDto(hw));
  }

  @Get('teacher')
  @Roles(UserRole.TEACHER)
  async findByTeacher(@Req() req: any) {
    const res = await this.homeworkService.findByTeacher(req.user.id);
    return res.map((hw) => this.mapToDto(hw));
  }

  @Patch(':id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body('title') title?: string,
    @Body('description') description?: string,
    @Body('dueDate') dueDate?: string,
    @Body('classId') classId?: string,
    @Body('sectionId') sectionId?: string | null,
    @Body('subjectId') subjectId?: string,
  ) {
    const res = await this.homeworkService.update(
      id,
      title,
      description,
      dueDate ? new Date(dueDate) : undefined,
      classId,
      sectionId,
      subjectId,
    );
    return this.mapToDto(res);
  }
}
