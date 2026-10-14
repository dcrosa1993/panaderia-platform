
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
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { ProductsService } from './products.service.js';

@Controller('businesses/:businessId/products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
  ) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessId') businessId: string,
    @Query('search') search?: string,
  ) {
    return this.productsService.findForBusiness(
      user.id,
      businessId,
      search,
    );
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessId') businessId: string,
    @Body() dto: CreateProductDto,
  ) {
    return this.productsService.createForBusiness(
      user.id,
      businessId,
      dto,
    );
  }

  @Get(':productId')
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessId') businessId: string,
    @Param('productId') productId: string,
  ) {
    return this.productsService.findOneForBusiness(
      user.id,
      businessId,
      productId,
    );
  }

  @Patch(':productId')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessId') businessId: string,
    @Param('productId') productId: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.updateForBusiness(
      user.id,
      businessId,
      productId,
      dto,
    );
  }
}
