import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { FeeStructure } from './entities/fee-structure.entity.js';
import { StudentFee } from './entities/student-fee.entity.js';
import { Payment } from './entities/payment.entity.js';
import { User } from '../users/entities/user.entity.js';

@Injectable()
export class FeesService {
    constructor(
        @InjectRepository(FeeStructure)
        private readonly feeStructureRepository: Repository<FeeStructure>,
        @InjectRepository(StudentFee)
        private readonly studentFeeRepository: Repository<StudentFee>,
        @InjectRepository(Payment)
        private readonly paymentRepository: Repository<Payment>,
    ) { }

    // Fee Structure
    async createStructure(name: string, amount: number, classId?: string, description?: string): Promise<FeeStructure> {
        const structure = this.feeStructureRepository.create({ name, amount, classId, description });
        return this.feeStructureRepository.save(structure);
    }

    async findAllStructures(): Promise<FeeStructure[]> {
        return this.feeStructureRepository.find();
    }

    // Student Fees
    async assignFeeToStudent(studentId: string, structureId: string, dueDate: Date, installments = 1): Promise<StudentFee> {
        const structure = await this.feeStructureRepository.findOneBy({ id: structureId });
        if (!structure) throw new NotFoundException('Fee structure not found');

        const studentFee = this.studentFeeRepository.create({
            student: { id: studentId } as User,
            feeStructure: structure,
            totalAmount: structure.amount,
            remainingAmount: structure.amount,
            dueDate,
            totalInstallments: installments,
            paidInstallments: 0,
        });
        return this.studentFeeRepository.save(studentFee);
    }

    async getStudentFees(studentId: string): Promise<StudentFee[]> {
        return this.studentFeeRepository.find({
            where: { student: { id: studentId } } as any,
            relations: ['feeStructure'],
        });
    }

    // Payments
    async collectPayment(studentFeeId: string, amount: number, collectedBy: User, method: string, transactionId?: string): Promise<Payment> {
        const studentFee = await this.studentFeeRepository.findOneBy({ id: studentFeeId });
        if (!studentFee) throw new NotFoundException('Student fee record not found');

        if (Number(amount) > Number(studentFee.remainingAmount)) {
            throw new BadRequestException('Payment amount exceeds remaining balance');
        }

        // Create Payment Record
        const payment = this.paymentRepository.create({
            studentFee,
            amount,
            collectedBy,
            paymentMethod: method,
            transactionId,
            receiptUrl: `https://school-api.com/receipts/${Date.now()}.pdf` // Simulated PDF link
        });

        // Update StudentFee
        studentFee.paidAmount = Number(studentFee.paidAmount) + Number(amount);
        studentFee.remainingAmount = Number(studentFee.totalAmount) - Number(studentFee.paidAmount);

        // Simple installment logic: if we paid at least (Total/Installments), increment paid installments
        const installmentAmount = studentFee.totalAmount / studentFee.totalInstallments;
        studentFee.paidInstallments = Math.floor(studentFee.paidAmount / installmentAmount);

        if (studentFee.remainingAmount <= 0) {
            studentFee.status = 'PAID';
            studentFee.remainingAmount = 0;
        } else if (studentFee.paidAmount > 0) {
            studentFee.status = 'PARTIAL';
        }

        await this.studentFeeRepository.save(studentFee);
        return this.paymentRepository.save(payment);
    }

    async recordOnlinePayment(studentFeeId: string, amount: number, transactionId: string, method: string): Promise<Payment> {
        // In a real app, this would be called by a webhook from Khalti/eSewa
        const adminUser = { id: 'SYSTEM' } as User; // Or a dedicated system user
        return this.collectPayment(studentFeeId, amount, adminUser, method, transactionId);
    }

    async refundPayment(paymentId: string, reason: string): Promise<void> {
        const payment = await this.paymentRepository.findOne({
            where: { id: paymentId },
            relations: ['studentFee']
        });
        if (!payment) throw new NotFoundException('Payment not found');
        if (payment.status === 'REFUNDED') throw new BadRequestException('Payment already refunded');

        payment.status = 'REFUNDED';
        const studentFee = payment.studentFee;
        studentFee.paidAmount = Number(studentFee.paidAmount) - Number(payment.amount);
        studentFee.remainingAmount = Number(studentFee.totalAmount) - Number(studentFee.paidAmount);

        if (studentFee.paidAmount <= 0) {
            studentFee.status = 'UNPAID';
        } else {
            studentFee.status = 'PARTIAL';
        }

        await this.studentFeeRepository.save(studentFee);
        await this.paymentRepository.save(payment);
    }

    async getRecentPayments(): Promise<Payment[]> {
        return this.paymentRepository.find({
            relations: ['studentFee', 'studentFee.student', 'studentFee.feeStructure', 'collectedBy'],
            order: { paymentDate: 'DESC' },
            take: 50,
        });
    }

    async getPendingFees(): Promise<StudentFee[]> {
        return this.studentFeeRepository.find({
            where: [
                { status: 'UNPAID' },
                { status: 'PARTIAL' }
            ] as any,
            relations: ['feeStructure', 'student'],
            order: { dueDate: 'ASC' }
        });
    }

    async getRevenueInRange(startDate: Date, endDate: Date) {
        const payments = await this.paymentRepository.find({
            where: { paymentDate: Between(startDate, endDate) } as any,
            order: { paymentDate: 'ASC' }
        });

        const monthlyRevenue: Record<string, number> = {};
        payments.forEach(p => {
            const date = new Date(p.paymentDate);
            const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + Number(p.amount);
        });

        return Object.entries(monthlyRevenue).map(([month, amount]) => ({
            month,
            amount
        }));
    }
}
