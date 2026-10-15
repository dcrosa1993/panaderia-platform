import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma, type MembershipRole } from '../../generated/prisma/client.js';
import { PrismaService } from '../../database/prisma.service.js';
import { CreateBusinessMemberDto } from './dto/create-business-member.dto.js';
import { UpdateBusinessMemberDto } from './dto/update-business-member.dto.js';

@Injectable()
export class BusinessMembersService {
  constructor(private readonly prisma: PrismaService) {}

  private async requireManager(
    userId: string,
    businessId: string,
  ): Promise<{ role: MembershipRole }> {
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_businessId: {
          userId,
          businessId,
        },
      },
      select: {
        role: true,
      },
    });

    if (!membership) {
      // No revelamos si existe un negocio al que no tiene acceso.
      throw new NotFoundException(
        'Negocio no encontrado o sin acceso autorizado.',
      );
    }

    if (membership.role !== 'OWNER' && membership.role !== 'ADMIN') {
      throw new ForbiddenException(
        'No tienes permisos para administrar los miembros de este negocio.',
      );
    }

    return membership;
  }

  async findMembers(userId: string, businessId: string) {
    await this.requireManager(userId, businessId);

    const memberships = await this.prisma.membership.findMany({
      where: {
        businessId,
      },
      orderBy: {
        createdAt: 'asc',
      },
      select: {
        id: true,
        userId: true,
        role: true,
        createdAt: true,
        user: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
    });

    return {
      members: memberships.map((membership) => ({
        id: membership.id,
        userId: membership.userId,
        fullName: membership.user.fullName,
        email: membership.user.email,
        role: membership.role,
        joinedAt: membership.createdAt,
      })),
    };
  }

  async addMember(
    userId: string,
    businessId: string,
    dto: CreateBusinessMemberDto,
  ) {
    const actor = await this.requireManager(userId, businessId);
    const requestedRole = dto.role ?? 'MEMBER';

    if (actor.role === 'ADMIN' && requestedRole !== 'MEMBER') {
      throw new ForbiddenException(
        'Los administradores solo pueden incorporar miembros.',
      );
    }

    const normalizedEmail = dto.email.trim().toLowerCase();

    const targetUser = await this.prisma.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        fullName: true,
        email: true,
      },
    });

    if (!targetUser) {
      throw new NotFoundException(
        'No existe una cuenta con ese correo. El usuario debe registrarse primero.',
      );
    }

    const existingMembership = await this.prisma.membership.findUnique({
      where: {
        userId_businessId: {
          userId: targetUser.id,
          businessId,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingMembership) {
      throw new ConflictException('Este usuario ya pertenece al negocio.');
    }

    try {
      const membership = await this.prisma.membership.create({
        data: {
          businessId,
          userId: targetUser.id,
          role: requestedRole,
        },
        select: {
          id: true,
          userId: true,
          role: true,
          createdAt: true,
          user: {
            select: {
              fullName: true,
              email: true,
            },
          },
        },
      });

      return {
        member: {
          id: membership.id,
          userId: membership.userId,
          fullName: membership.user.fullName,
          email: membership.user.email,
          role: membership.role,
          joinedAt: membership.createdAt,
        },
      };
    } catch (error: unknown) {
      if (this.isPrismaErrorCode(error, 'P2002')) {
        throw new ConflictException('Este usuario ya pertenece al negocio.');
      }

      throw error;
    }
  }

  async updateMemberRole(
    userId: string,
    businessId: string,
    membershipId: string,
    dto: UpdateBusinessMemberDto,
  ) {
    const actor = await this.requireManager(userId, businessId);

    if (actor.role !== 'OWNER') {
      throw new ForbiddenException(
        'Solo el propietario puede cambiar los roles de los miembros.',
      );
    }

    const target = await this.prisma.membership.findFirst({
      where: {
        id: membershipId,
        businessId,
      },
      select: {
        id: true,
        userId: true,
        role: true,
      },
    });

    if (!target) {
      throw new NotFoundException('No se encontró el miembro en este negocio.');
    }

    if (target.role === 'OWNER') {
      throw new BadRequestException(
        'El propietario no puede modificarse mediante la gestión normal de miembros. Utiliza una transferencia explícita de propiedad.',
      );
    }

    if (target.role === dto.role) {
      throw new BadRequestException('El usuario ya tiene asignado ese rol.');
    }

    const updated = await this.prisma.membership.update({
      where: {
        id: target.id,
      },
      data: {
        role: dto.role,
      },
      select: {
        id: true,
        userId: true,
        role: true,
        createdAt: true,
        user: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
    });

    return {
      member: {
        id: updated.id,
        userId: updated.userId,
        fullName: updated.user.fullName,
        email: updated.user.email,
        role: updated.role,
        joinedAt: updated.createdAt,
      },
    };
  }

  async removeMember(userId: string, businessId: string, membershipId: string) {
    const actor = await this.requireManager(userId, businessId);

    const target = await this.prisma.membership.findFirst({
      where: {
        id: membershipId,
        businessId,
      },
      select: {
        id: true,
        userId: true,
        role: true,
      },
    });

    if (!target) {
      throw new NotFoundException('No se encontró el miembro en este negocio.');
    }

    if (target.role === 'OWNER') {
      throw new BadRequestException(
        'No se puede retirar una membresía de propietario mediante esta operación. La transferencia de propiedad debe gestionarse explícitamente.',
      );
    }

    if (actor.role === 'ADMIN' && target.role !== 'MEMBER') {
      throw new ForbiddenException(
        'Los administradores solo pueden retirar miembros normales.',
      );
    }

    await this.prisma.membership.delete({
      where: {
        id: target.id,
      },
    });

    return {
      message: 'Se retiró el acceso al negocio correctamente.',
      membershipId: target.id,
    };
  }

  async transferOwnership(
    userId: string,
    businessId: string,
    targetMembershipId: string,
  ) {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const currentOwner = await tx.membership.findUnique({
            where: {
              userId_businessId: {
                userId,
                businessId,
              },
            },
            select: {
              id: true,
              userId: true,
              role: true,
            },
          });

          if (!currentOwner) {
            throw new NotFoundException(
              'Negocio no encontrado o sin acceso autorizado.',
            );
          }

          if (currentOwner.role !== 'OWNER') {
            throw new ForbiddenException(
              'Solo el propietario actual puede transferir la propiedad.',
            );
          }

          const ownerCount = await tx.membership.count({
            where: {
              businessId,
              role: 'OWNER',
            },
          });

          if (ownerCount !== 1) {
            throw new ConflictException(
              'No se puede transferir la propiedad porque el negocio no tiene exactamente un propietario. Revisa sus membresías.',
            );
          }

          const target = await tx.membership.findFirst({
            where: {
              id: targetMembershipId,
              businessId,
            },
            select: {
              id: true,
              userId: true,
              role: true,
              createdAt: true,
              user: {
                select: {
                  fullName: true,
                  email: true,
                },
              },
            },
          });

          if (!target) {
            throw new NotFoundException(
              'No se encontró el miembro en este negocio.',
            );
          }

          if (target.userId === userId) {
            throw new BadRequestException(
              'Ya eres el propietario de este negocio.',
            );
          }

          if (target.role === 'OWNER') {
            throw new ConflictException(
              'El usuario seleccionado ya es propietario.',
            );
          }

          // Primero se degrada al propietario actual.
          // El cambio queda invisible para otras transacciones
          // hasta que se confirme la operación completa.
          const demotion = await tx.membership.updateMany({
            where: {
              id: currentOwner.id,
              role: 'OWNER',
            },
            data: {
              role: 'ADMIN',
            },
          });

          if (demotion.count !== 1) {
            throw new ConflictException(
              'La propiedad del negocio ha cambiado. Actualiza los datos e inténtalo de nuevo.',
            );
          }

          // Solo se promueve al miembro si sigue teniendo su rol original.
          const promotion = await tx.membership.updateMany({
            where: {
              id: target.id,
              businessId,
              role: target.role,
            },
            data: {
              role: 'OWNER',
            },
          });

          if (promotion.count !== 1) {
            throw new ConflictException(
              'El rol del usuario seleccionado ha cambiado. Actualiza los datos e inténtalo de nuevo.',
            );
          }

          const newOwner = await tx.membership.findUniqueOrThrow({
            where: {
              id: target.id,
            },
            select: {
              id: true,
              userId: true,
              role: true,
              createdAt: true,
              user: {
                select: {
                  fullName: true,
                  email: true,
                },
              },
            },
          });

          return {
            message: 'La propiedad del negocio se transfirió correctamente.',
            previousOwner: {
              userId: currentOwner.userId,
              role: 'ADMIN' as const,
            },
            newOwner: {
              id: newOwner.id,
              userId: newOwner.userId,
              fullName: newOwner.user.fullName,
              email: newOwner.user.email,
              role: newOwner.role,
              joinedAt: newOwner.createdAt,
            },
          };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    } catch (error: unknown) {
      if (this.isPrismaErrorCode(error, 'P2034')) {
        throw new ConflictException(
          'La propiedad cambió durante la operación. Actualiza los miembros e inténtalo de nuevo.',
        );
      }

      throw error;
    }
  }

  private isPrismaErrorCode(error: unknown, code: string): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === code
    );
  }
}
