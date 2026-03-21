import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import { UserRole } from '../constants/role.enum.js';

@Injectable()
export class VerifiedGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const { user } = context.switchToHttp().getRequest();

        if (!user) {
            throw new ForbiddenException('Access denied: No user found');
        }

        // Admins are always verified
        if (user.role === UserRole.ADMIN) {
            return true;
        }

        if (!user.isVerified) {
            throw new ForbiddenException('Access denied: Account pending verification');
        }

        return true;
    }
}
