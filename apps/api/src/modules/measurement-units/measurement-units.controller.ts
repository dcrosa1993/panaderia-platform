
import { Controller, Get, Query } from '@nestjs/common';
import { MeasurementUnitsService } from './measurement-units.service.js';

@Controller('measurement-units')
export class MeasurementUnitsController {
  constructor(
    private readonly measurementUnitsService: MeasurementUnitsService,
  ) {}

  @Get()
  findAll(@Query('dimension') dimension?: string) {
    return this.measurementUnitsService.findAll(dimension);
  }
}
