import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { reviewService } from '@/services/api/reviewService';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import ApperIcon from '@/components/ApperIcon';
import Loading from '@/components/ui/Loading';
import Empty from '@/components/ui/Empty';

const ReviewList = ({ productId, showAll = false, limit = 5 }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    loadReviews(true);
    loadStats();
  }, [productId]);

  const loadReviews = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setOffset(0);
      } else {
        setLoadingMore(true);
      }

      const currentOffset = reset ? 0 : offset;
      const response = await reviewService.getByProductId(productId, {
        status: showAll ? 'all' : 'approved',
        limit,
        offset: currentOffset
      });

      if (reset) {
        setReviews(response.reviews);
      } else {
        setReviews(prev => [...prev, ...response.reviews]);
      }

      setHasMore(response.hasMore);
      setOffset(currentOffset + limit);

    } catch (error) {
      console.error('Error loading reviews:', error);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadStats = async () => {
    try {
      const reviewStats = await reviewService.getReviewStats(productId);
      setStats(reviewStats);
    } catch (error) {
      console.error('Error loading review stats:', error);
    }
  };

  const handleHelpfulness = async (reviewId, isHelpful) => {
    try {
      await reviewService.updateHelpfulness(reviewId, isHelpful);
      
      // Update local state
      setReviews(prev => prev.map(review => 
        review.Id === reviewId
          ? {
              ...review,
              helpful: isHelpful ? review.helpful + 1 : review.helpful,
              notHelpful: !isHelpful ? review.notHelpful + 1 : review.notHelpful
            }
          : review
      ));

      toast.success('Thank you for your feedback!');
    } catch (error) {
      console.error('Error updating helpfulness:', error);
      toast.error('Failed to record your feedback');
    }
  };

  const StarRating = ({ rating, size = 16 }) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <ApperIcon
            key={star}
            name="Star"
            size={size}
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

  const ReviewSummary = () => {
    if (!stats || stats.approved === 0) return null;

    return (
      <div className="bg-white rounded-lg p-6 shadow-card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Customer Reviews</h3>
          <div className="flex items-center space-x-2">
            <StarRating rating={Math.round(stats.averageRating)} size={20} />
            <span className="text-lg font-semibold">{stats.averageRating}</span>
            <span className="text-sm text-gray-600">({stats.approved} reviews)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Rating Distribution */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Rating Distribution</h4>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = stats.ratingDistribution[rating] || 0;
                const percentage = stats.approved > 0 ? (count / stats.approved) * 100 : 0;
                
                return (
                  <div key={rating} className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1 w-16">
                      <span className="text-sm">{rating}</span>
                      <ApperIcon name="Star" size={12} className="text-yellow-400 fill-current" />
                    </div>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 w-8">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Review Stats */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Review Statistics</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Reviews</span>
                <Badge variant="secondary">{stats.total}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Published</span>
                <Badge variant="success">{stats.approved}</Badge>
              </div>
              {showAll && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Pending</span>
                    <Badge variant="warning">{stats.pending}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Rejected</span>
                    <Badge variant="error">{stats.rejected}</Badge>
                  </div>
                </>
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Helpful Votes</span>
                <span className="text-sm font-medium">{stats.totalHelpful}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const ReviewCard = ({ review }) => {
    const getStatusBadge = (status) => {
      const badges = {
        approved: { variant: 'success', label: 'Published' },
        pending: { variant: 'warning', label: 'Pending' },
        rejected: { variant: 'error', label: 'Rejected' }
      };
      return badges[status] || badges.approved;
    };

    return (
      <div className="bg-white rounded-lg p-6 shadow-card hover:shadow-premium transition-shadow duration-300">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-white font-semibold">
              {review.customerName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h4 className="font-medium text-gray-900">{review.customerName}</h4>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span>{format(new Date(review.createdAt), 'MMM dd, yyyy')}</span>
                {review.isVerifiedPurchase && (
                  <div className="flex items-center space-x-1 text-green-600">
                    <ApperIcon name="ShieldCheck" size={12} />
                    <span>Verified</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <StarRating rating={review.rating} />
            {showAll && (
              <Badge {...getStatusBadge(review.status)}>
                {getStatusBadge(review.status).label}
              </Badge>
            )}
          </div>
        </div>

        <div className="mb-4">
          <h5 className="font-medium text-gray-900 mb-2">{review.title}</h5>
          <p className="text-gray-700 text-sm leading-relaxed">{review.comment}</p>
        </div>

        {review.status === 'rejected' && review.rejectionReason && showAll && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <ApperIcon name="AlertCircle" size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800">Rejected</p>
                <p className="text-xs text-red-700">{review.rejectionReason}</p>
              </div>
            </div>
          </div>
        )}

        {review.status === 'pending' && showAll && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <ApperIcon name="Clock" size={16} className="text-yellow-600" />
              <p className="text-sm text-yellow-800">Your review is pending approval</p>
            </div>
          </div>
        )}

        {review.status === 'approved' && (
          <div className="flex items-center justify-between pt-3 border-t border-gray-200">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Was this helpful?</span>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleHelpfulness(review.Id, true)}
                  className="flex items-center space-x-1 text-gray-600 hover:text-green-600"
                >
                  <ApperIcon name="ThumbsUp" size={14} />
                  <span>Yes ({review.helpful})</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleHelpfulness(review.Id, false)}
                  className="flex items-center space-x-1 text-gray-600 hover:text-red-600"
                >
                  <ApperIcon name="ThumbsDown" size={14} />
                  <span>No ({review.notHelpful})</span>
                </Button>
              </div>
            </div>
            
            {showAll && review.spamScore > 0.5 && (
              <div className="flex items-center space-x-1 text-xs text-orange-600">
                <ApperIcon name="AlertTriangle" size={12} />
                <span>Spam Score: {(review.spamScore * 100).toFixed(0)}%</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <Loading type="component" />;
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8">
        {stats && <ReviewSummary />}
        <Empty
          icon="MessageSquare"
          title="No Reviews Yet"
          description="Be the first to review this product and help other customers."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ReviewSummary />
      
      <div className="space-y-4">
        {reviews.map((review) => (
          <ReviewCard key={review.Id} review={review} />
        ))}
      </div>

      {hasMore && (
        <div className="text-center">
          <Button
            variant="secondary"
            onClick={() => loadReviews(false)}
            disabled={loadingMore}
            className="px-8"
          >
            {loadingMore ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                <span>Loading...</span>
              </div>
            ) : (
              `Load More Reviews`
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ReviewList;