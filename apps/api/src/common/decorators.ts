import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ROLES_KEY, IS_PUBLIC_KEY } from '@ellixr/auth';
import type { UserRole, JwtPayload } from '@ellixr/shared';

/** Marks a route as publicly accessible (bypasses the global JwtAuthGuard). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Restricts a route to the given roles (enforced by RolesGuard). */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

/** Injects the authenticated user (JWT payload) into a handler parameter. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
