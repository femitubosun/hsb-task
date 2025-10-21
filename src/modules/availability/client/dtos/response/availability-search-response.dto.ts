export class AvailabilitySlotDto {
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
}

export class ServiceInfoDto {
  _id: string;
  businessId: string;
  name: string;
  duration: number;
  price: number;
  bufferBefore: number;
  bufferAfter: number;
}

export class AvailabilitySearchResponseDto {
  service: ServiceInfoDto;
  availableSlots: AvailabilitySlotDto[];
}
