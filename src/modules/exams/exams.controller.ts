import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  Query,
  Logger,
} from '@nestjs/common';
import { ExamsService } from './exams.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/constants/role.enum.js';

@Controller('exams')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExamsController {
  private readonly logger = new Logger(ExamsController.name);
  constructor(private readonly examsService: ExamsService) {
    this.logger.log('ExamsController Initialized');
  }

  @Get('terminal/:studentId')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.TEACHER)
  async getTerminalResults(
    @Param('studentId') studentId: string,
    @Query('term') term: string,
    @Query('classId') classId: string,
  ) {
    this.logger.log(
      `[DEBUG] getTerminalResults hit for student: ${studentId}, term: ${term}, class: ${classId}`,
    );
    return this.examsService.getTerminalResults(studentId, term, classId);
  }

  @Post('terminal-marks')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  saveTerminalMarks(@Body() data: any) {
    this.logger.log(
      `Saving terminal marks for student ${data.studentId}, term ${data.term}`,
    );
    return this.examsService.saveTerminalMarks(data);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  createExam(@Body() data: any) {
    return this.examsService.createExam(data);
  }

  @Get()
  findAll() {
    return this.examsService.findAllExams();
  }

  @Get(':id/marks')
  async getMarks(@Param('id') id: string) {
    const marks = await this.examsService.getMarksByExam(id);
    return marks.map((m) => ({
      id: m.id,
      studentId: m.student?.id,
      studentName: m.student?.username || 'Unknown Student',
      marksObtained: m.marksObtained,
      remarks: m.remarks,
      isAbsent: m.isAbsent,
    }));
  }

  @Post(':id/marks')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  enterMarks(
    @Param('id') examId: string,
    @Body()
    body: {
      studentId: string;
      marksObtained: number;
      remarks?: string;
      isAbsent?: boolean;
    },
  ) {
    return this.examsService.enterMarks(
      examId,
      body.studentId,
      body.marksObtained,
      body.remarks,
      body.isAbsent,
    );
  }

  @Post(':id/bulk-marks')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  bulkUploadMarks(@Param('id') examId: string, @Body() body: { marks: any[] }) {
    return this.examsService.bulkUploadMarks(examId, body.marks);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() data: any) {
    return this.examsService.updateExam(id, data);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.examsService.deleteExam(id);
  }

  @Get('student/:studentId')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.PARENT)
  async getStudentMarks(@Param('studentId') studentId: string) {
    return this.examsService.getStudentMarks(studentId);
  }
}
