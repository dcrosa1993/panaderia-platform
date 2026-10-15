
import { IsIn } from 'class-validator';

export class UpdateBusinessMemberDto {
  @IsIn(['ADMIN', 'MEMBER'])
  role!: 'ADMIN' | 'MEMBER';
}
