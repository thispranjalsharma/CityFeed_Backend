export interface IOffer {
  _id?: string;
  outletId: string;
  title: string;
  description: string;
  discountPercentage: number;
  validFrom: Date;
  validTo: Date;
  isActive: boolean;
  isDefault: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  createdByRole?: string;
  createdByUser?: string;
}

export interface IOfferResponse extends Omit<IOffer, 'outletId'> {
  outlet: {
    _id: string;
    name: string;
    // add other outlet fields as needed
  };
} 