
import type { MeasurementUnit } from './measurement-unit.models';

export interface Product {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  productionUnit: MeasurementUnit;
  targetFinishedWeight: string | null;
  targetWeightUnit: MeasurementUnit | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductRequest {
  name: string;
  description?: string | null;
  productionUnitId: string;
  targetFinishedWeight?: string;
  targetWeightUnitId?: string;
}

export interface UpdateProductRequest {
  name?: string;
  description?: string | null;
  productionUnitId?: string;
  targetFinishedWeight?: string | null;
  targetWeightUnitId?: string | null;
  isActive?: boolean;
}
