import { Global, Module } from '@nestjs/common';
import { prisma } from '@ellixr/database';

export const PRISMA = 'PRISMA';

@Global()
@Module({
  providers: [{ provide: PRISMA, useValue: prisma }],
  exports: [PRISMA],
})
export class PrismaModule {}
