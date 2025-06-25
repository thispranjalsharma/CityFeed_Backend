export interface IReview {
  _id?: string;
  userId: string;
  outletId: string;
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
  outlet: {
    _id: string;
    businessName: string;
  };
} 