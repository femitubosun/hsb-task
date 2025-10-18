export type CreateAvailabilityOverrideInput = {
  businessId: string;
  date: Date;
  type: 'closed' | 'modified_hours';
  startTime?: string;
  endTime?: string;
  priceModifier?: {
    type: 'percentage' | 'fixed';
    value: number;
  };
};
