import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Note } from './entities/note.entity.js';
import { CloudinaryService } from '../cloudinary/cloudinary.service.js';

@Injectable()
export class NotesService {
  constructor(
    @InjectRepository(Note)
    private readonly noteRepo: Repository<Note>,
    private readonly cloudinaryService: CloudinaryService,
  ) { }

  async create(title: string, description: string, classId: string, sectionId: string | null, subjectId: string, teacher: any, file?: Express.Multer.File) {
    let fileUrl = null;
    let publicId = null;
    let resourceType = null;

    if (file) {
      const uploadRes: any = await this.cloudinaryService.uploadFile(file);
      fileUrl = uploadRes.secure_url;
      publicId = uploadRes.public_id;
      resourceType = uploadRes.resource_type;
    }

    const note = new Note();
    note.title = title;
    note.description = description;
    note.class = { id: classId } as any;
    note.section = sectionId ? { id: sectionId } as any : null;
    note.subject = { id: subjectId } as any;
    note.teacher = teacher;
    note.fileUrl = fileUrl;
    note.publicId = publicId;
    note.resourceType = resourceType;

    return await this.noteRepo.save(note);
  }

  async findAll() {
    return await this.noteRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findByClass(classId: string, sectionId?: string) {
    const where: any = sectionId
      ? [
          { class: { id: classId }, section: IsNull() },
          { class: { id: classId }, section: { id: sectionId } }
        ]
      : { class: { id: classId } };

    return await this.noteRepo.find({
      where,
      order: { createdAt: 'DESC' }
    });
  }

  async findBySection(sectionId: string) {
      return await this.noteRepo.find({
          where: { section: { id: sectionId } },
          order: { createdAt: 'DESC' }
      });
  }

  async findByTeacher(teacherId: string) {
    return await this.noteRepo.find({
      where: { teacher: { id: teacherId } },
      order: { createdAt: 'DESC' }
    });
  }

  async findOne(id: string) {
    return await this.noteRepo.findOneBy({ id });
  }

  async update(id: string, title?: string, description?: string, classId?: string, sectionId?: string | null, subjectId?: string) {
    const note = await this.noteRepo.findOneBy({ id });
    if (!note) return null;

    if (title) note.title = title;
    if (description) note.description = description;
    if (classId) note.class = { id: classId } as any;
    if (sectionId !== undefined) note.section = sectionId ? { id: sectionId } as any : null;
    if (subjectId) note.subject = { id: subjectId } as any;

    return await this.noteRepo.save(note);
  }

  async remove(id: string) {
    return await this.noteRepo.delete(id);
  }
}
