import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Achievement } from './entities/achievement.entity.js';
import { CreateAchievementDto } from './dto/create-achievement.dto.js';
import { UpdateAchievementDto } from './dto/update-achievement.dto.js';
import { CloudinaryService } from '../cloudinary/cloudinary.service.js';

@Injectable()
export class AchievementsService {
  constructor(
    @InjectRepository(Achievement)
    private readonly achievementRepository: Repository<Achievement>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(
    createAchievementDto: CreateAchievementDto,
    file?: Express.Multer.File,
  ): Promise<Achievement> {
    let imageUrl: string | undefined = undefined;
    if (file) {
      try {
        const uploadResult = await this.cloudinaryService.uploadFile(file);
        imageUrl = uploadResult.secure_url;
      } catch (error) {
        throw new BadRequestException('Failed to upload image to Cloudinary');
      }
    }

    const achievementData: any = { ...createAchievementDto };
    if (imageUrl) {
      achievementData.imageUrl = imageUrl;
    }

    const achievement = this.achievementRepository.create(
      achievementData as Partial<Achievement>,
    );
    return await this.achievementRepository.save(achievement);
  }

  async findAll(): Promise<Achievement[]> {
    return await this.achievementRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Achievement> {
    const achievement = await this.achievementRepository.findOne({
      where: { id },
    });
    if (!achievement) {
      throw new NotFoundException(`Achievement with ID ${id} not found`);
    }
    return achievement;
  }

  async update(
    id: string,
    updateAchievementDto: UpdateAchievementDto,
    file?: Express.Multer.File,
  ): Promise<Achievement> {
    const achievement = await this.findOne(id);

    let imageUrl = achievement.imageUrl;
    if (file) {
      try {
        const uploadResult = await this.cloudinaryService.uploadFile(file);
        imageUrl = uploadResult.secure_url;
      } catch (error) {
        throw new BadRequestException('Failed to upload image to Cloudinary');
      }
    }

    Object.assign(achievement, updateAchievementDto);
    achievement.imageUrl = imageUrl;

    return await this.achievementRepository.save(achievement);
  }

  async remove(id: string): Promise<void> {
    const achievement = await this.findOne(id);
    await this.achievementRepository.remove(achievement);
  }
}
