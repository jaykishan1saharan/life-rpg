import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateQuestDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsIn(['EASY', 'MEDIUM', 'HARD', 'EPIC'])
  difficulty: string;

  @IsIn([
    'STRENGTH',
    'INTELLECT',
    'DISCIPLINE',
    'CREATIVITY',
  ])
  attribute: string;

  @IsInt()
  @Min(1)
  @Max(10000)
  xpReward: number;

  @IsInt()
  @Min(0)
  @Max(10000)
  goldReward: number;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  attributeReward?: number;
}