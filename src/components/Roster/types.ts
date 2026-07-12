
export interface ShiftEvent {
  id: number | string; // string for rb_X
  title: string;
  start: Date;
  end: Date;
  staffId?: number;
  resourceId?: number;
  staffName?: string;
  clientId: number;
  clientName: string;
  status: 'DRAFT' | 'PUBLISHED' | 'COMPLETED' | 'CANCELLED' | 'IN_PROGRESS' | 'PENDING_SYNC';
  serviceId?: number;
  serviceName?: string;
  serviceCode?: string;
  serviceRate?: number;
  serviceUnit?: string;
  serviceRatesJson?: string;
  serviceType?: string;
  fundingType?: string;
  isRespiteWrapper?: boolean;
  isRespiteChild?: boolean;
  respiteBookingId?: number;
  progressNote?: string;
  startOdometer?: string | number;
  endOdometer?: string | number;
  isHistorical?: number;
  respiteData?: any;
  notes?: string;
  servicesData?: any[];
  providerTravelKm?: number;
  providerTravelCost?: number;
  homeCareTravelKm?: number;
  homeCareTravelTotal?: number;
  abtKm?: number;
  abtCost?: number;
  transportRouteLog?: string;
  travelBreakdown?: string;
  actualStartTime?: string;
  actualFinishTime?: string;
}

