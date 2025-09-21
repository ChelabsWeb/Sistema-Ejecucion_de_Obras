import { Module } from "@nestjs/common";
import { ClerkAuthService } from "./clerk-auth.service";

@Module({
  providers: [ClerkAuthService],
  exports: [ClerkAuthService]
})
export class AuthModule {}
