import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subject } from './entities/subject.entity.js';
import { SubjectAllocation } from './entities/subject-allocation.entity.js';
import { Teacher } from '../users/entities/teacher.entity.js';
import { Section } from '../classes/entities/section.entity.js';
import { User } from '../users/entities/user.entity.js';
import { UserRole } from '../../common/constants/role.enum.js';
import { UsersService } from '../users/users.service.js';
import { Class } from '../classes/entities/class.entity.js';

@Injectable()
export class SubjectsService {
  constructor(
    @InjectRepository(Subject)
    private readonly subjectRepository: Repository<Subject>,
    @InjectRepository(SubjectAllocation)
    private readonly allocationRepository: Repository<SubjectAllocation>,
    @InjectRepository(Teacher)
    private readonly teacherRepository: Repository<Teacher>,
    @InjectRepository(Section)
    private readonly sectionRepository: Repository<Section>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Class)
    private readonly classRepository: Repository<Class>,
    private readonly usersService: UsersService,
  ) {}

  async findAll(): Promise<Subject[]> {
    return this.subjectRepository.find({ relations: ['teachers', 'classes'] });
  }

  async create(data: Partial<Subject>): Promise<Subject> {
    const subject = this.subjectRepository.create(data);
    return this.subjectRepository.save(subject);
  }

  async findOne(id: string): Promise<Subject> {
    const subject = await this.subjectRepository.findOne({
      where: { id } as any,
      relations: ['teachers', 'classes'],
    });
    if (!subject) throw new NotFoundException('Subject not found');
    return subject;
  }

  async update(id: string, data: Partial<Subject>): Promise<Subject> {
    const subject = await this.findOne(id);
    Object.assign(subject, data);
    return this.subjectRepository.save(subject);
  }

  async remove(id: string): Promise<void> {
    const result = await this.subjectRepository.delete(id);
    if (result.affected === 0) throw new NotFoundException('Subject not found');
  }

  // Granular Allocation
  async allocate(data: {
    teacherId: string;
    subjectId: string;
    sectionId: string;
  }) {
    console.log('Allocating subject:', data);

    const teacher = await this.usersService.ensureTeacherProfile(
      data.teacherId,
    );
    const subject = await this.subjectRepository.findOne({
      where: { id: data.subjectId } as any,
    });
    const section = await this.sectionRepository.findOne({
      where: { id: data.sectionId } as any,
      relations: ['class'],
    });

    if (!subject || !section)
      throw new NotFoundException('Subject or Section not found');

    const allocation = this.allocationRepository.create({
      teacher,
      subject,
      section,
    });

    return this.allocationRepository.save(allocation);
  }

  async findAllAllocations() {
    return this.allocationRepository.find({
      relations: [
        'teacher',
        'teacher.user',
        'subject',
        'section',
        'section.class',
      ],
    });
  }

  async removeAllocation(id: string) {
    return this.allocationRepository.delete(id);
  }

  // Class-Subject Assignment
  async assignToClass(subjectId: string, classId: string) {
    const subject = await this.subjectRepository.findOne({
      where: { id: subjectId } as any,
      relations: ['classes'],
    });
    const cls = await this.classRepository.findOne({
      where: { id: classId } as any,
    });

    if (!subject || !cls)
      throw new NotFoundException('Subject or Class not found');

    if (!subject.classes) subject.classes = [];
    if (!subject.classes.find((c) => c.id === classId)) {
      subject.classes.push(cls);
      return this.subjectRepository.save(subject);
    }
    return subject;
  }

  async removeFromClass(subjectId: string, classId: string) {
    const subject = await this.subjectRepository.findOne({
      where: { id: subjectId } as any,
      relations: ['classes'],
    });
    if (!subject) throw new NotFoundException('Subject not found');

    subject.classes = subject.classes?.filter((c) => c.id !== classId) || [];
    return this.subjectRepository.save(subject);
  }

  async findByClass(classId: string) {
    const cls = await this.classRepository.findOne({
      where: { id: classId } as any,
      relations: ['subjects'],
    });
    if (!cls) throw new NotFoundException('Class not found');
    return cls.subjects;
  }
}
