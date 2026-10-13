
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CreateBusinessDto } from './dto/create-business.dto.js';
import { BusinessesService } from './businesses.service.js';

@Controller('businesses')
@UseGuards(JwtAuthGuard)
export class BusinessesController {
  constructor(
    private readonly businessesService: BusinessesService,
  ) {}

  @Get()
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.businessesService.findForUser(user.id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBusinessDto,
  ) {
    return this.businessesService.createForUser(
      user.id,
      dto.name,
    );
  }

  @Get(':businessId')
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessId') businessId: string,
  ) {
    return this.businessesService.findOneForUser(
      user.id,
      businessId,
    );
  }
}
