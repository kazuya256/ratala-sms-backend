import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity.js';

@Injectable()
export class NotificationsService {
    constructor(
        @InjectRepository(Notification)
        private readonly notificationRepository: Repository<Notification>,
    ) { }

    async create(data: {
        recipientId: string;
        title: string;
        message: string;
        type?: NotificationType;
        senderId?: string;
    }) {
        const notification = this.notificationRepository.create({
            recipient: { id: data.recipientId } as any,
            sender: data.senderId ? { id: data.senderId } as any : null,
            title: data.title,
            message: data.message,
            type: data.type || NotificationType.GENERAL_NOTICE,
        });
        return this.notificationRepository.save(notification);
    }

    async getForUser(userId: string) {
        return this.notificationRepository.find({
            where: { recipient: { id: userId } } as any,
            order: { createdAt: 'DESC' },
        });
    }

    async markAsRead(id: string) {
        const notification = await this.notificationRepository.findOneBy({ id } as any);
        if (!notification) throw new NotFoundException('Notification not found');
        notification.isRead = true;
        return this.notificationRepository.save(notification);
    }

    async markAllAsRead(userId: string) {
        return this.notificationRepository.update(
            { recipient: { id: userId } } as any,
            { isRead: true }
        );
    }
}
