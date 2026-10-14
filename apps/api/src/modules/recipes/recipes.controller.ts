
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CreateRecipeVersionDto } from './dto/create-recipe-version.dto.js';
import { UpdateRecipeVersionDto } from './dto/update-recipe-version.dto.js';
import { ReplaceRecipeIngredientsDto } from './dto/replace-recipe-ingredients.dto.js';
import { RecipesService } from './recipes.service.js';

@Controller(
  'businesses/:businessId/products/:productId/recipe-versions',
)
@UseGuards(JwtAuthGuard)
export class RecipesController {
  constructor(
    private readonly recipesService: RecipesService,
  ) {}

  @Get()
  findVersions(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessId') businessId: string,
    @Param('productId') productId: string,
  ) {
    return this.recipesService.findVersions(
      user.id,
      businessId,
      productId,
    );
  }

  @Post()
  createDraft(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessId') businessId: string,
    @Param('productId') productId: string,
    @Body() dto: CreateRecipeVersionDto,
  ) {
    return this.recipesService.createDraft(
      user.id,
      businessId,
      productId,
      dto,
    );
  }

  @Get(':versionId')
  findVersion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessId') businessId: string,
    @Param('productId') productId: string,
    @Param('versionId') versionId: string,
  ) {
    return this.recipesService.findVersion(
      user.id,
      businessId,
      productId,
      versionId,
    );
  }

  @Patch(':versionId')
  updateDraft(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessId') businessId: string,
    @Param('productId') productId: string,
    @Param('versionId') versionId: string,
    @Body() dto: UpdateRecipeVersionDto,
  ) {
    return this.recipesService.updateDraft(
      user.id,
      businessId,
      productId,
      versionId,
      dto,
    );
  }

  @Put(':versionId/ingredients')
  replaceIngredients(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessId') businessId: string,
    @Param('productId') productId: string,
    @Param('versionId') versionId: string,
    @Body() dto: ReplaceRecipeIngredientsDto,
  ) {
    return this.recipesService.replaceIngredients(
      user.id,
      businessId,
      productId,
      versionId,
      dto,
    );
  }

  @Post(':versionId/publish')
  publish(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessId') businessId: string,
    @Param('productId') productId: string,
    @Param('versionId') versionId: string,
  ) {
    return this.recipesService.publish(
      user.id,
      businessId,
      productId,
      versionId,
    );
  }
}
