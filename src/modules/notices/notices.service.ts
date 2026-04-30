import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notice } from './entities/notice.entity.js';
import { User } from '../users/entities/user.entity.js';

@Injectable()
export class NoticesService {
  constructor(
    @InjectRepository(Notice)
    private readonly noticeRepository: Repository<Notice>,
  ) {}

  async findAll(): Promise<Notice[]> {
    return this.noticeRepository.find({
      order: { date: 'DESC' },
      relations: ['author'],
    });
  }

  async findOne(id: string): Promise<Notice> {
    const notice = await this.noticeRepository.findOne({
      where: { id },
      relations: ['author'],
    });
    if (!notice) {
      throw new NotFoundException(`Notice with ID ${id} not found`);
    }
    return notice;
  }

  async create(
    title: string,
    content: string,
    flair: string,
    author: User,
    targetRole?: string | null,
    targetClassId?: string | null,
  ): Promise<Notice> {
    const notice = this.noticeRepository.create({
      title,
      content,
      flair,
      author,
      authorName: author.username,
      targetRole: (targetRole as any) ?? null,
      targetClassId: targetClassId ?? null,
    });
    return this.noticeRepository.save(notice);
  }

  async remove(id: string): Promise<void> {
    const result = await this.noticeRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Notice with ID ${id} not found`);
    }
  }
}
