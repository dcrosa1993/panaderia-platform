
import { Module } from '@nestjs/common';
import { BusinessesModule } from '../businesses/businesses.module.js';
import { IngredientsController } from './ingredients.controller.js';
import { IngredientsService } from './ingredients.service.js';

@Module({
  imports: [BusinessesModule],
  controllers: [IngredientsController],
  providers: [IngredientsService],
  exports: [IngredientsService],
})
export class IngredientsModule {}
