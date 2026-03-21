import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req, UseInterceptors, UploadedFile, Res } from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { NotesService } from './notes.service.js';
import { CloudinaryService } from '../cloudinary/cloudinary.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/constants/role.enum.js';
import axios from 'axios';

@Controller('notes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotesController {
  constructor(
    private readonly notesService: NotesService,
    private readonly cloudinaryService: CloudinaryService
  ) { }

  @Get(':id/download')
  @Roles(UserRole.STUDENT, UserRole.TEACHER, UserRole.ADMIN, UserRole.PARENT)
  async download(@Param('id') id: string, @Res() res: Response) {
    const note = await this.notesService.findOne(id);
    if (!note || !note.fileUrl) {
      return res.status(404).send('File not found');
    }

    // High-reliability extraction for old items missing publicId
    if (!note.publicId && note.fileUrl.includes('cloudinary.com')) {
      try {
        const parts = note.fileUrl.split('/');
        const uploadIndex = parts.indexOf('upload');
        if (uploadIndex !== -1) {
          const pathParts = parts.slice(uploadIndex + 2);
          const fullName = pathParts.join('/');
          note.publicId = fullName.substring(0, fullName.lastIndexOf('.')) || fullName;
          note.resourceType = parts.includes('raw') ? 'raw' : 'image';
        }
      } catch (e) { /* ignore extraction errors */ }
    }

    try {
      // Use high-reliability authenticated URLs for private folder access
      const imgUrl = (note.publicId) 
        ? this.cloudinaryService.getDownloadUrl(note.publicId, 'image')
        : note.fileUrl;

      const rawUrl = (note.publicId) 
        ? this.cloudinaryService.getDownloadUrl(note.publicId, 'raw')
        : note.fileUrl;

      try {
        // Try image resource type first (standard for most PDFs in Cloudinary)
        const response = await axios.get(imgUrl, { responseType: 'stream' });
        res.setHeader('Content-Type', response.headers['content-type']);
        res.setHeader('Content-Disposition', `attachment; filename="${note.title}.pdf"`);
        return response.data.pipe(res);
      } catch {
        // Fallback to raw resource type if image fecth fails
        const response = await axios.get(rawUrl, { responseType: 'stream' });
        res.setHeader('Content-Type', response.headers['content-type']);
        res.setHeader('Content-Disposition', `attachment; filename="${note.title}.pdf"`);
        return response.data.pipe(res);
      }
    } catch (error) {
      res.status(500).send('Error downloading file');
    }
  }

  @Delete(':id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async remove(@Param('id') id: string) {
    return this.notesService.remove(id);
  }

  private mapToDto(note: any) {
    return {
      id: note.id,
      title: note.title,
      description: note.description,
      fileUrl: note.fileUrl,
      classId: note.class?.id,
      className: note.class?.name,
      sectionId: note.section?.id,
      sectionName: note.section?.name,
      subjectId: note.subject?.id,
      subjectName: note.subject?.name,
      teacherName: note.teacher?.fullName || note.teacher?.username,
      createdAt: note.createdAt
    };
  }

  @Post()
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @Body('title') title: string,
    @Body('description') description: string,
    @Body('classId') classId: string,
    @Body('sectionId') sectionId: string | null,
    @Body('subjectId') subjectId: string,
    @Req() req: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const res = await this.notesService.create(title, description, classId, sectionId, subjectId, req.user, file);
    return this.mapToDto(res);
  }

  @Get('class/:classId')
  async findByClass(@Param('classId') classId: string, @Query('sectionId') sectionId?: string) {
    const res = await this.notesService.findByClass(classId, sectionId);
    return res.map(note => this.mapToDto(note));
  }

  @Get('section/:sectionId')
  async findBySection(@Param('sectionId') sectionId: string) {
    const res = await this.notesService.findBySection(sectionId);
    return res.map(note => this.mapToDto(note));
  }

  @Get('teacher')
  @Roles(UserRole.TEACHER)
  async findByTeacher(@Req() req: any) {
    const res = await this.notesService.findByTeacher(req.user.id);
    return res.map(note => this.mapToDto(note));
  }

  @Patch(':id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body('title') title?: string,
    @Body('description') description?: string,
    @Body('classId') classId?: string,
    @Body('sectionId') sectionId?: string | null,
    @Body('subjectId') subjectId?: string,
  ) {
    const res = await this.notesService.update(id, title, description, classId, sectionId, subjectId);
    return this.mapToDto(res);
  }
}
