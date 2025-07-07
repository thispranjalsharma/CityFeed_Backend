import { Response, NextFunction } from 'express';
import { FeedbackRepository } from '../repositories/feedback.repository';
import { AuthRequest } from '../interfaces/auth.interface';
import mongoose from 'mongoose';

export class FeedbackController {
  private feedbackRepository: FeedbackRepository;

  constructor() {
    this.feedbackRepository = new FeedbackRepository();
  }

  createFeedback = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const feedback = await this.feedbackRepository.create({
        userId: new mongoose.Types.ObjectId(req.user._id),
        category: req.body.category,
        description: req.body.description
      });

      res.status(201).json({
        success: true,
        data: feedback,
        message: 'Feedback submitted successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  getUserFeedback = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      console.log('DEBUG userId:', req.user._id);
      const feedback = await this.feedbackRepository.findByUserId(req.user._id.toString());
      console.log('DEBUG feedback:', feedback);

      res.status(200).json({
        success: true,
        data: feedback,
        message: 'Feedback retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  getAllFeedback = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Admins only' });
      }
      const feedback = await this.feedbackRepository.findAll();
      res.status(200).json({
        success: true,
        data: feedback,
        message: 'All feedback retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  };
} 