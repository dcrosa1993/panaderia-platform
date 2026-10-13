
import { Module } from '@nestjs/common';
import { MeasurementUnitsController } from './measurement-units.controller.js';
import { MeasurementUnitsService } from './measurement-units.service.js';

@Module({
  controllers: [MeasurementUnitsController],
  providers: [MeasurementUnitsService],
  exports: [MeasurementUnitsService],
})
export class MeasurementUnitsModule {}
