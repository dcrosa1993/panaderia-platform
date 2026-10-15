
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './database/prisma.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { BusinessesModule } from './modules/businesses/businesses.module.js';
import { IngredientsModule } from './modules/ingredients/ingredients.module.js';
import { MeasurementUnitsModule } from './modules/measurement-units/measurement-units.module.js';
import { ProductsModule } from './modules/products/products.module.js';
import { RecipesModule } from './modules/recipes/recipes.module.js';
import { EstimationsModule } from './modules/estimations/estimations.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    BusinessesModule,
    MeasurementUnitsModule,
    IngredientsModule,
    ProductsModule,
    RecipesModule,
    EstimationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
