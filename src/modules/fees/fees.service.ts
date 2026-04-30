import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, IsNull } from 'typeorm';
import { FeeStructure } from './entities/fee-structure.entity.js';
import { StudentFee } from './entities/student-fee.entity.js';
import { Payment } from './entities/payment.entity.js';
import { User } from '../users/entities/user.entity.js';
import { Student } from '../users/entities/student.entity.js';
import * as crypto from 'crypto';

@Injectable()
export class FeesService {
  constructor(
    @InjectRepository(FeeStructure)
    private readonly feeStructureRepository: Repository<FeeStructure>,
    @InjectRepository(StudentFee)
    private readonly studentFeeRepository: Repository<StudentFee>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
  ) {}

  // Fee Structure
  async createStructure(
    name: string,
    amount: number,
    classId?: string,
    description?: string,
    studentId?: string,
  ): Promise<FeeStructure> {
    // If creating for a class, check if it matches an existing universal template
    if (classId && classId !== 'ALL' && classId !== 'UNIVERSAL' && !studentId) {
      const universal = await this.feeStructureRepository.findOne({
        where: { name, classId: IsNull() },
      });
      if (universal && Number(universal.amount) === Number(amount)) {
        // Matches universal, no need for class-specific record
        return universal;
      }
    }
    const structure = this.feeStructureRepository.create({
      name,
      amount,
      classId,
      description,
      studentId,
    });
    return this.feeStructureRepository.save(structure);
  }

  async updateStructure(id: string, data: Partial<FeeStructure>): Promise<any> {
    const structure = await this.feeStructureRepository.findOneBy({ id });
    if (!structure) throw new NotFoundException('Fee structure not found');

    const finalName = data.name || structure.name;
    const finalAmount =
      data.amount !== undefined
        ? Number(data.amount)
        : Number(structure.amount);
    const hasClassIdUpdate = Object.prototype.hasOwnProperty.call(
      data,
      'classId',
    );
    const normalizedIncomingClassId = hasClassIdUpdate
      ? data.classId && data.classId !== 'ALL' && data.classId !== 'UNIVERSAL'
        ? data.classId
        : null
      : undefined;
    const targetClassId = hasClassIdUpdate
      ? normalizedIncomingClassId
      : (structure.classId ?? null);
    const sanitizedData: Partial<FeeStructure> = { ...data };
    if (hasClassIdUpdate) sanitizedData.classId = targetClassId ?? null;

    // Find the master universal template for this fee name
    const universal = await this.feeStructureRepository.findOne({
      where: { name: finalName, classId: IsNull() },
    });

    // CASE 1: BRANCHING - Universal structure being updated with a classId
    if (
      !structure.classId &&
      targetClassId &&
      targetClassId !== 'ALL' &&
      targetClassId !== 'UNIVERSAL'
    ) {
      // Only branch if it differs from universal or doesn't exist
      if (!universal || Number(universal.amount) !== finalAmount) {
        const branched = this.feeStructureRepository.create({
          ...structure,
          ...data,
          id: undefined,
          classId: targetClassId,
        });
        const saved = await this.feeStructureRepository.save(branched);
        await this.bulkAssignFeeToClasses(
          [targetClassId],
          saved.id,
          new Date(),
          1,
          finalAmount,
        );
        return saved;
      }
      return universal; // Already matches universal
    }

    // CASE 2: REVERTING - Class-specific structure being updated to match universal
    if (
      structure.classId &&
      hasClassIdUpdate &&
      !targetClassId &&
      universal &&
      Number(universal.amount) === finalAmount
    ) {
      // Move students back to universal
      await this.studentFeeRepository.query(
        `
                UPDATE student_fees SET "feeStructureId" = $1 WHERE "feeStructureId" = $2 AND "status" = 'UNPAID'
            `,
        [universal.id, structure.id],
      );
      await this.feeStructureRepository.remove(structure);
      return universal;
    }

    // CASE 3: Normal update
    Object.assign(structure, sanitizedData);
    return await this.feeStructureRepository.save(structure);
  }

  async deleteStructure(id: string): Promise<void> {
    const structure = await this.feeStructureRepository.findOneBy({ id });
    if (!structure) throw new NotFoundException('Fee structure not found');

    // If it's class-specific, move students back to universal before deleting
    if (structure.classId) {
      const universal = await this.feeStructureRepository.findOne({
        where: { name: structure.name, classId: IsNull() },
      });
      if (universal) {
        await this.studentFeeRepository.query(
          `
                    UPDATE student_fees SET "feeStructureId" = $1 WHERE "feeStructureId" = $2 AND "status" = 'UNPAID'
                `,
          [universal.id, structure.id],
        );
      }
    }

    await this.feeStructureRepository.remove(structure);
  }

  async findAllStructures(classId?: string, studentId?: string): Promise<any[]> {
    const query = this.feeStructureRepository.createQueryBuilder('s');

    // Base selection for all cases
    query.select([
      's.id as id',
      's.name as name',
      's.amount as amount',
      's.description as description',
      's.classId as "classId"',
      's.studentId as "studentId"',
    ]);

    if (studentId) {
      query.where('(s."studentId" = :studentId OR s."studentId" IS NULL)', {
        studentId,
      });
    } else {
      query.where('s."studentId" IS NULL');
    }

    if (classId && classId !== 'ALL' && classId !== 'UNIVERSAL') {
      query
        .leftJoin('student_fees', 'sf', 'sf."feeStructureId" = s.id')
        .leftJoin(
          'students',
          'st',
          'st."userId" = sf."studentId" AND st."classId"::text = :classId',
          { classId },
        )
        .addSelect([
          'sf."totalAmount" as "overrideAmount"',
          'sf."dueDate" as "overrideDueDate"',
          'sf."totalInstallments" as "overrideInstallments"',
        ])
        .andWhere(
          '(s."classId"::text = :classId OR s."classId" IS NULL OR s."classId" = \'\')',
          { classId },
        );
    } else if (classId === 'UNIVERSAL') {
      query.andWhere('(s."classId" IS NULL OR s."classId" = \'\')');
    }

    const rawResults = await query.getRawMany();

    const results: any[] = [];
    const seen = new Set();

    for (const res of rawResults) {
      const existingIndex = results.findIndex((r) => r.id === res.id);
      const formatted = {
        id: res.id,
        name: res.name,
        amount: res.overrideAmount
          ? Number(res.overrideAmount)
          : Number(res.amount),
        description: res.description,
        classId: res.classId,
        dueDate: res.overrideDueDate,
        totalInstallments: res.overrideInstallments,
        isAssignedToClass: !!res.overrideAmount,
      };

      if (existingIndex > -1) {
        if (
          !results[existingIndex].isAssignedToClass &&
          formatted.isAssignedToClass
        ) {
          results[existingIndex] = formatted;
        }
      } else {
        results.push(formatted);
      }
    }

    return results;
  }

  // Student Fees
  async assignFeeToStudent(
    studentId: string,
    structureId: string,
    dueDate: Date | null,
    installments = 1,
  ): Promise<StudentFee> {
    const structure = await this.feeStructureRepository.findOneBy({
      id: structureId,
    });
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

  async bulkAssignFeeToClasses(
    classIds: string[],
    structureId: string,
    dueDate: Date | null,
    installments: number,
    amount?: number,
  ): Promise<void> {
    const baseStructure = await this.feeStructureRepository.findOneBy({
      id: structureId,
    });
    if (!baseStructure) throw new NotFoundException('Fee structure not found');

    const baseAmount = Number(baseStructure.amount);
    const finalAmount = amount !== undefined ? Number(amount) : baseAmount;

    // If amount has changed and we are doing a broad assignment, update the master template too
    if (finalAmount !== baseAmount) {
      baseStructure.amount = finalAmount;
      await this.feeStructureRepository.save(baseStructure);
    }

    for (const classId of classIds) {
      let targetStructureId = structureId;

      // Check for existing class-specific version
      let classSpecific = await this.feeStructureRepository.findOneBy({
        name: baseStructure.name,
        classId: classId,
      });

      // REVERT/MERGE LOGIC: If amount matches the (newly updated) base, move back to universal
      if (
        finalAmount === Number(baseStructure.amount) &&
        classId &&
        classId !== 'ALL'
      ) {
        if (classSpecific) {
          const userIdsResult = await this.studentFeeRepository.query(
            `
                        SELECT s."userId"
                        FROM students s
                        INNER JOIN users u ON u.id = s."userId"
                        WHERE s."classId" = $1
                    `,
            [classId],
          );
          const userIds = userIdsResult.map((u) => u.userId);

          if (userIds.length > 0) {
            await this.studentFeeRepository.query(
              `
                            UPDATE student_fees 
                            SET "feeStructureId" = $1, "totalAmount" = $2, "remainingAmount" = $2
                            WHERE "studentId" = ANY($3) AND "feeStructureId" = $4 AND "status" = 'UNPAID'
                        `,
              [baseStructure.id, finalAmount, userIds, classSpecific.id],
            );
          }

          await this.feeStructureRepository.remove(classSpecific);
          targetStructureId = baseStructure.id;
        }
      } else if (classId && classId !== 'ALL' && classId !== 'UNIVERSAL') {
        // BRANCHING LOGIC: Create/Update class-specific version
        if (!classSpecific) {
          classSpecific = this.feeStructureRepository.create({
            name: baseStructure.name,
            description:
              baseStructure.description ||
              `Class-specific ${baseStructure.name}`,
            amount: finalAmount,
            classId: classId,
          });
          await this.feeStructureRepository.save(classSpecific);
        } else {
          classSpecific.amount = finalAmount;
          await this.feeStructureRepository.save(classSpecific);
        }
        targetStructureId = classSpecific.id;
      }

      const studentProfiles = await this.studentFeeRepository.query(
        `
                SELECT s."userId"
                FROM students s
                INNER JOIN users u ON u.id = s."userId"
                WHERE s."classId" = $1
            `,
        [classId],
      );

      const userIds = studentProfiles.map((p) => p.userId);
      if (userIds.length === 0) continue;

      await this.studentFeeRepository.query(
        `
                UPDATE student_fees 
                SET "totalAmount" = $1, "remainingAmount" = $1, "dueDate" = $2, "totalInstallments" = $3, "feeStructureId" = $4
                WHERE "studentId" = ANY($5) AND "status" = 'UNPAID' AND ("feeStructureId" = $6 OR "feeStructureId" = $4)
            `,
        [
          finalAmount,
          dueDate,
          installments,
          targetStructureId,
          userIds,
          structureId,
        ],
      );

      for (const userId of userIds) {
        const exists = await this.studentFeeRepository.query(
          `
                    SELECT id FROM student_fees WHERE "studentId" = $1 AND "feeStructureId" = $2 LIMIT 1
                `,
          [userId, targetStructureId],
        );

        if (!exists || exists.length === 0) {
          await this.studentFeeRepository.query(
            `
                        INSERT INTO student_fees ("id", "studentId", "feeStructureId", "totalAmount", "remainingAmount", "dueDate", "totalInstallments", "status", "paidAmount", "paidInstallments", "createdAt")
                        VALUES ($1, $2, $3, $4, $4, $5, $6, 'UNPAID', 0, 0, NOW())
                    `,
            [
              crypto.randomUUID(),
              userId,
              targetStructureId,
              finalAmount,
              dueDate,
              installments,
            ],
          );
        }
      }
    }
  }

  async bulkRemoveFeeFromClasses(
    classIds: string[],
    structureId: string,
  ): Promise<void> {
    for (const classId of classIds) {
      const students = await this.studentFeeRepository.manager.find(User, {
        where: { studentProfile: { class: { id: classId } } } as any,
        select: ['id'],
      });
      const studentIds = students.map((s) => s.id);

      if (studentIds.length > 0) {
        await this.studentFeeRepository.delete({
          feeStructure: { id: structureId },
          student: { id: In(studentIds) },
          paidInstallments: 0,
        });
      }
    }
  }

  async getStudentFees(studentId: string): Promise<StudentFee[]> {
    return this.studentFeeRepository.find({
      where: { student: { id: studentId } } as any,
      relations: ['feeStructure'],
    });
  }

  async updateStudentFeeBill(
    studentId: string,
    studentFeeId: string,
    data: {
      totalAmount?: number;
      paidAmount?: number;
      remainingAmount?: number;
      dueDate?: string | Date;
      status?: string;
    },
  ): Promise<StudentFee> {
    const fee = await this.studentFeeRepository.findOne({
      where: { id: studentFeeId, student: { id: studentId } } as any,
      relations: ['feeStructure'],
    });
    if (!fee) throw new NotFoundException('Student fee record not found');

    const totalAmount =
      data.totalAmount !== undefined ? Number(data.totalAmount) : Number(fee.totalAmount);
    const paidAmount =
      data.paidAmount !== undefined ? Number(data.paidAmount) : Number(fee.paidAmount);

    if (totalAmount < 0 || paidAmount < 0) {
      throw new BadRequestException('Amounts cannot be negative');
    }
    if (paidAmount > totalAmount) {
      throw new BadRequestException('Paid amount cannot exceed total amount');
    }

    const remainingAmount =
      data.remainingAmount !== undefined
        ? Number(data.remainingAmount)
        : Number(totalAmount) - Number(paidAmount);

    fee.totalAmount = totalAmount;
    fee.paidAmount = paidAmount;
    fee.remainingAmount = Math.max(remainingAmount, 0);
    fee.status =
      fee.remainingAmount <= 0 ? 'PAID' : fee.paidAmount > 0 ? 'PARTIAL' : 'UNPAID';

    const installmentAmount = fee.totalInstallments
      ? Number(fee.totalAmount) / Number(fee.totalInstallments)
      : Number(fee.totalAmount);
    fee.paidInstallments =
      installmentAmount > 0 ? Math.floor(Number(fee.paidAmount) / installmentAmount) : 0;

    if (data.dueDate !== undefined) {
      fee.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    }

    return this.studentFeeRepository.save(fee);
  }

  async deassignStudentFee(
    studentId: string,
    studentFeeId: string,
  ): Promise<{ success: boolean; message: string }> {
    const fee = await this.studentFeeRepository.findOne({
      where: { id: studentFeeId, student: { id: studentId } } as any,
    });
    if (!fee) throw new NotFoundException('Student fee record not found');

    await this.studentFeeRepository.remove(fee);
    return { success: true, message: 'Student fee deassigned successfully' };
  }

  // Payments
  async collectPayment(
    studentFeeId: string,
    amount: number,
    collectedBy: User,
    method: string,
    transactionId?: string,
  ): Promise<Payment> {
    const studentFee = await this.studentFeeRepository.findOneBy({
      id: studentFeeId,
    });
    if (!studentFee)
      throw new NotFoundException('Student fee record not found');

    if (Number(amount) > Number(studentFee.remainingAmount)) {
      throw new BadRequestException('Payment amount exceeds remaining balance');
    }

    const payment = this.paymentRepository.create({
      studentFee,
      amount,
      collectedBy,
      paymentMethod: method,
      transactionId,
      receiptUrl: `https://school-api.com/receipts/${Date.now()}.pdf`,
    });

    studentFee.paidAmount = Number(studentFee.paidAmount) + Number(amount);
    studentFee.remainingAmount =
      Number(studentFee.totalAmount) - Number(studentFee.paidAmount);

    const installmentAmount =
      studentFee.totalAmount / studentFee.totalInstallments;
    studentFee.paidInstallments = Math.floor(
      studentFee.paidAmount / installmentAmount,
    );

    if (studentFee.remainingAmount <= 0) {
      studentFee.status = 'PAID';
      studentFee.remainingAmount = 0;
    } else if (studentFee.paidAmount > 0) {
      studentFee.status = 'PARTIAL';
    }

    await this.studentFeeRepository.save(studentFee);
    return this.paymentRepository.save(payment);
  }

  async recordOnlinePayment(
    studentFeeId: string,
    amount: number,
    transactionId: string,
    method: string,
  ): Promise<Payment> {
    const adminUser = { id: 'SYSTEM' } as User;
    return this.collectPayment(
      studentFeeId,
      amount,
      adminUser,
      method,
      transactionId,
    );
  }

  async refundPayment(paymentId: string, reason: string): Promise<void> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
      relations: ['studentFee'],
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status === 'REFUNDED')
      throw new BadRequestException('Payment already refunded');

    payment.status = 'REFUNDED';
    const studentFee = payment.studentFee;
    studentFee.paidAmount =
      Number(studentFee.paidAmount) - Number(payment.amount);
    studentFee.remainingAmount =
      Number(studentFee.totalAmount) - Number(studentFee.paidAmount);

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
      relations: [
        'studentFee',
        'studentFee.student',
        'studentFee.feeStructure',
        'collectedBy',
      ],
      order: { paymentDate: 'DESC' },
      take: 50,
    });
  }

  async getPendingFees(): Promise<StudentFee[]> {
    return this.studentFeeRepository.find({
      where: [{ status: 'UNPAID' }, { status: 'PARTIAL' }] as any,
      relations: ['feeStructure', 'student'],
      order: { dueDate: 'ASC' },
    });
  }

  async getRevenueInRange(startDate: Date, endDate: Date) {
    const payments = await this.paymentRepository.find({
      where: { paymentDate: Between(startDate, endDate) } as any,
      order: { paymentDate: 'ASC' },
    });

    const monthlyRevenue: Record<string, number> = {};
    payments.forEach((p) => {
      const date = new Date(p.paymentDate);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      monthlyRevenue[monthKey] =
        (monthlyRevenue[monthKey] || 0) + Number(p.amount);
    });

    return Object.entries(monthlyRevenue).map(([month, amount]) => ({
      month,
      amount,
    }));
  }
}
