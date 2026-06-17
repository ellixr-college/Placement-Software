import { Module } from '@nestjs/common';
import { MeTrainingController, TrainingController } from './training.controller';
import { TrainingService } from './training.service';

@Module({
  controllers: [TrainingController, MeTrainingController],
  providers: [TrainingService],
})
export class TrainingModule {}
