import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { reviewService } from '@/services/api/reviewService';

// Async thunks
export const fetchReviews = createAsyncThunk(
  'reviews/fetchReviews',
  async ({ productId, options = {} }, { rejectWithValue }) => {
    try {
      const response = await reviewService.getByProductId(productId, options);
      return { productId, ...response };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchReviewStats = createAsyncThunk(
  'reviews/fetchStats',
  async (productId, { rejectWithValue }) => {
    try {
      const stats = await reviewService.getReviewStats(productId);
      return { productId, stats };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const submitReview = createAsyncThunk(
  'reviews/submitReview',
  async (reviewData, { rejectWithValue }) => {
    try {
      const review = await reviewService.create(reviewData);
      return review;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const moderateReview = createAsyncThunk(
  'reviews/moderateReview',
  async ({ reviewId, status, moderatorData }, { rejectWithValue }) => {
    try {
      const review = await reviewService.updateStatus(reviewId, status, moderatorData);
      return review;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchPendingReviews = createAsyncThunk(
  'reviews/fetchPending',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const reviews = await reviewService.getPendingReviews(filters);
      return reviews;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateHelpfulness = createAsyncThunk(
  'reviews/updateHelpfulness',
  async ({ reviewId, isHelpful }, { rejectWithValue }) => {
    try {
      const review = await reviewService.updateHelpfulness(reviewId, isHelpful);
      return review;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  // Reviews by product ID
  reviewsByProduct: {},
  
  // Review statistics by product ID
  statsByProduct: {},
  
  // Pending reviews for moderation
  pendingReviews: [],
  
  // Loading states
  loading: {
    reviews: false,
    stats: false,
    pending: false,
    submitting: false,
    moderating: false
  },
  
  // Error states
  errors: {
    reviews: null,
    stats: null,
    pending: null,
    submit: null,
    moderate: null
  },
  
  // UI state
  filters: {
    spamLevel: 'all',
    productId: '',
    dateFrom: '',
    dateTo: ''
  },
  
  // Pagination
  pagination: {
    hasMore: false,
    offset: 0,
    limit: 10
  }
};

const reviewSlice = createSlice({
  name: 'reviews',
  initialState,
  reducers: {
    clearError: (state, action) => {
      const { errorType } = action.payload;
      if (errorType && state.errors[errorType]) {
        state.errors[errorType] = null;
      }
    },
    
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    
    resetReviews: (state, action) => {
      const { productId } = action.payload;
      if (productId) {
        delete state.reviewsByProduct[productId];
        delete state.statsByProduct[productId];
      } else {
        state.reviewsByProduct = {};
        state.statsByProduct = {};
      }
    },
    
    clearPendingReviews: (state) => {
      state.pendingReviews = [];
    },
    
    updateReviewInList: (state, action) => {
      const { productId, reviewId, updates } = action.payload;
      
      if (state.reviewsByProduct[productId]) {
        const reviewIndex = state.reviewsByProduct[productId].reviews.findIndex(
          r => r.Id === reviewId
        );
        if (reviewIndex !== -1) {
          state.reviewsByProduct[productId].reviews[reviewIndex] = {
            ...state.reviewsByProduct[productId].reviews[reviewIndex],
            ...updates
          };
        }
      }
      
      // Also update in pending reviews
      const pendingIndex = state.pendingReviews.findIndex(r => r.Id === reviewId);
      if (pendingIndex !== -1) {
        if (updates.status && updates.status !== 'pending') {
          // Remove from pending if no longer pending
          state.pendingReviews.splice(pendingIndex, 1);
        } else {
          state.pendingReviews[pendingIndex] = {
            ...state.pendingReviews[pendingIndex],
            ...updates
          };
        }
      }
    }
  },
  
  extraReducers: (builder) => {
    // Fetch Reviews
    builder
      .addCase(fetchReviews.pending, (state) => {
        state.loading.reviews = true;
        state.errors.reviews = null;
      })
      .addCase(fetchReviews.fulfilled, (state, action) => {
        const { productId, reviews, total, hasMore } = action.payload;
        state.loading.reviews = false;
        state.reviewsByProduct[productId] = {
          reviews,
          total,
          hasMore,
          lastUpdated: Date.now()
        };
      })
      .addCase(fetchReviews.rejected, (state, action) => {
        state.loading.reviews = false;
        state.errors.reviews = action.payload;
      });

    // Fetch Review Stats
    builder
      .addCase(fetchReviewStats.pending, (state) => {
        state.loading.stats = true;
        state.errors.stats = null;
      })
      .addCase(fetchReviewStats.fulfilled, (state, action) => {
        const { productId, stats } = action.payload;
        state.loading.stats = false;
        state.statsByProduct[productId] = {
          ...stats,
          lastUpdated: Date.now()
        };
      })
      .addCase(fetchReviewStats.rejected, (state, action) => {
        state.loading.stats = false;
        state.errors.stats = action.payload;
      });

    // Submit Review
    builder
      .addCase(submitReview.pending, (state) => {
        state.loading.submitting = true;
        state.errors.submit = null;
      })
      .addCase(submitReview.fulfilled, (state, action) => {
        state.loading.submitting = false;
        const review = action.payload;
        
        // Add to pending reviews if it's pending
        if (review.status === 'pending') {
          state.pendingReviews.unshift(review);
        }
        
        // Update product reviews if approved
        if (review.status === 'approved' && state.reviewsByProduct[review.productId]) {
          state.reviewsByProduct[review.productId].reviews.unshift(review);
          state.reviewsByProduct[review.productId].total += 1;
        }
      })
      .addCase(submitReview.rejected, (state, action) => {
        state.loading.submitting = false;
        state.errors.submit = action.payload;
      });

    // Moderate Review
    builder
      .addCase(moderateReview.pending, (state) => {
        state.loading.moderating = true;
        state.errors.moderate = null;
      })
      .addCase(moderateReview.fulfilled, (state, action) => {
        state.loading.moderating = false;
        const review = action.payload;
        
        // Remove from pending reviews
        state.pendingReviews = state.pendingReviews.filter(r => r.Id !== review.Id);
        
        // Update in product reviews if exists
        const productReviews = state.reviewsByProduct[review.productId];
        if (productReviews) {
          const reviewIndex = productReviews.reviews.findIndex(r => r.Id === review.Id);
          if (reviewIndex !== -1) {
            if (review.status === 'approved') {
              productReviews.reviews[reviewIndex] = review;
            } else {
              // Remove rejected reviews from public list
              productReviews.reviews.splice(reviewIndex, 1);
              productReviews.total -= 1;
            }
          } else if (review.status === 'approved') {
            // Add newly approved review
            productReviews.reviews.unshift(review);
            productReviews.total += 1;
          }
        }
      })
      .addCase(moderateReview.rejected, (state, action) => {
        state.loading.moderating = false;
        state.errors.moderate = action.payload;
      });

    // Fetch Pending Reviews
    builder
      .addCase(fetchPendingReviews.pending, (state) => {
        state.loading.pending = true;
        state.errors.pending = null;
      })
      .addCase(fetchPendingReviews.fulfilled, (state, action) => {
        state.loading.pending = false;
        state.pendingReviews = action.payload;
      })
      .addCase(fetchPendingReviews.rejected, (state, action) => {
        state.loading.pending = false;
        state.errors.pending = action.payload;
      });

    // Update Helpfulness
    builder
      .addCase(updateHelpfulness.fulfilled, (state, action) => {
        const review = action.payload;
        
        // Update in product reviews
        const productReviews = state.reviewsByProduct[review.productId];
        if (productReviews) {
          const reviewIndex = productReviews.reviews.findIndex(r => r.Id === review.Id);
          if (reviewIndex !== -1) {
            productReviews.reviews[reviewIndex] = review;
          }
        }
      });
  }
});

export const {
  clearError,
  setFilters,
  resetReviews,
  clearPendingReviews,
  updateReviewInList
} = reviewSlice.actions;

// Selectors
export const selectReviewsByProduct = (state, productId) => 
  state.reviews.reviewsByProduct[productId] || { reviews: [], total: 0, hasMore: false };

export const selectReviewStats = (state, productId) => 
  state.reviews.statsByProduct[productId] || null;

export const selectPendingReviews = (state) => state.reviews.pendingReviews;

export const selectReviewLoading = (state) => state.reviews.loading;

export const selectReviewErrors = (state) => state.reviews.errors;

export const selectReviewFilters = (state) => state.reviews.filters;

export default reviewSlice.reducer;