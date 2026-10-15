import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import type {
  BusinessMemberResponse,
  BusinessMembersResponse,
  CreateBusinessMemberRequest,
  RemoveBusinessMemberResponse,
  TransferOwnershipResponse,
  UpdateBusinessMemberRoleRequest,
} from '../models/business-member.models';

@Injectable({
  providedIn: 'root',
})
export class BusinessMembersService {
  private readonly baseUrl = `${environment.apiUrl}/businesses`;

  constructor(private readonly http: HttpClient) {}

  getMembers(businessId: string): Observable<BusinessMembersResponse> {
    return this.http.get<BusinessMembersResponse>(`${this.businessUrl(businessId)}/members`);
  }

  addMember(
    businessId: string,
    request: CreateBusinessMemberRequest,
  ): Observable<BusinessMemberResponse> {
    return this.http.post<BusinessMemberResponse>(
      `${this.businessUrl(businessId)}/members`,
      request,
    );
  }

  updateRole(
    businessId: string,
    membershipId: string,
    request: UpdateBusinessMemberRoleRequest,
  ): Observable<BusinessMemberResponse> {
    return this.http.patch<BusinessMemberResponse>(
      `${this.businessUrl(businessId)}/members/${encodeURIComponent(membershipId)}`,
      request,
    );
  }

  removeMember(businessId: string, membershipId: string): Observable<RemoveBusinessMemberResponse> {
    return this.http.delete<RemoveBusinessMemberResponse>(
      `${this.businessUrl(businessId)}/members/${encodeURIComponent(membershipId)}`,
    );
  }

  transferOwnership(
    businessId: string,
    membershipId: string,
  ): Observable<TransferOwnershipResponse> {
    return this.http.post<TransferOwnershipResponse>(
      `${this.businessUrl(businessId)}/members/${encodeURIComponent(membershipId)}/transfer-ownership`,
      {},
    );
  }

  private businessUrl(businessId: string): string {
    return `${this.baseUrl}/${encodeURIComponent(businessId)}`;
  }
}
