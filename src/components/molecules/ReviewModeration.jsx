import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { reviewService } from '@/services/api/reviewService';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import ApperIcon from '@/components/ApperIcon';
import Loading from '@/components/ui/Loading';
import Empty from '@/components/ui/Empty';

const ReviewModeration = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(new Set());
  const [filters, setFilters] = useState({
    spamLevel: 'all',
    productId: '',
    dateFrom: '',
    dateTo: ''
  });
  const [selectedReviews, setSelectedReviews] = useState(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [moderationModal, setModerationModal] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    loadPendingReviews();
  }, [filters]);

  const loadPendingReviews = async () => {
    try {
      setLoading(true);
      const pendingReviews = await reviewService.getPendingReviews(filters);
      setReviews(pendingReviews);
    } catch (error) {
      console.error('Error loading pending reviews:', error);
      toast.error('Failed to load pending reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleSingleAction = async (reviewId, action, reason = '') => {
    if (processing.has(reviewId)) return;

    try {
      setProcessing(prev => new Set([...prev, reviewId]));
      
      await reviewService.updateStatus(reviewId, action, {
        moderatorId: 'admin',
        reason
      });

      setReviews(prev => prev.filter(r => r.Id !== reviewId));
      
      toast.success(`Review ${action === 'approved' ? 'approved' : 'rejected'} successfully`);
      
      if (moderationModal?.reviewId === reviewId) {
        setModerationModal(null);
        setRejectionReason('');
      }

    } catch (error) {
      console.error(`Error ${action} review:`, error);
      toast.error(`Failed to ${action} review`);
    } finally {
      setProcessing(prev => {
        const newSet = new Set(prev);
        newSet.delete(reviewId);
        return newSet;
      });
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedReviews.size === 0) return;

    const reviewIds = Array.from(selectedReviews);
    const reason = action === 'reject' ? rejectionReason : '';

    if (action === 'reject' && !reason.trim()) {
      toast.error('Rejection reason is required for bulk rejection');
      return;
    }

    try {
      setLoading(true);
      
      const promises = reviewIds.map(reviewId =>
        reviewService.updateStatus(reviewId, action === 'approve' ? 'approved' : 'rejected', {
          moderatorId: 'admin',
          reason
        })
      );

      await Promise.all(promises);
      
      setReviews(prev => prev.filter(r => !selectedReviews.has(r.Id)));
      setSelectedReviews(new Set());
      setShowBulkActions(false);
      setRejectionReason('');
      
      toast.success(`${reviewIds.length} reviews ${action === 'approve' ? 'approved' : 'rejected'} successfully`);

    } catch (error) {
      console.error(`Error in bulk ${action}:`, error);
      toast.error(`Failed to ${action} selected reviews`);
    } finally {
      setLoading(false);
    }
  };

  const toggleReviewSelection = (reviewId) => {
    setSelectedReviews(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reviewId)) {
        newSet.delete(reviewId);
      } else {
        newSet.add(reviewId);
      }
      return newSet;
    });
  };

  const selectAllReviews = () => {
    if (selectedReviews.size === reviews.length) {
      setSelectedReviews(new Set());
    } else {
      setSelectedReviews(new Set(reviews.map(r => r.Id)));
    }
  };

  const getSpamLevelBadge = (score) => {
    if (score >= 0.7) return { variant: 'error', label: 'High Risk' };
    if (score >= 0.4) return { variant: 'warning', label: 'Medium Risk' };
    return { variant: 'success', label: 'Low Risk' };
  };

  const StarRating = ({ rating }) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <ApperIcon
            key={star}
            name="Star"
            size={16}
            className={`${
              star <= rating
                ? 'text-yellow-400 fill-current'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading && reviews.length === 0) {
    return <Loading type="component" />;
  }

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="bg-white rounded-lg p-6 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <ApperIcon name="Shield" size={24} className="text-primary" />
            <h2 className="text-xl font-semibold">Review Moderation</h2>
            <Badge variant="warning">{reviews.length} Pending</Badge>
          </div>
          
          {selectedReviews.size > 0 && (
            <Button
              variant="secondary"
              onClick={() => setShowBulkActions(!showBulkActions)}
              className="flex items-center space-x-2"
            >
              <ApperIcon name="CheckSquare" size={16} />
              <span>Bulk Actions ({selectedReviews.size})</span>
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Spam Level
            </label>
            <select
              value={filters.spamLevel}
              onChange={(e) => setFilters(prev => ({ ...prev, spamLevel: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
            >
              <option value="all">All Levels</option>
              <option value="high">High Risk (70%+)</option>
              <option value="medium">Medium Risk (40%+)</option>
              <option value="low">Low Risk (&lt;40%)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product ID
            </label>
            <Input
              type="number"
              value={filters.productId}
              onChange={(e) => setFilters(prev => ({ ...prev, productId: e.target.value }))}
              placeholder="Filter by product"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date From
            </label>
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date To
            </label>
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
            />
          </div>
        </div>

        {/* Bulk Actions Panel */}
        {showBulkActions && selectedReviews.size > 0 && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-blue-900">
                Bulk Actions ({selectedReviews.size} selected)
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBulkActions(false)}
              >
                <ApperIcon name="X" size={16} />
              </Button>
            </div>
            
            <div className="space-y-3">
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Rejection reason (required for rejection)..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
              />
              
              <div className="flex items-center space-x-3">
                <Button
                  variant="success"
                  onClick={() => handleBulkAction('approve')}
                  disabled={loading}
                  className="flex items-center space-x-2"
                >
                  <ApperIcon name="Check" size={16} />
                  <span>Approve All</span>
                </Button>
                
                <Button
                  variant="error"
                  onClick={() => handleBulkAction('reject')}
                  disabled={loading || !rejectionReason.trim()}
                  className="flex items-center space-x-2"
                >
                  <ApperIcon name="X" size={16} />
                  <span>Reject All</span>
                </Button>
                
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSelectedReviews(new Set());
                    setShowBulkActions(false);
                    setRejectionReason('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Select All */}
        {reviews.length > 0 && (
          <div className="flex items-center space-x-2 pt-3 border-t border-gray-200">
            <button
              onClick={selectAllReviews}
              className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <div className={`w-4 h-4 border-2 rounded ${
                selectedReviews.size === reviews.length
                  ? 'bg-primary border-primary'
                  : 'border-gray-300'
              } flex items-center justify-center`}>
                {selectedReviews.size === reviews.length && (
                  <ApperIcon name="Check" size={10} className="text-white" />
                )}
              </div>
              <span>
                {selectedReviews.size === reviews.length ? 'Deselect All' : 'Select All'}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <Empty
          icon="CheckCircle"
          title="No Pending Reviews"
          description="All reviews have been moderated. Great job!"
        />
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.Id} className="bg-white rounded-lg p-6 shadow-card">
              <div className="flex items-start space-x-4">
                {/* Selection Checkbox */}
                <div className="flex-shrink-0 pt-1">
                  <button
                    onClick={() => toggleReviewSelection(review.Id)}
                    className="w-5 h-5 border-2 rounded border-gray-300 flex items-center justify-center hover:border-primary"
                  >
                    {selectedReviews.has(review.Id) && (
                      <ApperIcon name="Check" size={12} className="text-primary" />
                    )}
                  </button>
                </div>

                <div className="flex-1">
                  {/* Review Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-white font-semibold">
                        {review.customerName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{review.customerName}</h4>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <span>{format(new Date(review.createdAt), 'MMM dd, yyyy HH:mm')}</span>
                          <span>•</span>
                          <span>Product ID: {review.productId}</span>
                          <span>•</span>
                          <span>Order: #{review.orderId}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <StarRating rating={review.rating} />
                      <Badge {...getSpamLevelBadge(review.spamScore)}>
                        {getSpamLevelBadge(review.spamScore).label}
                      </Badge>
                    </div>
                  </div>

                  {/* Review Content */}
                  <div className="mb-4">
                    <h5 className="font-medium text-gray-900 mb-2">{review.title}</h5>
                    <p className="text-gray-700 text-sm leading-relaxed">{review.comment}</p>
                  </div>

                  {/* Spam Analysis */}
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h6 className="text-sm font-medium text-gray-700">Spam Analysis</h6>
                      <span className="text-sm text-gray-600">
                        Score: {(review.spamScore * 100).toFixed(0)}%
                      </span>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          review.spamScore >= 0.7 ? 'bg-red-500' :
                          review.spamScore >= 0.4 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${review.spamScore * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    <div className="flex items-center space-x-3">
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => handleSingleAction(review.Id, 'approved')}
                        disabled={processing.has(review.Id)}
                        className="flex items-center space-x-2"
                      >
                        {processing.has(review.Id) ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <ApperIcon name="Check" size={16} />
                        )}
                        <span>Approve</span>
                      </Button>
                      
                      <Button
                        variant="error"
                        size="sm"
                        onClick={() => setModerationModal({ 
                          reviewId: review.Id, 
                          action: 'reject',
                          reviewTitle: review.title 
                        })}
                        disabled={processing.has(review.Id)}
                        className="flex items-center space-x-2"
                      >
                        <ApperIcon name="X" size={16} />
                        <span>Reject</span>
                      </Button>
                    </div>

                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <ApperIcon name="ShieldCheck" size={12} />
                      <span>Verified Purchase</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rejection Modal */}
      {moderationModal && moderationModal.action === 'reject' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center space-x-3 mb-4">
              <ApperIcon name="AlertTriangle" size={24} className="text-red-600" />
              <h3 className="text-lg font-semibold">Reject Review</h3>
            </div>
            
            <p className="text-gray-600 mb-4">
              Are you sure you want to reject the review "{moderationModal.reviewTitle}"?
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rejection Reason *
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please provide a reason for rejection..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
              />
            </div>
            
            <div className="flex items-center justify-end space-x-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setModerationModal(null);
                  setRejectionReason('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="error"
                onClick={() => handleSingleAction(
                  moderationModal.reviewId, 
                  'rejected', 
                  rejectionReason
                )}
                disabled={!rejectionReason.trim() || processing.has(moderationModal.reviewId)}
              >
                {processing.has(moderationModal.reviewId) ? 'Rejecting...' : 'Reject Review'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewModeration;