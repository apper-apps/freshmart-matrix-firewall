import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { reviewService } from '@/services/api/reviewService';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import ApperIcon from '@/components/ApperIcon';

const ReviewForm = ({ productId, customerId, onReviewSubmitted }) => {
  const [eligibility, setEligibility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    rating: 0,
    title: '',
    comment: '',
    orderId: ''
  });

  useEffect(() => {
    checkEligibility();
  }, [productId, customerId]);

  const checkEligibility = async () => {
    try {
      setLoading(true);
      const result = await reviewService.checkReviewEligibility(customerId, productId);
      setEligibility(result);
      
      if (result.eligible && result.orderIds.length > 0) {
        setFormData(prev => ({ ...prev, orderId: result.orderIds[0] }));
      }
    } catch (error) {
      console.error('Error checking eligibility:', error);
      toast.error('Failed to check review eligibility');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.rating || !formData.title.trim() || !formData.comment.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.comment.length < 10) {
      toast.error('Review comment must be at least 10 characters long');
      return;
    }

    try {
      setSubmitting(true);
      
      const reviewData = {
        productId,
        customerId,
        orderId: formData.orderId,
        rating: formData.rating,
        title: formData.title,
        comment: formData.comment
      };

      await reviewService.create(reviewData);
      
      toast.success('Thanks! Your review is pending approval and will be published soon.');
      
      // Reset form
      setFormData({
        rating: 0,
        title: '',
        comment: '',
        orderId: formData.orderId
      });

      if (onReviewSubmitted) {
        onReviewSubmitted();
      }

    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error(error.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const StarRating = ({ rating, onRatingChange, disabled = false }) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onRatingChange(star)}
            className={`p-1 transition-colors duration-200 ${
              disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-110'
            }`}
          >
            <ApperIcon
              name="Star"
              size={24}
              className={`${
                star <= rating
                  ? 'text-yellow-400 fill-current'
                  : 'text-gray-300'
              } transition-colors duration-200`}
            />
          </button>
        ))}
        <span className="ml-2 text-sm text-gray-600">
          {rating > 0 ? `${rating} star${rating !== 1 ? 's' : ''}` : 'Select rating'}
        </span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-card">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (!eligibility?.eligible) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-card">
        <div className="flex items-center space-x-3 text-gray-600">
          <ApperIcon name="Info" size={20} className="text-info flex-shrink-0" />
          <div>
            <h3 className="font-medium text-gray-900 mb-1">Cannot Write Review</h3>
            <p className="text-sm">
              {eligibility?.reason === 'no_purchase' && 
                'You must purchase and receive this product before writing a review.'
              }
              {eligibility?.reason === 'already_reviewed' && 
                'You have already reviewed this product.'
              }
            </p>
            {eligibility?.existingReview && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  Your review "{eligibility.existingReview.title}" is {eligibility.existingReview.status}.
                  {eligibility.existingReview.status === 'pending' && ' It will be published after moderation.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow-card">
      <div className="flex items-center space-x-2 mb-4">
        <ApperIcon name="Edit" size={20} className="text-primary" />
        <h3 className="text-lg font-semibold">Write a Review</h3>
        <div className="flex items-center space-x-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
          <ApperIcon name="ShieldCheck" size={12} />
          <span>Verified Purchase</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rating *
          </label>
          <StarRating
            rating={formData.rating}
            onRatingChange={(rating) => setFormData(prev => ({ ...prev, rating }))}
            disabled={submitting}
          />
        </div>

        <div>
          <label htmlFor="review-title" className="block text-sm font-medium text-gray-700 mb-2">
            Review Title *
          </label>
          <Input
            id="review-title"
            type="text"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Summarize your experience..."
            maxLength={100}
            disabled={submitting}
            className="w-full"
          />
          <div className="text-xs text-gray-500 mt-1">
            {formData.title.length}/100 characters
          </div>
        </div>

        <div>
          <label htmlFor="review-comment" className="block text-sm font-medium text-gray-700 mb-2">
            Review Comment *
          </label>
          <textarea
            id="review-comment"
            value={formData.comment}
            onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
            placeholder="Share your detailed experience with this product..."
            rows={4}
            maxLength={1000}
            disabled={submitting}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-colors duration-200 resize-none"
          />
          <div className="text-xs text-gray-500 mt-1 flex justify-between">
            <span>Minimum 10 characters</span>
            <span>{formData.comment.length}/1000 characters</span>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setFormData({ rating: 0, title: '', comment: '', orderId: formData.orderId })}
            disabled={submitting}
            className="px-6"
          >
            Clear
          </Button>
          <Button
            type="submit"
            disabled={submitting || !formData.rating || !formData.title.trim() || !formData.comment.trim()}
            className="px-6"
          >
            {submitting ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Submitting...</span>
              </div>
            ) : (
              'Submit Review'
            )}
          </Button>
        </div>
      </form>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <div className="flex items-start space-x-2">
          <ApperIcon name="Info" size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Review Guidelines</p>
            <ul className="text-xs space-y-1 list-disc list-inside">
              <li>Be honest and constructive in your feedback</li>
              <li>Focus on the product quality, delivery, and experience</li>
              <li>Reviews are moderated and may take 24-48 hours to appear</li>
              <li>Inappropriate content will be rejected</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewForm;