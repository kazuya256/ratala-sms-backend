import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { StudentAttendance, AttendanceStatus } from './entities/student-attendance.entity.js';
import { TeacherAttendance } from './entities/teacher-attendance.entity.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { UsersService } from '../users/users.service.js';
import { Section } from '../classes/entities/section.entity.js';
import { Student } from '../users/entities/student.entity.js';
import { SubjectAllocation } from '../subjects/entities/subject-allocation.entity.js';

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
        private readonly notificationsService: NotificationsService,
        private readonly usersService: UsersService,
    ) { }

    // Student Attendance
    async recordStudentAttendance(user: any, data: {
        studentId: string;
        classId: string;
        sectionId: string;
        date: string;
        status: AttendanceStatus;
        remarks?: string;
    }) {
        if (user.role === 'TEACHER') {
             const sections = await this.getTeacherSections(user.id);
             const isAssigned = sections.some(s => s.id === data.sectionId);
             if (!isAssigned) {
                 throw new BadRequestException('You are not assigned to mark attendance for this section.');
             }
        }
        const date = new Date(data.date);
        date.setHours(0, 0, 0, 0); // Normalize date

        let attendance = await this.studentAttendanceRepository.findOne({
            where: {
                student: { id: data.studentId },
                date: date as any
            } as any
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
            studentName: student?.username || "Unknown",
            classId: data.classId,
            sectionId: data.sectionId,
            date: data.date,
            status: saved.status,
            remarks: saved.remarks
        };
    }

    async recordBatchAttendance(user: any, data: {
        classId: string;
        sectionId: string;
        date: string;
        attendances: { studentId: string; status: AttendanceStatus; remarks?: string }[];
    }) {
        if (user.role === 'TEACHER') {
             const sections = await this.getTeacherSections(user.id);
             const isAssigned = sections.some(s => s.id === data.sectionId);
             if (!isAssigned) {
                 throw new BadRequestException('You are not assigned to mark attendance for this section.');
             }
        }
        const results: any[] = [];
        for (const item of data.attendances) {
            results.push(await this.recordStudentAttendance(user, {
                ...item,
                classId: data.classId,
                sectionId: data.sectionId,
                date: data.date
            }));
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
                        type: 'ABSENT_ALERT' as any
                    });
                }
            }
        } catch (e) {
            console.error('Failed to notify parents:', e);
        }
    }

    async getStudentAttendance(studentId: string, startDate?: Date, endDate?: Date) {
        const where: any = { student: { id: studentId } };
        if (startDate && endDate) {
            where.date = Between(startDate, endDate);
        } else if (startDate) {
            where.date = Between(startDate, new Date());
        }

        const records = await this.studentAttendanceRepository.find({
            where,
            relations: ['student', 'class', 'section'],
            order: { date: 'DESC' }
        });

        return records.map(record => ({
            id: record.id,
            studentId: record.student.id,
            studentName: record.student.username,
            classId: record.class?.id || "",
            sectionId: record.section?.id || "",
            date: typeof record.date === 'string' ? record.date : record.date.toISOString().split('T')[0],
            status: record.status,
            remarks: record.remarks
        }));
    }

    async getClassAttendance(classId?: string, sectionId?: string, date?: string) {
        const searchDate = date ? new Date(date) : new Date();
        searchDate.setHours(0, 0, 0, 0);

        if (classId && sectionId) {
            // Fetch all students of this section (Teacher's mark attendance view)
            const students = await this.studentRepository.find({
                where: {
                    class: { id: classId },
                    section: { id: sectionId }
                } as any,
                relations: ['user']
            });

            // Fetch existing attendance records for this date
            const attendanceRecords = await this.studentAttendanceRepository.find({
                where: {
                    class: { id: classId },
                    section: { id: sectionId },
                    date: searchDate as any
                } as any,
                relations: ['student']
            });

            // Merge: Return all students, and if they have an attendance record, attach it
            return students.map(student => {
                const record = attendanceRecords.find(a => a.student.id === student.user.id);
                return {
                    id: record?.id || "",
                    studentId: student.user.id,
                    studentName: student.user.username,
                    classId,
                    sectionId,
                    date: date || searchDate.toISOString(),
                    status: record?.status || AttendanceStatus.PRESENT, // Default to present for UI if no record
                    remarks: record?.remarks || null
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
                relations: ['student', 'class', 'section']
            });

            return records.map(record => ({
                id: record.id,
                studentId: record.student.id,
                studentName: record.student.username,
                classId: record.class?.id || classId || "",
                sectionId: record.section?.id || sectionId || "",
                className: record.class?.name || "Unknown",
                sectionName: record.section?.name || "General",
                date: typeof record.date === 'string' ? record.date : record.date.toISOString().split('T')[0],
                status: record.status,
                remarks: record.remarks
            }));
        }
    }

    async getTeacherSections(teacherId: string) {
        // 1. Sections where teacher is Class Teacher
        const classTeacherSections = await this.sectionRepository.find({
            where: { classTeacher: { id: teacherId } } as any,
            relations: ['class']
        });

        // 2. Sections where teacher is assigned to a subject
        const subjectAllocations = await this.allocationRepository.find({
            where: { teacher: { user: { id: teacherId } } } as any,
            relations: ['section', 'section.class']
        });

        // Merge and unique by section ID
        const sectionsMap = new Map<string, any>();
        classTeacherSections.forEach(s => {
            sectionsMap.set(s.id, {
                id: s.id,
                name: s.name,
                className: s.class.name,
                classId: s.class.id,
                role: 'CLASS_TEACHER'
            });
        });

        subjectAllocations.forEach(a => {
            if (!sectionsMap.has(a.section.id)) {
                sectionsMap.set(a.section.id, {
                    id: a.section.id,
                    name: a.section.name,
                    className: a.section.class.name,
                    classId: a.section.class.id,
                    role: 'SUBJECT_TEACHER'
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
                date: today as any
            } as any
        });

        if (attendance && attendance.checkIn) {
            throw new BadRequestException('Already checked in today');
        }

        if (attendance && attendance.checkOut) {
            throw new BadRequestException('Already checked out for today. Cannot check in again.');
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
                date: today as any
            } as any
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
                date: today as any
            } as any
        });
    }

    async getTeacherAttendanceReport(teacherId?: string, startDate?: Date, endDate?: Date) {
        const where: any = {};
        if (teacherId) where.teacher = { id: teacherId };
        if (startDate && endDate) {
            where.date = Between(startDate, endDate);
        }

        return this.teacherAttendanceRepository.find({
            where,
            relations: ['teacher'],
            order: { date: 'DESC' }
        });
    }

    async getDetailedDailyReport(date: string) {
        const searchDate = new Date(date);
        searchDate.setHours(0, 0, 0, 0);

        const studentAttendances = await this.studentAttendanceRepository.find({
            where: { date: searchDate as any },
            relations: ['student', 'class', 'section']
        });

        const teacherAttendances = await this.teacherAttendanceRepository.find({
            where: { date: searchDate as any },
            relations: ['teacher']
        });

        return {
            date,
            students: studentAttendances.map(a => ({
                id: a.student.id,
                name: a.student.username,
                className: a.class?.name,
                sectionName: a.section?.name,
                status: a.status,
                remarks: a.remarks
            })),
            teachers: teacherAttendances.map(a => ({
                id: a.teacher.id,
                name: a.teacher.username,
                checkIn: a.checkIn,
                checkOut: a.checkOut,
                status: a.status
            }))
        };
    }

    async getDailyAttendanceSummaryInRange(startDate: Date, endDate: Date) {
        const records = await this.studentAttendanceRepository.find({
            where: { date: Between(startDate, endDate) } as any
        });

        const summary: Record<string, { total: number, present: number }> = {};
        records.forEach(r => {
            const d = new Date(r.date).toISOString().split('T')[0];
            if (!summary[d]) summary[d] = { total: 0, present: 0 };
            summary[d].total++;
            if (r.status === 'PRESENT') summary[d].present++;
        });

        return Object.entries(summary).map(([date, counts]) => ({
            date,
            percentage: counts.total > 0 ? (counts.present / counts.total) * 100 : 0
        })).sort((a, b) => a.date.localeCompare(b.date));
    }
}
