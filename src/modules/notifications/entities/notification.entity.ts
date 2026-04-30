import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { AbstractEntity } from '../../../common/abstract.entity.js';
import { User } from '../../users/entities/user.entity.js';

export enum NotificationType {
  ABSENT_ALERT = 'ABSENT_ALERT',
  FEE_REMINDER = 'FEE_REMINDER',
  GENERAL_NOTICE = 'GENERAL_NOTICE',
  EXAM_RESULT = 'EXAM_RESULT',
}

@Entity('notifications')
export class Notification extends AbstractEntity {
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipientId' })
  recipient: User;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'senderId' })
  sender: User | null;

  @Column()
  title: string;

  @Column('text')
  message: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
    default: NotificationType.GENERAL_NOTICE,
  })
  type: NotificationType;

  @Column({ default: false })
  isRead: boolean;
}
