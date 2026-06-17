import { Module } from '@nestjs/common';
import { CoursesController, CollegeCoursesController } from './courses.controller';
import { CoursesService } from './courses.service';

@Module({
  controllers: [CoursesController, CollegeCoursesController],
  providers: [CoursesService],
})
export class CoursesModule {}
