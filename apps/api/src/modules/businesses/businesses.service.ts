
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';

@Injectable()
export class BusinessesService {
  constructor(private readonly prisma: PrismaService) {}

  async findForUser(userId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
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

  async createForUser(userId: string, name: string) {
    const business = await this.prisma.business.create({
      data: {
        name,
        memberships: {
          create: {
            role: 'OWNER',
            user: {
              connect: { id: userId },
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        memberships: {
          where: { userId },
          select: { role: true },
        },
      },
    });

    const membership = business.memberships[0];

    if (!membership) {
      throw new NotFoundException(
        'No se pudo confirmar la membresía del negocio.',
      );
    }

    return {
      id: business.id,
      name: business.name,
      role: membership.role,
      createdAt: business.createdAt,
    };
  }

  async findOneForUser(userId: string, businessId: string) {
    const business = await this.prisma.business.findFirst({
      where: {
        id: businessId,
        memberships: {
          some: { userId },
        },
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        memberships: {
          where: { userId },
          select: { role: true },
        },
      },
    });

    if (!business || business.memberships.length === 0) {
      // No revelamos si el negocio existe para otro usuario.
      throw new NotFoundException(
        'Negocio no encontrado o sin acceso autorizado.',
      );
    }

    return {
      id: business.id,
      name: business.name,
      role: business.memberships[0].role,
      createdAt: business.createdAt,
    };
  }

  async assertMembership(
    userId: string,
    businessId: string,
  ): Promise<void> {
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_businessId: {
          userId,
          businessId,
        },
      },
      select: { id: true },
    });

    if (!membership) {
      throw new NotFoundException(
        'Negocio no encontrado o sin acceso autorizado.',
      );
    }
  }
}
