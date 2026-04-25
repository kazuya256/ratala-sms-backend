import { IsString, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';

export class CreateAchievementDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsString()
  dateEarned?: string;
}
