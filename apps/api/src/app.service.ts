import { Injectable } from "@nestjs/common";
import { formatGreeting } from "@sistema/core";
import { getPrismaStatus } from "@sistema/db";

@Injectable()
export class AppService {
  status() {
    return {
      message: formatGreeting("API"),
      timestamp: new Date().toISOString(),
      db: getPrismaStatus()
    };
  }
}
