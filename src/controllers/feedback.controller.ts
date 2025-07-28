import { Response, NextFunction } from 'express';
import { FeedbackRepository } from '../repositories/feedback.repository';
import { AuthRequest } from '../interfaces/auth.interface';
import mongoose from 'mongoose';
import { logger } from '../utils/logger.util';

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
      // Prevent duplicate site feedback (category: 'general')
      if (req.body.category === 'general') {
        const existing = await this.feedbackRepository.findByUserId(req.user._id.toString());
        if (existing.some(fb => fb.category === 'general')) {
          return res.status(409).json({ success: false, message: 'You have already submitted site feedback.' });
        }
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

      logger.debug('DEBUG userId:', req.user._id);
      const feedback = await this.feedbackRepository.findByUserId(req.user._id.toString());
      logger.debug('DEBUG feedback:', feedback);

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