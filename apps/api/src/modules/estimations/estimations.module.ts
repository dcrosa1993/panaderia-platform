
import { Module } from '@nestjs/common';

import { EstimationsController } from './estimations.controller.js';
import { EstimationsService } from './estimations.service.js';

@Module({
  controllers: [EstimationsController],
  providers: [EstimationsService],
})
export class EstimationsModule {}
