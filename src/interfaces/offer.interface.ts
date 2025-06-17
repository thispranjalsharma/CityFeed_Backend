export interface IOffer {
  _id?: string;
  merchantId: string;
  title: string;
  description: string;
  discountPercentage: number;
  validFrom: Date;
  validTo: Date;
  isActive: boolean;
  isDefault: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IOfferResponse extends Omit<IOffer, 'merchantId'> {
  merchant: {
    _id: string;
    businessName: string;
    businessType: 'cafe' | 'restaurant' | 'bar' | 'shop' | 'service' | 'other';
  };
} 