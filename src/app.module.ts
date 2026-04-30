import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { ClassesModule } from './modules/classes/classes.module.js';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { AllExceptionsFilter } from './common/filters/http-exception.filter.js';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { NoticesModule } from './modules/notices/notices.module.js';
import { FeesModule } from './modules/fees/fees.module.js';
import { SubjectsModule } from './modules/subjects/subjects.module.js';
import { TimetableModule } from './modules/timetable/timetable.module.js';
import { ExamsModule } from './modules/exams/exams.module.js';
import { AttendanceModule } from './modules/attendance/attendance.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { ReportsModule } from './modules/reports/reports.module.js';
import { CommunicationsModule } from './modules/communications/communications.module.js';
import { HomeworkModule } from './modules/homework/homework.module.js';
import { NotesModule } from './modules/notes/notes.module.js';
import { AchievementsModule } from './modules/achievements/achievements.module.js';
import { HolidaysModule } from './modules/holidays/holidays.module.js';
import { TransportModule } from './modules/transport/transport.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const url = configService.get<string>('DATABASE_URL');
        return {
          type: 'postgres',
          url: url,
          host: url ? undefined : configService.get<string>('DB_HOST'),
          port: url ? undefined : configService.get<number>('DB_PORT'),
          username: url ? undefined : configService.get<string>('DB_USERNAME'),
          password: url ? undefined : configService.get<string>('DB_PASSWORD'),
          database: url ? undefined : configService.get<string>('DB_NAME'),
          autoLoadEntities: true,
          synchronize: true, // Only for development
          ssl: url ? { rejectUnauthorized: false } : false,
        };
      },
      inject: [ConfigService],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    AuthModule,
    UsersModule,
    ClassesModule,
    NoticesModule,
    FeesModule,
    SubjectsModule,
    TimetableModule,
    ExamsModule,
    AttendanceModule,
    NotificationsModule,
    ReportsModule,
    CommunicationsModule,
    HomeworkModule,
    NotesModule,
    AchievementsModule,
    HolidaysModule,
    TransportModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
// Triggering reload...
