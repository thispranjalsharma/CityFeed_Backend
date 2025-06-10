export interface IReview {
  _id?: string;
  userId: string;
  merchantId: string;
  dineInSessionId: string;
  rating: number;
  comment: string;
  createdAt?: Date;
}

export interface IReviewResponse extends IReview {
  user: {
    _id: string;
    name: string;
  };
  merchant: {
    _id: string;
    businessName: string;
  };
} 