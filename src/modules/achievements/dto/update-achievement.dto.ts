import { IsString, IsOptional } from 'class-validator';

export class UpdateAchievementDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  dateEarned?: string;
}
