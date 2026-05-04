import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Class } from './entities/class.entity.js';
import { Section } from './entities/section.entity.js';
import { User } from '../users/entities/user.entity.js';
import { Student } from '../users/entities/student.entity.js';

@Injectable()
export class ClassesService {
  constructor(
    @InjectRepository(Class)
    private classRepository: Repository<Class>,
    @InjectRepository(Section)
    private sectionRepository: Repository<Section>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findAll(): Promise<any[]> {
    const classes = await this.classRepository.find({
      relations: ['sections', 'sections.classTeacher', 'students', 'subjects'],
    });

    return classes.map((cls) => ({
      ...cls,
      _count: {
        students: cls.students?.length || 0,
        subjects: cls.subjects?.length || 0,
      },
    }));
  }

  async findOne(id: string): Promise<Class> {
    const cls = await this.classRepository.findOne({
      where: { id } as any,
      relations: [
        'sections',
        'sections.classTeacher',
        'students',
        'students.user',
        'subjects',
      ],
    });
    if (!cls) throw new NotFoundException('Class not found');
    return cls;
  }

  async createClass(name: string, isPrePrimary: boolean = false): Promise<Class> {
    const cls = this.classRepository.create({ name, isPrePrimary });
    return this.classRepository.save(cls);
  }

  async getSectionsByClassId(classId: string): Promise<Section[]> {
    const cls = await this.classRepository.findOne({
      where: { id: classId } as any,
    });
    if (!cls) throw new NotFoundException('Class not found');
    return this.sectionRepository.find({
      where: { class: { id: classId } } as any,
      relations: ['classTeacher'],
    });
  }

  async createSection(
    classId: string,
    name: string,
    roomNumber?: string,
  ): Promise<Section> {
    const cls = await this.classRepository.findOne({
      where: { id: classId } as any,
    });
    if (!cls) throw new NotFoundException('Class not found');
    const section = this.sectionRepository.create({
      name,
      roomNumber,
      class: cls,
    });
    return this.sectionRepository.save(section);
  }

  async updateClass(
    id: string,
    name: string,
    isPrePrimary: boolean,
  ): Promise<Class> {
    const cls = await this.findOne(id);
    cls.name = name;
    cls.isPrePrimary = isPrePrimary;
    return this.classRepository.save(cls);
  }

  async assignClassTeacher(
    sectionId: string,
    teacherId: string,
  ): Promise<Section> {
    const section = await this.sectionRepository.findOne({
      where: { id: sectionId } as any,
    });
    if (!section) throw new NotFoundException('Section not found');

    const teacher = await this.userRepository.findOne({
      where: { id: teacherId } as any,
    });
    if (!teacher) throw new NotFoundException('Teacher not found');

    section.classTeacher = teacher;
    return this.sectionRepository.save(section);
  }

  async deleteClass(id: string): Promise<void> {
    const studentRepo = this.classRepository.manager.getRepository(Student);
    const count = await studentRepo.count({ where: { class: { id } } as any });
    if (count > 0) {
      throw new ConflictException('Cannot delete class with enrolled students');
    }

    const result = await this.classRepository.delete(id);
    if (result.affected === 0) throw new NotFoundException('Class not found');
  }

  async deleteSection(id: string): Promise<void> {
    const studentRepo = this.sectionRepository.manager.getRepository(Student);
    const count = await studentRepo.count({
      where: { section: { id } } as any,
    });
    if (count > 0) {
      throw new ConflictException(
        'Cannot delete section with enrolled students',
      );
    }

    const result = await this.sectionRepository.delete(id);
    if (result.affected === 0) throw new NotFoundException('Section not found');
  }
}
