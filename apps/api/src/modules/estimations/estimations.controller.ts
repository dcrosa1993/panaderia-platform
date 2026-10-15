
import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import { CreateEstimationDto } from './dto/create-estimation.dto.js';
import { EstimationsService } from './estimations.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';

interface AuthenticatedRequest {
  user?: {
    sub?: string;
    userId?: string;
    id?: string;
  };
}

@Controller('businesses/:businessId/estimations')
@UseGuards(JwtAuthGuard)
export class EstimationsController {
  constructor(
    private readonly estimationsService: EstimationsService,
  ) {}

  private getUserId(request: AuthenticatedRequest): string {
    const userId =
      request.user?.userId ??
      request.user?.sub ??
      request.user?.id;

    if (!userId) {
      throw new UnauthorizedException(
        'No se pudo identificar al usuario autenticado.',
      );
    }

    return userId;
  }

  @Get()
  findAll(
    @Param('businessId') businessId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.estimationsService.findAll(
      businessId,
      this.getUserId(request),
    );
  }

  @Post()
  create(
    @Param('businessId') businessId: string,
    @Body() dto: CreateEstimationDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.estimationsService.create(
      businessId,
      this.getUserId(request),
      dto,
    );
  }

  @Get(':estimationId')
  findOne(
    @Param('businessId') businessId: string,
    @Param('estimationId') estimationId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.estimationsService.findOne(
      businessId,
      this.getUserId(request),
      estimationId,
    );
  }
}
