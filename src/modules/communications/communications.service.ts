import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Complain, ComplainType } from './entities/complain.entity.js';
import { UsersService } from '../users/users.service.js';
import { Section } from '../classes/entities/section.entity.js';
import { Student } from '../users/entities/student.entity.js';
import { CloudinaryService } from '../cloudinary/cloudinary.service.js';

@Injectable()
export class CommunicationsService {
  constructor(
    @InjectRepository(Complain)
    private readonly complainRepository: Repository<Complain>,
    @InjectRepository(Section)
    private readonly sectionRepository: Repository<Section>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    private readonly usersService: UsersService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async createComplain(
    senderId: string,
    data: {
      recipientId?: string;
      studentId?: string;
      content: string;
      type: ComplainType;
    },
    files?: Express.Multer.File[],
  ) {
    let recipientId = data.recipientId;
    const sender = await this.usersService.findOne(senderId);
    if (!sender) throw new NotFoundException('Sender not found');

    // Only PARENT and TEACHER can send messages
    if (sender.role !== 'PARENT' && sender.role !== 'TEACHER') {
      throw new BadRequestException(
        'Only Parents and Teachers are allowed to send messages.',
      );
    }

    // Resolve Student profile entity ID from User ID (FK is to `student` profile, not user)
    let studentProfileId: string | null = null;
    if (data.studentId) {
      const studentProfile = await this.studentRepository.findOne({
        where: { user: { id: data.studentId } } as any,
        relations: ['user', 'section', 'section.classTeacher'],
      });
      if (studentProfile) {
        studentProfileId = studentProfile.id;
      }
    }

    // Route based on sender role if recipient not explicitly provided
    if (!recipientId && data.studentId) {
      const student = await this.usersService.findOneStudentWithProfile(
        data.studentId,
      );
      if (!student) throw new NotFoundException('Student not found');

      if (sender.role === 'TEACHER') {
        // Teacher -> Student's Parents
        if (student.parents && student.parents.length > 0) {
          recipientId = student.parents[0].id;
        } else {
          throw new NotFoundException(
            'Selected student has no parents linked. Please ensure the student has a parent account linked before sending a message.',
          );
        }
      } else if (sender.role === 'PARENT') {
        // Parent -> Student's Class Teacher
        if (student.studentProfile?.section) {
          const section = await this.sectionRepository.findOne({
            where: { id: student.studentProfile.section.id } as any,
            relations: ['classTeacher'],
          });
          if (section?.classTeacher) {
            recipientId = section.classTeacher.id;
          } else {
            throw new NotFoundException(
              'No class teacher assigned to this section. Please contact the school admin to assign a class teacher.',
            );
          }
        } else {
          throw new NotFoundException(
            'Your child is not enrolled in any class/section yet. Please contact school admin.',
          );
        }
      }
    }

    if (!recipientId)
      throw new NotFoundException(
        'Recipient could not be determined for this message',
      );

    let imageUrl: string | undefined;
    let voiceUrl: string | undefined;

    if (files && files.length > 0) {
      for (const file of files) {
        const uploadResult = await this.cloudinaryService.uploadFile(file);
        if (file.mimetype.startsWith('image/')) {
          imageUrl = uploadResult.secure_url;
        } else if (
          file.mimetype.startsWith('audio/') ||
          file.mimetype === 'video/mp4' || // Some voice recorders save as mp4
          file.mimetype === 'application/octet-stream' // Fallback
        ) {
          voiceUrl = uploadResult.secure_url;
        }
      }
    }

    const complain = this.complainRepository.create({
      sender: { id: senderId } as any,
      recipient: { id: recipientId } as any,
      // Use the Student profile entity ID (not User ID) for the FK
      student: studentProfileId ? ({ id: studentProfileId } as any) : null,
      content: data.content,
      type: data.type,
      imageUrl,
      voiceUrl,
    });

    return this.complainRepository.save(complain);
  }

  async getMyComplains(userId: string) {
    const user = await this.usersService.findOne(userId);
    if (!user) throw new NotFoundException('User not found');

    if (user.role === 'ADMIN') {
      // Admin sees all messages (full content)
      const allComplains = await this.complainRepository.find({
        relations: ['sender', 'recipient', 'student', 'student.user'],
        order: { createdAt: 'DESC' },
      });
      return allComplains.map((c) => {
        const mappedStudent =
          c.student && c.student.user
            ? {
                id: c.student.user.id,
                username: c.student.user.username,
                role: c.student.user.role,
                name: (c.student.user as any).name || c.student.user.username,
              }
            : null;

        return {
          id: c.id,
          senderId: (c.sender as any)?.id,
          sender: c.sender,
          recipientId: (c.recipient as any)?.id,
          recipient: c.recipient,
          studentId: (c.student as any)?.id,
          student: mappedStudent,
          content: c.content,
          type: c.type,
          status: c.status,
          imageUrl: c.imageUrl,
          voiceUrl: c.voiceUrl,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        };
      });
    }

    if (user.role === 'STUDENT') {
      // Students are no longer allowed to see messages
      return [];
    }

    // Parents and Teachers see messages they sent or received
    const complains = await this.complainRepository.find({
      where: [
        { sender: { id: userId } as any },
        { recipient: { id: userId } as any },
      ],
      relations: ['sender', 'recipient', 'student', 'student.user'],
      order: { createdAt: 'DESC' },
    });

    // Map student.user to student field for frontend compatibility (returns UserDto-like structure)
    return complains.map((c) => {
      const mappedStudent =
        c.student && c.student.user
          ? {
              id: c.student.user.id,
              username: c.student.user.username,
              role: c.student.user.role,
              name: (c.student.user as any).name || c.student.user.username,
            }
          : null;

      return {
        id: c.id,
        senderId: (c.sender as any)?.id,
        sender: c.sender,
        recipientId: (c.recipient as any)?.id,
        recipient: c.recipient,
        studentId: (c.student as any)?.id,
        student: mappedStudent,
        content: c.content,
        type: c.type,
        status: c.status,
        imageUrl: c.imageUrl,
        voiceUrl: c.voiceUrl,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      };
    });
  }

  async updateStatus(id: string, status: string) {
    await this.complainRepository.update(id, { status });
    return this.complainRepository.findOne({ where: { id: id as any } });
  }

  async totalComplains() {
    return this.complainRepository.count();
  }

  async updateComplain(id: string, userId: string, content: string) {
    const complain = await this.complainRepository.findOne({
      where: { id: id as any },
      relations: ['sender'],
    });
    if (!complain) throw new NotFoundException('Message not found');

    // Only author can edit
    if (complain.sender.id !== userId) {
      throw new BadRequestException('You can only edit your own messages.');
    }

    await this.complainRepository.update(id, { content });
    return this.complainRepository.findOne({ where: { id: id as any } });
  }

  async deleteComplain(id: string, userId: string, role: string) {
    const complain = await this.complainRepository.findOne({
      where: { id: id as any },
      relations: ['sender'],
    });
    if (!complain) throw new NotFoundException('Message not found');

    // Admin can delete anything, author can delete their own
    if (role !== 'ADMIN' && complain.sender.id !== userId) {
      throw new BadRequestException(
        'You do not have permission to delete this message.',
      );
    }

    await this.complainRepository.delete(id);
    return { success: true };
  }
}
