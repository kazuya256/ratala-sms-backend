import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Homework } from './entities/homework.entity.js';
import { CloudinaryService } from '../cloudinary/cloudinary.service.js';

@Injectable()
export class HomeworkService {
  constructor(
    @InjectRepository(Homework)
    private readonly homeworkRepo: Repository<Homework>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(
    title: string,
    description: string,
    dueDate: Date,
    classId: string,
    sectionId: string | null,
    subjectId: string,
    teacher: any,
    file?: Express.Multer.File,
  ) {
    let fileUrl = null;
    let publicId = null;
    let resourceType = null;

    if (file) {
      const uploadRes: any = await this.cloudinaryService.uploadFile(file);
      fileUrl = uploadRes.secure_url;
      publicId = uploadRes.public_id;
      resourceType = uploadRes.resource_type;
    }

    const homework = new Homework();
    homework.title = title;
    homework.description = description;
    homework.dueDate = dueDate;
    homework.class = { id: classId } as any;
    homework.section = sectionId ? ({ id: sectionId } as any) : null;
    homework.subject = { id: subjectId } as any;
    homework.teacher = teacher;
    homework.fileUrl = fileUrl;
    homework.publicId = publicId;
    homework.resourceType = resourceType;

    return await this.homeworkRepo.save(homework);
  }

  async findAll() {
    return await this.homeworkRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findByClass(classId: string, sectionId?: string) {
    const where: any = sectionId
      ? [
          { class: { id: classId }, section: IsNull() },
          { class: { id: classId }, section: { id: sectionId } },
        ]
      : { class: { id: classId } };

    return await this.homeworkRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async findByTeacher(teacherId: string) {
    return await this.homeworkRepo.find({
      where: { teacher: { id: teacherId } },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    return await this.homeworkRepo.findOneBy({ id });
  }

  async findBySection(sectionId: string) {
    return await this.homeworkRepo.find({
      where: { section: { id: sectionId } },
      order: { createdAt: 'DESC' },
    });
  }

  async update(
    id: string,
    title?: string,
    description?: string,
    dueDate?: Date,
    classId?: string,
    sectionId?: string | null,
    subjectId?: string,
  ) {
    const homework = await this.homeworkRepo.findOneBy({ id });
    if (!homework) return null;

    if (title) homework.title = title;
    if (description) homework.description = description;
    if (dueDate) homework.dueDate = dueDate;
    if (classId) homework.class = { id: classId } as any;
    if (sectionId !== undefined)
      homework.section = sectionId ? ({ id: sectionId } as any) : null;
    if (subjectId) homework.subject = { id: subjectId } as any;

    return await this.homeworkRepo.save(homework);
  }

  async remove(id: string) {
    return await this.homeworkRepo.delete(id);
  }
}
