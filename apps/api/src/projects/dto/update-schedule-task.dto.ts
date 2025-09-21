import { PartialType } from "@nestjs/mapped-types";
import { CreateScheduleTaskDto } from "./create-schedule-task.dto";

export class UpdateScheduleTaskDto extends PartialType(CreateScheduleTaskDto) {}
