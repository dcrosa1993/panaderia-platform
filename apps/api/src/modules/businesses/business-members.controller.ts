import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { BusinessMembersService } from './business-members.service.js';
import { CreateBusinessMemberDto } from './dto/create-business-member.dto.js';
import { UpdateBusinessMemberDto } from './dto/update-business-member.dto.js';

@Controller('businesses/:businessId/members')
@UseGuards(JwtAuthGuard)
export class BusinessMembersController {
  constructor(private readonly membersService: BusinessMembersService) {}

  @Get()
  findMembers(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessId') businessId: string,
  ) {
    return this.membersService.findMembers(user.id, businessId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  addMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessId') businessId: string,
    @Body() dto: CreateBusinessMemberDto,
  ) {
    return this.membersService.addMember(user.id, businessId, dto);
  }

  @Patch(':membershipId')
  updateMemberRole(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessId') businessId: string,
    @Param('membershipId') membershipId: string,
    @Body() dto: UpdateBusinessMemberDto,
  ) {
    return this.membersService.updateMemberRole(
      user.id,
      businessId,
      membershipId,
      dto,
    );
  }

  @Delete(':membershipId')
  removeMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessId') businessId: string,
    @Param('membershipId') membershipId: string,
  ) {
    return this.membersService.removeMember(user.id, businessId, membershipId);
  }

  @Post(':membershipId/transfer-ownership')
  @HttpCode(HttpStatus.OK)
  transferOwnership(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessId') businessId: string,
    @Param('membershipId') membershipId: string,
  ) {
    return this.membersService.transferOwnership(
      user.id,
      businessId,
      membershipId,
    );
  }
}
