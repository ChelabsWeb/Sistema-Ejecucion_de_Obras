import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards
} from "@nestjs/common";
import { Roles } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { CreateScheduleTaskDto } from "./dto/create-schedule-task.dto";
import { UpdateScheduleTaskDto } from "./dto/update-schedule-task.dto";
import { ScheduleTasksService } from "./schedule-tasks.service";

@Controller({ path: "projects/:projectId/tasks" })
@UseGuards(RolesGuard)
export class ScheduleTasksController {
  constructor(private readonly scheduleTasksService: ScheduleTasksService) {}

  @Get()
  @Roles("VIEWER", "SITE", "PM", "FINANCE", "ADMIN")
  findAll(@Param("projectId") projectId: string) {
    return this.scheduleTasksService.list(projectId);
  }

  @Get("critical-path")
  @Roles("VIEWER", "SITE", "PM", "FINANCE", "ADMIN")
  getCriticalPath(@Param("projectId") projectId: string) {
    return this.scheduleTasksService.criticalPath(projectId);
  }

  @Post()
  @Roles("PM", "ADMIN")
  create(
    @Param("projectId") projectId: string,
    @Body() payload: CreateScheduleTaskDto
  ) {
    return this.scheduleTasksService.create(projectId, payload);
  }

  @Patch(":taskId")
  @Roles("SITE", "PM", "ADMIN")
  update(
    @Param("projectId") projectId: string,
    @Param("taskId") taskId: string,
    @Body() payload: UpdateScheduleTaskDto
  ) {
    return this.scheduleTasksService.update(projectId, taskId, payload);
  }

  @Delete(":taskId")
  @Roles("PM", "ADMIN")
  remove(@Param("projectId") projectId: string, @Param("taskId") taskId: string) {
    return this.scheduleTasksService.remove(projectId, taskId);
  }
}
