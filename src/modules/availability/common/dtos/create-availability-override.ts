export type CreateAvailabilityOverrideInput = {
  businessId: string;
  date: string;
  type: 'closed' | 'modified_hours';
  startTime?: string;
  endTime?: string;
  priceModifier?: {
    type: 'percentage' | 'fixed';
    value: number;
  };
};
