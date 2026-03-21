import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersService } from '../users/users.service.js';
import { FeesService } from '../fees/fees.service.js';
import { AttendanceService } from '../attendance/attendance.service.js';
import { ExamsService } from '../exams/exams.service.js';
import { CommunicationsService } from '../communications/communications.service.js';

@Injectable()
export class ReportsService {
    constructor(
        private readonly usersService: UsersService,
        private readonly feesService: FeesService,
        private readonly attendanceService: AttendanceService,
        private readonly examsService: ExamsService,
        private readonly communicationsService: CommunicationsService,
    ) { }

    async getStudentAcademicReport(studentId: string) {
        const student = await this.usersService.findOneStudentWithProfile(studentId);
        if (!student) throw new NotFoundException('Student not found');

        const attendance = await this.attendanceService.getStudentAttendance(studentId, new Date(0), new Date());
        const fees = await this.feesService.getStudentFees(studentId);
        const marks = await this.examsService.getStudentMarks(studentId);

        return {
            student: {
                id: student.id,
                username: student.username,
                role: student.role,
                className: student.studentProfile?.class?.name,
                sectionName: student.studentProfile?.section?.name,
            },
            attendanceSummary: {
                total: attendance.length,
                present: attendance.filter(a => a.status === 'PRESENT').length,
                absent: attendance.filter(a => a.status === 'ABSENT').length,
            },
            feeStatus: fees,
            results: marks.map(m => ({
                id: m.id,
                examId: m.exam?.id,
                examName: m.exam?.name,
                subjectName: m.exam?.subject?.name,
                marksObtained: m.marksObtained,
                maxMarks: m.exam?.maxMarks,
                remarks: m.remarks,
                isAbsent: m.isAbsent,
                date: m.updatedAt
            })),
        };
    }

    async getAdminDashboardStats() {
        const [totalStudents, totalTeachers, totalParents, totalClasses, totalMessages] = await Promise.all([
            this.usersService.countByRole('STUDENT' as any),
            this.usersService.countByRole('TEACHER' as any),
            this.usersService.countByRole('PARENT' as any),
            this.usersService.countClasses(),
            this.communicationsService.totalComplains()
        ]);

        const recentPayments = (await this.feesService.getRecentPayments()).map(p => ({
            id: p.id,
            amount: p.amount,
            paymentMethod: p.paymentMethod,
            transactionId: p.transactionId,
            paymentDate: p.paymentDate,
            collectedByName: p.collectedBy?.username || 'System',
            status: p.status,
            receiptUrl: p.receiptUrl,
            studentName: p.studentFee?.student?.username || 'Unknown',
            feeType: p.studentFee?.feeStructure?.name || 'Fee'
        }));

        const today = new Date().toISOString().split('T')[0];
        const attendance = await this.attendanceService.getClassAttendance(undefined, undefined, today);
        const todayPresent = attendance.filter(a => a.status === 'PRESENT').length;

        const pendingFeesList = await this.feesService.getPendingFees();
        const pendingFees = pendingFeesList.length;

        // Trends
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const attendanceTrends = await this.attendanceService.getDailyAttendanceSummaryInRange(sevenDaysAgo, new Date());

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const revenueTrends = await this.feesService.getRevenueInRange(sixMonthsAgo, new Date());

        return {
            totalStudents,
            totalTeachers,
            totalParents,
            totalClasses,
            totalMessages,
            totalRevenue: recentPayments.reduce((acc, p) => acc + Number(p.amount), 0),
            recentPayments,
            todayPresent,
            pendingFees,
            attendanceTrends,
            revenueTrends
        };
    }

    async getAttendanceSummaryByClass(date?: string) {
        const today = date || new Date().toISOString().split('T')[0];
        const allAttendance = await this.attendanceService.getClassAttendance(undefined, undefined, today);
        
        // Group by combined class and section
        const summaries: Record<string, { classSec: string, present: number, absent: number, total: number }> = {};
        
        // We also need all sections to show zero attendance if no record exists
        // But for simplicity, we'll aggregate what we have and maybe use all students to find missing ones.
        // Actually, getClassAttendance(undefined, undefined, date) with no classId only returns existing records.
        // Let's make it better by fetching all active sections first.
        
        const records = allAttendance;
        records.forEach(r => {
            const key = `${r.classId}_${r.sectionId}`;
            if (!summaries[key]) {
                summaries[key] = { classSec: `${r.classId}-${r.sectionId}`, present: 0, absent: 0, total: 0 };
            }
            summaries[key].total++;
            if (r.status === 'PRESENT') summaries[key].present++;
            else if (r.status === 'ABSENT') summaries[key].absent++;
        });

        return Object.values(summaries);
    }
}
