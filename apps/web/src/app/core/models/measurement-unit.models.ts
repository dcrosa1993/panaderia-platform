
export type MeasurementDimension = 'MASS' | 'VOLUME' | 'COUNT';

export interface MeasurementUnit {
  id: string;
  code: string;
  name: string;
  symbol: string;
  dimension: MeasurementDimension;
  factorToBase: string;
  isBase: boolean;
}
