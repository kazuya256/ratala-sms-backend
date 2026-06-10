import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron } from '@nestjs/schedule';
import { Repository, Between } from 'typeorm';
import {
  StudentAttendance,
  AttendanceStatus,
} from './entities/student-attendance.entity.js';
import { TeacherAttendance } from './entities/teacher-attendance.entity.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { UsersService } from '../users/users.service.js';
import { Section } from '../classes/entities/section.entity.js';
import { Student } from '../users/entities/student.entity.js';
import { SubjectAllocation } from '../subjects/entities/subject-allocation.entity.js';
import { HolidaysService } from '../holidays/holidays.service.js';
import { Class } from '../classes/entities/class.entity.js';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(StudentAttendance)
    private readonly studentAttendanceRepository: Repository<StudentAttendance>,
    @InjectRepository(TeacherAttendance)
    private readonly teacherAttendanceRepository: Repository<TeacherAttendance>,
    @InjectRepository(Section)
    private readonly sectionRepository: Repository<Section>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(SubjectAllocation)
    private readonly allocationRepository: Repository<SubjectAllocation>,
    @InjectRepository(Class)
    private readonly classRepository: Repository<Class>,
    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService,
    private readonly holidaysService: HolidaysService,
  ) {}

  // Student Attendance
  async recordStudentAttendance(
    user: any,
    data: {
      studentId: string;
      classId: string;
      sectionId: string;
      date: string;
      status: AttendanceStatus;
      remarks?: string;
    },
  ) {
    if (user.role === 'TEACHER') {
      const sections = await this.getTeacherSections(user.id);
      const isAssigned = sections.some((s) => s.id === data.sectionId);
      if (!isAssigned) {
        throw new BadRequestException(
          'You are not assigned to mark attendance for this section.',
        );
      }
    }
    const date = new Date(data.date);
    date.setHours(0, 0, 0, 0); // Normalize date

    let attendance = await this.studentAttendanceRepository.findOne({
      where: {
        student: { id: data.studentId },
        date: date as any,
      } as any,
    });

    if (!attendance) {
      attendance = this.studentAttendanceRepository.create({
        student: { id: data.studentId } as any,
        class: { id: data.classId } as any,
        section: { id: data.sectionId } as any,
        date,
      });
    }

    attendance.status = data.status;
    attendance.remarks = data.remarks ?? null;
    const saved = await this.studentAttendanceRepository.save(attendance);

    if (data.status === AttendanceStatus.ABSENT) {
      this.notifyParents(data.studentId, date);
    }

    // Return flattened object for frontend DTO compatibility
    const student = await this.usersService.findOne(data.studentId);
    return {
      id: saved.id,
      studentId: data.studentId,
      studentName: student?.username || 'Unknown',
      classId: data.classId,
      sectionId: data.sectionId,
      date: data.date,
      status: saved.status,
      remarks: saved.remarks,
    };
  }

  async recordBatchAttendance(
    user: any,
    data: {
      classId: string;
      sectionId: string;
      date: string;
      attendances: {
        studentId: string;
        status: AttendanceStatus;
        remarks?: string;
      }[];
    },
  ) {
    if (user.role === 'TEACHER') {
      const sections = await this.getTeacherSections(user.id);
      const isAssigned = sections.some((s) => s.id === data.sectionId);
      if (!isAssigned) {
        throw new BadRequestException(
          'You are not assigned to mark attendance for this section.',
        );
      }
    }
    const results: any[] = [];
    for (const item of data.attendances) {
      results.push(
        await this.recordStudentAttendance(user, {
          ...item,
          classId: data.classId,
          sectionId: data.sectionId,
          date: data.date,
        }),
      );
    }
    return results;
  }

  private async notifyParents(studentId: string, date: Date) {
    try {
      const student = await this.usersService.findOne(studentId);
      if (student && student.parents) {
        for (const parent of student.parents) {
          await this.notificationsService.create({
            recipientId: parent.id,
            title: 'Attendance Alert',
            message: `Your child ${student.username} was marked ABSENT on ${date.toDateString()}.`,
            type: 'ABSENT_ALERT' as any,
          });
        }
      }
    } catch (e) {
      console.error('Failed to notify parents:', e);
    }
  }

  async getStudentAttendance(
    studentId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const where: any = { student: { id: studentId } };
    if (startDate && endDate) {
      where.date = Between(startDate, endDate);
    } else if (startDate) {
      where.date = Between(startDate, new Date());
    }

    const records = await this.studentAttendanceRepository.find({
      where,
      relations: ['student', 'class', 'section'],
      order: { date: 'DESC' },
    });

    return records.map((record) => ({
      id: record.id,
      studentId: record.student.id,
      studentName: record.student.username,
      classId: record.class?.id || '',
      sectionId: record.section?.id || '',
      date:
        typeof record.date === 'string'
          ? record.date
          : record.date.toISOString().split('T')[0],
      status: record.status,
      remarks: record.remarks,
    }));
  }

  async getClassAttendance(
    classId?: string,
    sectionId?: string,
    date?: string,
  ) {
    const searchDate = date ? new Date(date) : new Date();
    searchDate.setHours(0, 0, 0, 0);

    if (classId && sectionId) {
      // Fetch all students of this section (Teacher's mark attendance view)
      const students = await this.studentRepository.find({
        where: {
          class: { id: classId },
          section: { id: sectionId },
        } as any,
        relations: ['user'],
      });

      // Fetch existing attendance records for this date
      const attendanceRecords = await this.studentAttendanceRepository.find({
        where: {
          class: { id: classId },
          section: { id: sectionId },
          date: searchDate as any,
        } as any,
        relations: ['student'],
      });

      // Merge: Return all students, and if they have an attendance record, attach it
      return students.map((student) => {
        const record = attendanceRecords.find(
          (a) => a.student.id === student.user.id,
        );
        return {
          id: record?.id || '',
          studentId: student.user.id,
          studentName: student.user.username,
          classId,
          sectionId,
          date: date || searchDate.toISOString(),
          status: record?.status || AttendanceStatus.PRESENT, // Default to present for UI if no record
          remarks: record?.remarks || null,
        };
      });
    } else {
      // Generic query (e.g., for Admin Dashboard reports)
      const where: any = {};
      if (classId) where.class = { id: classId };
      if (sectionId) where.section = { id: sectionId };
      where.date = searchDate as any;

      const records = await this.studentAttendanceRepository.find({
        where,
        relations: ['student', 'class', 'section'],
      });

      return records.map((record) => ({
        id: record.id,
        studentId: record.student.id,
        studentName: record.student.username,
        classId: record.class?.id || classId || '',
        sectionId: record.section?.id || sectionId || '',
        className: record.class?.name || 'Unknown',
        sectionName: record.section?.name || 'General',
        date:
          typeof record.date === 'string'
            ? record.date
            : record.date.toISOString().split('T')[0],
        status: record.status,
        remarks: record.remarks,
      }));
    }
  }

  async getTeacherSections(teacherId: string) {
    // 1. Sections where teacher is Class Teacher
    const classTeacherSections = await this.sectionRepository.find({
      where: { classTeacher: { id: teacherId } } as any,
      relations: ['class'],
    });

    // 2. Sections where teacher is assigned to a subject
    const subjectAllocations = await this.allocationRepository.find({
      where: { teacher: { user: { id: teacherId } } } as any,
      relations: ['section', 'section.class'],
    });

    // Merge and unique by section ID
    const sectionsMap = new Map<string, any>();
    classTeacherSections.forEach((s) => {
      sectionsMap.set(s.id, {
        id: s.id,
        name: s.name,
        className: s.class.name,
        classId: s.class.id,
        role: 'CLASS_TEACHER',
      });
    });

    subjectAllocations.forEach((a) => {
      if (!sectionsMap.has(a.section.id)) {
        sectionsMap.set(a.section.id, {
          id: a.section.id,
          name: a.section.name,
          className: a.section.class.name,
          classId: a.section.class.id,
          role: 'SUBJECT_TEACHER',
        });
      }
    });

    return Array.from(sectionsMap.values());
  }

  // Teacher Attendance
  async teacherCheckIn(teacherId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let attendance = await this.teacherAttendanceRepository.findOne({
      where: {
        teacher: { id: teacherId },
        date: today as any,
      } as any,
    });

    if (attendance && attendance.checkIn) {
      throw new BadRequestException('Already checked in today');
    }

    if (attendance && attendance.checkOut) {
      throw new BadRequestException(
        'Already checked out for today. Cannot check in again.',
      );
    }

    if (!attendance) {
      attendance = this.teacherAttendanceRepository.create({
        teacher: { id: teacherId } as any,
        date: today,
      });
    }

    attendance.checkIn = new Date();
    attendance.status = 'PRESENT';
    return this.teacherAttendanceRepository.save(attendance);
  }

  async teacherCheckOut(teacherId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await this.teacherAttendanceRepository.findOne({
      where: {
        teacher: { id: teacherId },
        date: today as any,
      } as any,
    });

    if (!attendance || !attendance.checkIn) {
      throw new BadRequestException('Must check in before checking out');
    }

    if (attendance.checkOut) {
      throw new BadRequestException('Already checked out today');
    }

    attendance.checkOut = new Date();
    return this.teacherAttendanceRepository.save(attendance);
  }

  async getTeacherTodayStatus(teacherId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.teacherAttendanceRepository.findOne({
      where: {
        teacher: { id: teacherId },
        date: today as any,
      } as any,
    });
  }

  async getTeacherAttendanceReport(
    teacherId?: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const where: any = {};
    if (teacherId) where.teacher = { id: teacherId };
    if (startDate && endDate) {
      where.date = Between(startDate, endDate);
    }

    return this.teacherAttendanceRepository.find({
      where,
      relations: ['teacher'],
      order: { date: 'DESC' },
    });
  }

  async getDetailedDailyReport(date: string) {
    const searchDate = new Date(date);
    searchDate.setHours(0, 0, 0, 0);

    const studentAttendances = await this.studentAttendanceRepository.find({
      where: { date: searchDate as any },
      relations: ['student', 'class', 'section'],
    });

    const teacherAttendances = await this.teacherAttendanceRepository.find({
      where: { date: searchDate as any },
      relations: ['teacher'],
    });

    return {
      date,
      students: studentAttendances.map((a) => ({
        id: a.student.id,
        name: a.student.username,
        className: a.class?.name,
        sectionName: a.section?.name,
        status: a.status,
        remarks: a.remarks,
      })),
      teachers: teacherAttendances.map((a) => ({
        id: a.teacher.id,
        name: a.teacher.username,
        checkIn: a.checkIn,
        checkOut: a.checkOut,
        status: a.status,
      })),
    };
  }

  async getDailyAttendanceSummaryInRange(startDate: Date, endDate: Date) {
    const records = await this.studentAttendanceRepository.find({
      where: { date: Between(startDate, endDate) } as any,
    });

    const summary: Record<string, { total: number; present: number }> = {};
    records.forEach((r) => {
      const d = new Date(r.date).toISOString().split('T')[0];
      if (!summary[d]) summary[d] = { total: 0, present: 0 };
      summary[d].total++;
      if (r.status === 'PRESENT') summary[d].present++;
    });

    return Object.entries(summary)
      .map(([date, counts]) => ({
        date,
        percentage:
          counts.total > 0 ? (counts.present / counts.total) * 100 : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // --- NEW REPORTING METHODS ---

  /**
   * Calculates working days in a range, excluding Saturdays and Holidays
   */
  async getWorkingDaysInRange(startDate: Date, endDate: Date): Promise<Date[]> {
    const holidays = await this.holidaysService.getHolidaysInRange(
      startDate,
      endDate,
    );
    const holidayDates = new Set(holidays.map((h) => h.date));

    const workingDays: Date[] = [];
    const current = new Date(startDate);
    current.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    while (current <= end) {
      const dayOfWeek = current.getDay();
      const dateStr = current.toISOString().split('T')[0];

      // 6 is Saturday in JS (0 is Sunday, 1 is Monday...)
      // Nepal has Saturday as a weekend.
      if (dayOfWeek !== 6 && !holidayDates.has(dateStr)) {
        workingDays.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }
    return workingDays;
  }

  async getStudentAttendanceReport(
    classId: string,
    sectionId?: string,
    startDate?: string,
    endDate?: string,
  ) {
    // Default range: Baishak 1, 2083 to Chaitra End, 2083 (Academic Year 2083)
    const start = startDate ? new Date(startDate) : new Date('2026-04-14'); // Baishak 1, 2083
    const end = endDate ? new Date(endDate) : new Date('2027-04-13'); // Approx Chaitra 30, 2083

    const workingDays = await this.getWorkingDaysInRange(start, end);
    const totalWorkingDays = workingDays.length;

    // Get Section info (including Class Teacher)
    let classTeacherName = 'N/A';
    if (sectionId) {
      const section = await this.sectionRepository.findOne({
        where: { id: sectionId },
        relations: ['classTeacher'],
      });
      if (section?.classTeacher) {
        classTeacherName = section.classTeacher.username;
      }
    }

    // Fetch students
    const where: any = { class: { id: classId } };
    if (sectionId) where.section = { id: sectionId };

    const students = await this.studentRepository.find({
      where: where,
      relations: ['user'],
    });

    // Fetch all attendance for these students in range
    const attendanceRecords = await this.studentAttendanceRepository.find({
      where: {
        class: { id: classId },
        ...(sectionId ? { section: { id: sectionId } } : {}),
        date: Between(start, end),
      } as any,
      relations: ['student'],
    });

    const report = students.map((student) => {
      const studentRecords = attendanceRecords.filter(
        (a) => a.student.id === student.user.id,
      );
      const presentDays = studentRecords.filter(
        (r) =>
          r.status === AttendanceStatus.PRESENT ||
          r.status === AttendanceStatus.LATE,
      ).length;
      const absentDays = studentRecords.filter(
        (r) => r.status === AttendanceStatus.ABSENT,
      ).length;

      return {
        studentId: student.user.id,
        studentName: student.user.username,
        rollNumber: student.rollNumber,
        presentDays,
        absentDays,
        totalWorkingDays,
        attendancePercentage:
          totalWorkingDays > 0
            ? Math.round((presentDays / totalWorkingDays) * 100)
            : 0,
      };
    });

    return {
      classTeacherName,
      totalWorkingDays,
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      students: report,
    };
  }

  async getTeachersAttendanceReport(startDate?: string, endDate?: string) {
    // Default range: Baishak 1, 2083 to Chaitra End, 2083
    const start = startDate ? new Date(startDate) : new Date('2026-04-14');
    const end = endDate ? new Date(endDate) : new Date('2027-04-13');

    const workingDays = await this.getWorkingDaysInRange(start, end);
    const totalWorkingDays = workingDays.length;

    const teachers = await this.usersService.findAllByRole('TEACHER' as any);

    const attendanceRecords = await this.teacherAttendanceRepository.find({
      where: {
        date: Between(start, end),
      } as any,
      relations: ['teacher'],
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const report = teachers.map((teacher) => {
      const teacherRecords = attendanceRecords.filter(
        (a) => a.teacher.id === teacher.id,
      );
      const presentDays = teacherRecords.filter(
        (r) => r.status === 'PRESENT',
      ).length;

      const todayRecord = teacherRecords.find((r) => {
        const rDate = new Date(r.date);
        rDate.setHours(0, 0, 0, 0);
        return rDate.getTime() === todayStart.getTime();
      });

      return {
        teacherId: teacher.id,
        teacherName: teacher.username,
        presentDays,
        totalWorkingDays,
        attendancePercentage:
          totalWorkingDays > 0
            ? Math.round((presentDays / totalWorkingDays) * 100)
            : 0,
        todayCheckIn: todayRecord?.checkIn || null,
        todayCheckOut: todayRecord?.checkOut || null,
      };
    });

    return {
      totalWorkingDays,
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      teachers: report,
    };
  }

  async getIndividualDetailedReport(
    userId: string,
    startDate?: string,
    endDate?: string,
  ) {
    const start = startDate
      ? new Date(startDate)
      : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate) : new Date();

    const user = await this.usersService.findOne(userId);
    if (!user) throw new NotFoundException('User not found');

    let records: any[] = [];
    if (user.role === 'STUDENT') {
      records = await this.studentAttendanceRepository.find({
        where: { student: { id: userId }, date: Between(start, end) } as any,
        order: { date: 'DESC' },
      });
    } else if (user.role === 'TEACHER') {
      records = await this.teacherAttendanceRepository.find({
        where: { teacher: { id: userId }, date: Between(start, end) } as any,
        order: { date: 'DESC' },
      });
    }

    const holidays = await this.holidaysService.getHolidaysInRange(start, end);

    return {
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      records: records.map((r) => ({
        date: r.date,
        status: r.status,
        remarks: r.remarks,
        checkIn: r.checkIn,
        checkOut: r.checkOut,
      })),
      holidays: holidays.map((h) => ({
        date: h.date,
        title: h.title,
      })),
    };
  }

  // ─── End-of-Month Low Attendance Notification ──────────────────────────────

  private isLastDayOfMonth(date: Date): boolean {
    const tomorrow = new Date(date);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.getDate() === 1;
  }

  private async getMonthlyAttendancePercentage(
    studentId: string,
    year: number,
    month: number,
  ): Promise<{ percentage: number; present: number; total: number }> {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0, 23, 59, 59);

    const workingDays = await this.getWorkingDaysInRange(start, end);
    const totalWorkingDays = workingDays.length;
    if (totalWorkingDays === 0) return { percentage: 0, present: 0, total: 0 };

    const records = await this.studentAttendanceRepository.find({
      where: {
        student: { id: studentId },
        date: Between(start, end),
      } as any,
    });

    const presentDays = records.filter(
      (r) =>
        r.status === AttendanceStatus.PRESENT ||
        r.status === AttendanceStatus.LATE,
    ).length;

    return {
      percentage: Math.round((presentDays / totalWorkingDays) * 100),
      present: presentDays,
      total: totalWorkingDays,
    };
  }

  @Cron('59 23 28-31 * *')
  async checkLowAttendanceEndOfMonth() {
    const now = new Date();
    if (!this.isLastDayOfMonth(now)) return;

    const year = now.getFullYear();
    const month = now.getMonth();

    console.log(
      `[AttendanceCron] Checking low attendance for ${year}-${month + 1}...`,
    );

    const students = await this.usersService.findAllStudentsWithParents();

    for (const student of students) {
      const { percentage } = await this.getMonthlyAttendancePercentage(
        student.id,
        year,
        month,
      );

      if (percentage < 70 && student.parents && student.parents.length > 0) {
        for (const parent of student.parents) {
          await this.notificationsService.create({
            recipientId: parent.id,
            title: 'Low Attendance Alert',
            message: `Your child ${student.username} has only ${percentage}% attendance this month (${month + 1}/${year}). Please ensure regular attendance.`,
            type: 'ABSENT_ALERT' as any,
          });
        }
      }
    }

    console.log(
      `[AttendanceCron] Low attendance check complete. Checked ${students.length} students.`,
    );
  }
}
