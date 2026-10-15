
import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { BusinessMembersController } from './business-members.controller.js';
import { BusinessMembersService } from './business-members.service.js';
import { BusinessesController } from './businesses.controller.js';
import { BusinessesService } from './businesses.service.js';

@Module({
  imports: [AuthModule],
  controllers: [
    BusinessesController,
    BusinessMembersController,
  ],
  providers: [
    BusinessesService,
    BusinessMembersService,
  ],
  exports: [
    BusinessesService,
    BusinessMembersService,
  ],
})
export class BusinessesModule {}
