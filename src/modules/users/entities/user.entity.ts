import {
  Entity,
  Column,
  BeforeInsert,
  BeforeUpdate,
  ManyToMany,
  JoinTable,
  OneToOne,
} from 'typeorm';
import { AbstractEntity } from '../../../common/abstract.entity.js';
import { UserRole } from '../../../common/constants/role.enum.js';
import * as bcrypt from 'bcrypt';

@Entity('users')
export class User extends AbstractEntity {
  @Column({ unique: true })
  username: string;

  @Column({ nullable: true })
  profilePictureUrl: string;

  @Column({ select: false })
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.STUDENT,
  })
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ type: 'text', nullable: true, select: false })
  refreshToken: string | null;

  @Column({ nullable: true, type: 'timestamp', select: false })
  refreshExpires: Date | null;

  @Column({ default: 0 })
  loginAttempts: number;

  @Column({ nullable: true, type: 'timestamp' })
  lockUntil: Date | null;

  @Column({ default: 0 })
  tokenVersion: number;

  @ManyToMany(() => User, (user) => user.parents)
  @JoinTable({
    name: 'parent_student',
    joinColumn: { name: 'parentId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'studentId', referencedColumnName: 'id' },
  })
  children: User[];

  @ManyToMany(() => User, (user) => user.children)
  parents: User[];

  @OneToOne('Student', 'user', { cascade: true })
  studentProfile: any;

  @OneToOne('Teacher', 'user', { cascade: true })
  teacherProfile: any;

  @OneToOne('Parent', 'user', { cascade: true })
  parentProfile: any;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password && !this.password.startsWith('$2b$')) {
      this.password = await bcrypt.hash(this.password, 10);
    }
  }
}
