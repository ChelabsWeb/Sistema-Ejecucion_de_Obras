export interface ScheduleTaskEntity {
  id: string;
  projectId: string;
  name: string;
  startDate: string;
  durationDays: number;
  progress: number;
  predecessorIds: string[];
  createdAt?: string;
  updatedAt?: string;
}
