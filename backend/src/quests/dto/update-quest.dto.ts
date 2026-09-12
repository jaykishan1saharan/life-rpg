import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpdateQuestDto {
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  category?: string;

  @IsIn(['EASY', 'MEDIUM', 'HARD', 'EPIC'])
  @IsOptional()
  difficulty?: string;

  @IsIn([
    'STRENGTH',
    'INTELLECT',
    'DISCIPLINE',
    'CREATIVITY',
  ])
  @IsOptional()
  attribute?: string;

  @IsInt()
  @Min(1)
  @Max(10000)
  @IsOptional()
  xpReward?: number;

  @IsInt()
  @Min(0)
  @Max(10000)
  @IsOptional()
  goldReward?: number;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  attributeReward?: number;

  @IsOptional()
  isActive?: boolean;
}