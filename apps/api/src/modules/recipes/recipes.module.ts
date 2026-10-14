
import { Module } from '@nestjs/common';
import { BusinessesModule } from '../businesses/businesses.module.js';
import { RecipesController } from './recipes.controller.js';
import { RecipesService } from './recipes.service.js';

@Module({
  imports: [BusinessesModule],
  controllers: [RecipesController],
  providers: [RecipesService],
  exports: [RecipesService],
})
export class RecipesModule {}
