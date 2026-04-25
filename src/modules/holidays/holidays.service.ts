import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Holiday } from './entities/holiday.entity.js';
import { CreateHolidayDto, UpdateHolidayDto } from './dto/holiday.dto.js';

@Injectable()
export class HolidaysService implements OnModuleInit {
  constructor(
    @InjectRepository(Holiday)
    private holidayRepository: Repository<Holiday>,
  ) {}

  async onModuleInit() {
    const count = await this.holidayRepository.count();
    if (count === 0) {
      const defaultHolidays = [
        { title: "Nepali New Year 2083", date: "2026-04-14", description: "Baisakh 1, Official start of BS 2083" },
        { title: "International Labour Day", date: "2026-05-01", description: "Baisakh 18" },
        { title: "Buddha Jayanti / Ubhauli", date: "2026-05-11", description: "Baisakh 28" },
        { title: "Dashain Phulpati", date: "2026-09-27", description: "Aswin 1" },
        { title: "Dashain Maha Asthami", date: "2026-09-28", description: "Aswin 2" },
        { title: "Dashain Maha Nawami / Constitution Day", date: "2026-09-29", description: "Aswin 3" },
        { title: "Dashain Vijaya Dashami", date: "2026-09-30", description: "Aswin 4" },
        { title: "Tihar: Laxmi Puja", date: "2026-10-08", description: "Kartik 12" },
        { title: "Tihar: Bhai Tika", date: "2026-10-10", description: "Kartik 14" },
        { title: "Maghe Sankranti", date: "2027-01-15", description: "Magh 1" },
        { title: "Prajatantra Diwas", date: "2027-02-19", description: "Falgun 7" },
        { title: "Maha Shivaratri", date: "2027-02-24", description: "Falgun 12" },
        { title: "Holi (Hills/Kathmandu)", date: "2027-03-22", description: "Chaitra 8" },
        { title: "Holi (Terai)", date: "2027-03-23", description: "Chaitra 9" },
      ];
      await this.holidayRepository.save(defaultHolidays);
    }
  }

  async create(createHolidayDto: CreateHolidayDto): Promise<Holiday> {
    const holiday = this.holidayRepository.create(createHolidayDto);
    return await this.holidayRepository.save(holiday);
  }

  async findAll(): Promise<Holiday[]> {
    return await this.holidayRepository.find({
      order: { date: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Holiday> {
    const holiday = await this.holidayRepository.findOne({ where: { id } });
    if (!holiday) {
      throw new NotFoundException(`Holiday with ID ${id} not found`);
    }
    return holiday;
  }

  async update(id: string, updateHolidayDto: UpdateHolidayDto): Promise<Holiday> {
    const holiday = await this.findOne(id);
    Object.assign(holiday, updateHolidayDto);
    return await this.holidayRepository.save(holiday);
  }

  async remove(id: string): Promise<void> {
    const holiday = await this.findOne(id);
    await this.holidayRepository.remove(holiday);
  }
}
