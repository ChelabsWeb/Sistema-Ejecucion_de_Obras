import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min
} from "class-validator";

export class CreateScheduleTaskDto {
  @IsString()
  name!: string;

  @IsDateString()
  startDate!: string;

  @IsInt()
  @Min(1)
  durationDays!: number;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  progress?: number = 0;

  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  @ArrayNotEmpty()
  @IsOptional()
  predecessorIds?: string[];
}
