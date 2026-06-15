import { Module } from '@nestjs/common';
import { StudentsController } from './students.controller';
import { MeStudentController } from './me-student.controller';
import { StudentsService } from './students.service';

@Module({
  controllers: [StudentsController, MeStudentController],
  providers: [StudentsService],
})
export class StudentsModule {}
