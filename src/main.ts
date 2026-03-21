import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import { ConfigService } from '@nestjs/config';
import * as os from 'os';

function getLocalIpAddress(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] ?? []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Security: Helmet sets secure HTTP headers
  app.use(helmet());

  // Security: CORS – allows all origins since we use ApiKeyGuard for auth
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global Validation: whitelist + transform + reject extra fields
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = configService.get<number>('PORT') || 3000;

  // Listen on 0.0.0.0 so the server is reachable on all network interfaces
  await app.listen(port, '0.0.0.0');

  const localIp = getLocalIpAddress();
  logger.log(`✅  Skooly Backend running on port ${port}`);
  logger.log(`🌐  Local:   http://localhost:${port}`);
  logger.log(
    `📱  Network: http://${localIp}:${port}  ← use this on your mobile device`,
  );
  logger.log(
    `🔐  Environment: ${configService.get('NODE_ENV') || 'development'}`,
  );
}
bootstrap();
