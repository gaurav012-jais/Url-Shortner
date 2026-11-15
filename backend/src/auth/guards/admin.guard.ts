import {
  Injectable,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '../../users/entities/user.entity';

@Injectable()
export class AdminGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isAuthed = await super.canActivate(context);
    if (!isAuthed) {
      throw new UnauthorizedException(
        'Authentication required to access administrative features.',
      );
    }

    const req = context.switchToHttp().getRequest();
    const user = req.user;

    if (!user || (user.role !== UserRole.ADMIN && user.role !== 'admin')) {
      throw new ForbiddenException(
        'Administrative privilege required. Access denied.',
      );
    }

    return true;
  }
}

