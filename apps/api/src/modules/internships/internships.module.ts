import { Module } from '@nestjs/common';
import { InternshipsController, MeInternshipsController } from './internships.controller';
import { InternshipsService } from './internships.service';

@Module({
  controllers: [InternshipsController, MeInternshipsController],
  providers: [InternshipsService],
})
export class InternshipsModule {}
