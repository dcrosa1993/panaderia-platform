
export type BusinessMemberRole = 'OWNER' | 'ADMIN' | 'MEMBER';
export type AssignableBusinessMemberRole = 'ADMIN' | 'MEMBER';

export interface BusinessMember {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  role: BusinessMemberRole;
  joinedAt: string;
}

export interface BusinessMembersResponse {
  members: BusinessMember[];
}

export interface CreateBusinessMemberRequest {
  email: string;
  role?: AssignableBusinessMemberRole;
}

export interface BusinessMemberResponse {
  member: BusinessMember;
}

export interface UpdateBusinessMemberRoleRequest {
  role: AssignableBusinessMemberRole;
}

export interface RemoveBusinessMemberResponse {
  message: string;
  membershipId: string;
}

export interface TransferOwnershipResponse {
  message: string;
  previousOwner: {
    userId: string;
    role: 'ADMIN';
  };
  newOwner: BusinessMember;
}
