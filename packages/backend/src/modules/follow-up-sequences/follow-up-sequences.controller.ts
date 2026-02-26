import { Controller, Post } from '@nestjs/common';
import { NotFoundException } from '@nestjs/common';
import { UserRoleParam } from '../../common/decorators/auth.decorator';
import { UserRole } from '@handycall/shared';
import { FollowUpSequencesService } from './follow-up-sequences.service';

@Controller('follow-up-sequences')
export class FollowUpSequencesController {
  constructor(private readonly followUps: FollowUpSequencesService) {}

  @Post('process-due')
  async processDue(@UserRoleParam() role: UserRole) {
    if (role !== UserRole.ADMIN) {
      throw new NotFoundException('Not found');
    }
    return this.followUps.processDueMessages();
  }
}

