import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { User } from './entities/user.entity.js';
import { UserRole } from '../../common/constants/role.enum.js';
import * as bcrypt from 'bcrypt';
import { Student } from './entities/student.entity.js';
import { Teacher } from './entities/teacher.entity.js';
import { Parent } from './entities/parent.entity.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
  ) {}

  async findOneByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { username } as any,
      select: [
        'id',
        'username',
        'password',
        'role',
        'isActive',
        'isVerified',
        'refreshToken',
        'refreshExpires',
        'loginAttempts',
        'lockUntil',
        'tokenVersion',
      ] as any,
      relations: [
        'studentProfile',
        'studentProfile.class',
        'studentProfile.section',
      ],
    });
  }

  async invalidateAllSessions(id: string): Promise<void> {
    await this.userRepository.increment({ id: id as any }, 'tokenVersion', 1);
    await this.updateRefreshToken(id, null, null);
  }

  async incrementLoginAttempts(id: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } as any });
    if (user) {
      const attempts = (user.loginAttempts || 0) + 1;
      const lockUntil =
        attempts >= 5 ? new Date(Date.now() + 60 * 60 * 1000) : null; // 1 hour lock
      await this.userRepository.update(id, {
        loginAttempts: attempts,
        lockUntil,
      });
    }
  }

  async resetLoginAttempts(id: string): Promise<void> {
    await this.userRepository.update(id, { loginAttempts: 0, lockUntil: null });
  }

  async updateRefreshToken(
    id: string,
    refreshToken: string | null,
    expiresAt: Date | null,
  ): Promise<void> {
    await this.userRepository.update(id, {
      refreshToken: refreshToken ? await bcrypt.hash(refreshToken, 10) : null,
      refreshExpires: expiresAt,
    });
  }

  async findUserWithRefreshToken(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id } as any,
      select: [
        'id',
        'username',
        'role',
        'refreshToken',
        'refreshExpires',
      ] as any,
    });
  }

  async create(user: Partial<User>): Promise<User> {
    const newUser = this.userRepository.create(user);
    return this.userRepository.save(newUser);
  }

  async findOne(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id } as any,
    });
  }

  async findOneStudentWithProfile(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id } as any,
      relations: [
        'studentProfile',
        'studentProfile.class',
        'studentProfile.section',
        'parents',
        'children',
      ],
    });
  }

  async getMyChildren(parentId: string): Promise<any[]> {
    const parent = await this.userRepository.findOne({
      where: { id: parentId } as any,
      relations: [
        'children',
        'children.studentProfile',
        'children.studentProfile.class',
        'children.studentProfile.section',
      ],
    });

    if (!parent) throw new NotFoundException('Parent not found');

    return (parent.children || []).map((student) => ({
      id: student.id,
      username: student.username,
      role: student.role,
      className: student.studentProfile?.class?.name,
      sectionName: student.studentProfile?.section?.name,
      classId: student.studentProfile?.class?.id,
      sectionId: student.studentProfile?.section?.id,
    }));
  }

  async findAllByRole(
    role: UserRole,
    classId?: string,
    sectionId?: string,
  ): Promise<any[]> {
    const relations: string[] = [];
    if (role === UserRole.PARENT) relations.push('children');
    if (role === UserRole.STUDENT)
      relations.push(
        'studentProfile',
        'studentProfile.class',
        'studentProfile.section',
      );

    const where: any = { role };
    if (role === UserRole.STUDENT) {
      if (classId) where.studentProfile = { class: { id: classId } };
      if (sectionId) {
        where.studentProfile = where.studentProfile || {};
        where.studentProfile.section = { id: sectionId };
      }
    }

    const users = await this.userRepository.find({
      where,
      relations,
    });

    if (role === UserRole.STUDENT) {
      return users.map((user) => ({
        ...user,
        className: user.studentProfile?.class?.name,
        sectionName: user.studentProfile?.section?.name,
        classId: user.studentProfile?.class?.id,
        sectionId: user.studentProfile?.section?.id,
      }));
    }
    return users;
  }

  async countByRole(role: UserRole): Promise<number> {
    return this.userRepository.count({ where: { role } as any });
  }

  async countClasses(): Promise<number> {
    return this.userRepository.manager.getRepository('Class').count();
  }

  async findAllClasses(): Promise<any[]> {
    return this.userRepository.manager.getRepository('Class').find({
      order: { name: 'ASC' },
    });
  }

  async verifyUser(id: string): Promise<User> {
    const user = await this.findOne(id);
    if (!user) throw new NotFoundException('User not found');
    user.isVerified = true;
    return this.userRepository.save(user);
  }

  async linkParentToStudent(
    parentId: string,
    studentId: string,
  ): Promise<void> {
    const parent = await this.userRepository.findOne({
      where: { id: parentId } as any,
      relations: ['children'],
    });
    const student = await this.userRepository.findOne({
      where: { id: studentId } as any,
      relations: ['parents'],
    });

    if (!parent || !student) {
      throw new NotFoundException('Parent or Student not found');
    }

    if (student.parents && student.parents.length > 0) {
      throw new Error(
        'This student is already linked to a parent. Please unlink the current parent first.',
      );
    }

    if (parent.role !== UserRole.PARENT || student.role !== UserRole.STUDENT) {
      throw new Error('Invalid roles for linking');
    }

    if (!parent.children) {
      parent.children = [];
    }

    if (!parent.children.find((c) => c.id === student.id)) {
      parent.children.push(student);
      await this.userRepository.save(parent);
    }
  }

  async unlinkParentFromStudent(
    parentId: string,
    studentId: string,
  ): Promise<void> {
    const parent = await this.userRepository.findOne({
      where: { id: parentId } as any,
      relations: ['children'],
    });
    if (!parent) throw new NotFoundException('Parent not found');

    parent.children = (parent.children || []).filter((c) => c.id !== studentId);
    await this.userRepository.save(parent);
  }

  async deleteUser(id: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: id as any },
      relations: ['children', 'parents'],
    });
    if (!user) throw new NotFoundException('User not found');

    // Clear relations to remove entries from parent_student join table
    user.children = [];
    user.parents = [];
    await this.userRepository.save(user);

    const result = await this.userRepository.delete(id);
    if (result.affected === 0) throw new NotFoundException('User not found');
  }

  async resetPassword(id: string, newPassword?: string) {
    const user = await this.findOne(id);
    if (!user) throw new NotFoundException('User not found');
    const password = newPassword || 'Ratala@123';
    user.password = await bcrypt.hash(password, 10);
    return this.userRepository.save(user);
  }

  async toggleUserStatus(id: string) {
    const user = await this.findOne(id);
    if (!user) throw new NotFoundException('User not found');
    user.isActive = !user.isActive;
    return this.userRepository.save(user);
  }

  async updateUserRole(id: string, role: UserRole): Promise<User> {
    const user = await this.findOne(id);
    if (!user) throw new NotFoundException('User not found');
    user.role = role;
    return this.userRepository.save(user);
  }

  async searchUsers(query: string, role: UserRole) {
    const relations: string[] = [];
    if (role === UserRole.STUDENT) {
      relations.push(
        'studentProfile',
        'studentProfile.class',
        'studentProfile.section',
      );
    }

    const users = await this.userRepository.find({
      where: [{ username: Like(`%${query}%`), role }],
      relations,
      take: 20,
    });

    if (role === UserRole.STUDENT) {
      return users.map((user) => ({
        ...user,
        className: user.studentProfile?.class?.name,
        sectionName: user.studentProfile?.section?.name,
      }));
    }
    return users;
  }

  async enrollStudent(studentId: string, classId: string, sectionId?: string) {
    const user = await this.userRepository.findOne({
      where: { id: studentId as any },
      relations: ['studentProfile'],
    });
    if (!user || user.role !== UserRole.STUDENT)
      throw new NotFoundException('Student not found');

    const classEntity = classId ? { id: classId } : null;
    const sectionEntity = sectionId ? { id: sectionId } : null;

    if (!user.studentProfile) {
      // Create profile if missing
      const profile = this.studentRepository.create({
        user: { id: user.id } as any,
        class: classEntity as any,
        section: sectionEntity as any,
      });
      await this.studentRepository.save(profile);
    } else {
      // Update existing
      user.studentProfile.class = classEntity as any;
      user.studentProfile.section = sectionEntity as any;
      await this.studentRepository.save(user.studentProfile);
    }
    return { message: 'Student enrolled successfully' };
  }

  async updateStudentProfile(id: string, data: Partial<Student>) {
    const student = await this.studentRepository.findOne({
      where: { user: { id } },
    });
    if (!student) throw new NotFoundException('Student profile not found');
    Object.assign(student, data);
    return this.studentRepository.save(student);
  }

  async updateTeacherProfile(id: string, data: Partial<Teacher>) {
    const teacher = await this.userRepository.manager
      .getRepository('Teacher')
      .findOne({ where: { user: { id } } });
    if (!teacher) throw new NotFoundException('Teacher profile not found');
    Object.assign(teacher, data);
    return this.userRepository.manager.save('Teacher', teacher);
  }

  async updateParentProfile(id: string, data: Partial<Parent>) {
    const parent = await this.userRepository.manager
      .getRepository('Parent')
      .findOne({ where: { user: { id } } });
    if (!parent) throw new NotFoundException('Parent profile not found');
    Object.assign(parent, data);
    return this.userRepository.manager.save('Parent', parent);
  }

  async assignTeacherSubject(id: string, subject: string) {
    return this.updateTeacherProfile(id, { subject } as any);
  }

  async ensureTeacherProfile(userId: string): Promise<Teacher> {
    let teacher = await this.userRepository.manager
      .getRepository(Teacher)
      .findOne({
        where: { user: { id: userId } } as any,
        relations: ['user'],
      });

    if (!teacher) {
      const user = await this.userRepository.findOne({
        where: { id: userId } as any,
      });
      if (!user || user.role !== UserRole.TEACHER) {
        throw new NotFoundException('Teacher user not found or invalid role');
      }
      teacher = this.userRepository.manager
        .getRepository(Teacher)
        .create({ user: { id: user.id } as any });
      teacher = await this.userRepository.manager.save(Teacher, teacher);
    }

    return teacher;
  }
}
