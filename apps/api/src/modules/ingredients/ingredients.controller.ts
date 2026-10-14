import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import {
  CreateIngredientDto,
  CreateIngredientPriceDto,
} from './dto/create-ingredient.dto.js';
import { UpdateIngredientDto } from './dto/update-ingredient.dto.js';
import { IngredientsService } from './ingredients.service.js';

@Controller('businesses/:businessId/ingredients')
@UseGuards(JwtAuthGuard)
export class IngredientsController {
  constructor(private readonly ingredientsService: IngredientsService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessId') businessId: string,
    @Query('search') search?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.ingredientsService.findForBusiness(
      user.id,
      businessId,
      search,
      includeInactive === 'true',
    );
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessId') businessId: string,
    @Body() dto: CreateIngredientDto,
  ) {
    return this.ingredientsService.createForBusiness(user.id, businessId, dto);
  }

  @Get(':ingredientId/prices')
  findPriceHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessId') businessId: string,
    @Param('ingredientId') ingredientId: string,
  ) {
    return this.ingredientsService.findPriceHistory(
      user.id,
      businessId,
      ingredientId,
    );
  }

  @Post(':ingredientId/prices')
  addPrice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessId') businessId: string,
    @Param('ingredientId') ingredientId: string,
    @Body() dto: CreateIngredientPriceDto,
  ) {
    return this.ingredientsService.addPrice(
      user.id,
      businessId,
      ingredientId,
      dto,
    );
  }

  @Get(':ingredientId')
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessId') businessId: string,
    @Param('ingredientId') ingredientId: string,
  ) {
    return this.ingredientsService.findOneForBusiness(
      user.id,
      businessId,
      ingredientId,
    );
  }

  @Patch(':ingredientId')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessId') businessId: string,
    @Param('ingredientId') ingredientId: string,
    @Body() dto: UpdateIngredientDto,
  ) {
    return this.ingredientsService.updateForBusiness(
      user.id,
      businessId,
      ingredientId,
      dto,
    );
  }
}
