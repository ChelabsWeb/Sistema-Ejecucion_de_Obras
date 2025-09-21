import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { AuthModule } from "../common/auth/auth.module";
import { RolesGuard } from "../common/guards/roles.guard";
import { AuthMiddleware } from "../common/middleware/auth.middleware";
import { OrganizationScopeMiddleware } from "../common/middleware/organization-scope.middleware";
import { ProjectsController } from "./projects.controller";
import { ProjectsService } from "./projects.service";
import { ScheduleTasksController } from "./schedule-tasks.controller";
import { ScheduleTasksService } from "./schedule-tasks.service";

@Module({
  imports: [AuthModule],
  controllers: [ProjectsController, ScheduleTasksController],
  providers: [ProjectsService, ScheduleTasksService, RolesGuard]
})
export class ProjectsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware, OrganizationScopeMiddleware)
      .forRoutes(ProjectsController, ScheduleTasksController);
  }
}
