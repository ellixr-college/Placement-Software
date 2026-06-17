import { Module } from '@nestjs/common';
import { AlumniController, PublicAlumniController } from './alumni.controller';
import { AlumniService } from './alumni.service';

@Module({
  controllers: [AlumniController, PublicAlumniController],
  providers: [AlumniService],
})
export class AlumniModule {}
