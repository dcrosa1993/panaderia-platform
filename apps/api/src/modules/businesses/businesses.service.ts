
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';

@Injectable()
export class BusinessesService {
  constructor(private readonly prisma: PrismaService) {}

  async findForUser(userId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'asc',
      },
      select: {
        role: true,
        createdAt: true,
        business: {
          select: {
            id: true,
            name: true,
            createdAt: true,
          },
        },
      },
    });

    return {
      businesses: memberships.map((membership) => ({
        ...membership.business,
        role: membership.role,
        joinedAt: membership.createdAt,
      })),
    };
  }
}
