import { orderService } from './orderService';
import { notificationService } from './notificationService';

class ReviewService {
  constructor() {
    this.reviews = [
      {
        Id: 1,
        productId: 1,
        customerId: 1,
        customerName: "John Doe",
        customerEmail: "john@example.com",
        orderId: 1,
        rating: 5,
        title: "Excellent quality!",
        comment: "Fresh produce, delivered on time. Highly recommended!",
        status: "approved",
        createdAt: new Date('2024-01-15'),
        approvedAt: new Date('2024-01-16'),
        moderatedBy: "admin",
        spamScore: 0.1,
        isVerifiedPurchase: true,
        helpful: 12,
        notHelpful: 1
      },
      {
        Id: 2,
        productId: 1,
        customerId: 2,
        customerName: "Jane Smith",
        customerEmail: "jane@example.com",
        orderId: 2,
        rating: 4,
        title: "Good product",
        comment: "Quality is good but packaging could be better.",
        status: "pending",
        createdAt: new Date('2024-01-20'),
        spamScore: 0.2,
        isVerifiedPurchase: true,
        helpful: 0,
        notHelpful: 0
      },
      {
        Id: 3,
        productId: 2,
        customerId: 1,
        customerName: "John Doe",
        customerEmail: "john@example.com",
        orderId: 3,
        rating: 3,
        title: "Average experience",
        comment: "Product was okay, nothing special.",
        status: "rejected",
        createdAt: new Date('2024-01-18'),
        rejectedAt: new Date('2024-01-19'),
        moderatedBy: "admin",
        rejectionReason: "Inappropriate content",
        spamScore: 0.8,
        isVerifiedPurchase: true,
        helpful: 0,
        notHelpful: 0
      }
    ];
    this.nextId = Math.max(...this.reviews.map(r => r.Id)) + 1;
  }

  async getAll() {
    await this.delay(300);
    return [...this.reviews];
  }

  async getById(id) {
    await this.delay(200);
    const review = this.reviews.find(r => r.Id === parseInt(id));
    if (!review) {
      throw new Error('Review not found');
    }
    return { ...review };
  }

  async getByProductId(productId, options = {}) {
    await this.delay(300);
    const { status = 'approved', limit = 10, offset = 0 } = options;
    
    let filtered = this.reviews.filter(r => 
      r.productId === parseInt(productId) && 
      (status === 'all' || r.status === status)
    );

    // Sort by creation date (newest first)
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      reviews: paginated,
      total,
      hasMore: offset + limit < total
    };
  }

  async checkReviewEligibility(customerId, productId) {
    await this.delay(200);
    
    try {
      const orders = await orderService.getAll();
      const customerOrders = orders.filter(order => 
        order.customerId === parseInt(customerId) &&
        order.status === "delivered" &&
        order.items.some(item => item.productId === parseInt(productId))
      );

      if (customerOrders.length === 0) {
        return {
          eligible: false,
          reason: "no_purchase",
          message: "You must purchase and receive this product before reviewing"
        };
      }

      // Check if already reviewed
      const existingReview = this.reviews.find(r => 
        r.customerId === parseInt(customerId) && 
        r.productId === parseInt(productId)
      );

      if (existingReview) {
        return {
          eligible: false,
          reason: "already_reviewed",
          message: "You have already reviewed this product",
          existingReview
        };
      }

      return {
        eligible: true,
        orderIds: customerOrders.map(o => o.id)
      };
    } catch (error) {
      throw new Error(`Eligibility check failed: ${error.message}`);
    }
  }

  async create(reviewData) {
    await this.delay(400);

    const { customerId, productId, orderId, rating, title, comment } = reviewData;

    // Verify purchase eligibility
    const eligibility = await this.checkReviewEligibility(customerId, productId);
    if (!eligibility.eligible) {
      throw new Error(eligibility.message);
    }

    // Get customer details from order
    const order = await orderService.getById(orderId);
    
    // Calculate spam score (simple implementation)
    const spamScore = this.calculateSpamScore(comment, title);

    const newReview = {
      Id: this.nextId++,
      productId: parseInt(productId),
      customerId: parseInt(customerId),
      customerName: order.customerInfo?.name || "Anonymous",
      customerEmail: order.customerInfo?.email || "",
      orderId: parseInt(orderId),
      rating: parseInt(rating),
      title: title.trim(),
      comment: comment.trim(),
      status: spamScore > 0.7 ? "pending" : "pending", // All reviews start as pending
      createdAt: new Date(),
      spamScore,
      isVerifiedPurchase: true,
      helpful: 0,
      notHelpful: 0
    };

    this.reviews.push(newReview);

    // Send notification to admin
    try {
      await this.sendAdminNotification(newReview);
    } catch (error) {
      console.warn('Failed to send admin notification:', error);
    }

    return { ...newReview };
  }

  async updateStatus(reviewId, status, moderatorData = {}) {
    await this.delay(300);

    const reviewIndex = this.reviews.findIndex(r => r.Id === parseInt(reviewId));
    if (reviewIndex === -1) {
      throw new Error('Review not found');
    }

    const review = this.reviews[reviewIndex];
    const now = new Date();

    const updatedReview = {
      ...review,
      status,
      moderatedBy: moderatorData.moderatorId || "admin",
      moderatedAt: now
    };

    if (status === 'approved') {
      updatedReview.approvedAt = now;
    } else if (status === 'rejected') {
      updatedReview.rejectedAt = now;
      updatedReview.rejectionReason = moderatorData.reason || "";
    }

    this.reviews[reviewIndex] = updatedReview;

    // Send notification to customer
    try {
      await this.sendCustomerNotification(updatedReview);
    } catch (error) {
      console.warn('Failed to send customer notification:', error);
    }

    return { ...updatedReview };
  }

  async getPendingReviews(filters = {}) {
    await this.delay(300);
    
    let pending = this.reviews.filter(r => r.status === 'pending');

    // Apply filters
    if (filters.spamLevel) {
      const thresholds = {
        high: 0.7,
        medium: 0.4,
        low: 0.0
      };
      const threshold = thresholds[filters.spamLevel] || 0;
      pending = pending.filter(r => r.spamScore >= threshold);
    }

    if (filters.productId) {
      pending = pending.filter(r => r.productId === parseInt(filters.productId));
    }

    if (filters.dateFrom) {
      pending = pending.filter(r => new Date(r.createdAt) >= new Date(filters.dateFrom));
    }

    if (filters.dateTo) {
      pending = pending.filter(r => new Date(r.createdAt) <= new Date(filters.dateTo));
    }

    // Sort by spam score (highest first) then by date
    pending.sort((a, b) => {
      if (b.spamScore !== a.spamScore) {
        return b.spamScore - a.spamScore;
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return pending;
  }

  async getReviewStats(productId = null) {
    await this.delay(200);

    let reviews = this.reviews;
    if (productId) {
      reviews = reviews.filter(r => r.productId === parseInt(productId));
    }

    const total = reviews.length;
    const approved = reviews.filter(r => r.status === 'approved').length;
    const pending = reviews.filter(r => r.status === 'pending').length;
    const rejected = reviews.filter(r => r.status === 'rejected').length;

    // Rating distribution
    const ratingDistribution = {
      5: 0, 4: 0, 3: 0, 2: 0, 1: 0
    };

    let totalRating = 0;
    const approvedReviews = reviews.filter(r => r.status === 'approved');
    
    approvedReviews.forEach(review => {
      ratingDistribution[review.rating]++;
      totalRating += review.rating;
    });

    const averageRating = approvedReviews.length > 0 
      ? (totalRating / approvedReviews.length).toFixed(1)
      : 0;

    return {
      total,
      approved,
      pending,
      rejected,
      averageRating: parseFloat(averageRating),
      ratingDistribution,
      totalHelpful: reviews.reduce((sum, r) => sum + r.helpful, 0)
    };
  }

  async updateHelpfulness(reviewId, isHelpful) {
    await this.delay(200);

    const reviewIndex = this.reviews.findIndex(r => r.Id === parseInt(reviewId));
    if (reviewIndex === -1) {
      throw new Error('Review not found');
    }

    const review = this.reviews[reviewIndex];
    if (isHelpful) {
      review.helpful++;
    } else {
      review.notHelpful++;
    }

    this.reviews[reviewIndex] = review;
    return { ...review };
  }

  async delete(reviewId) {
    await this.delay(300);

    const reviewIndex = this.reviews.findIndex(r => r.Id === parseInt(reviewId));
    if (reviewIndex === -1) {
      throw new Error('Review not found');
    }

    const deletedReview = this.reviews.splice(reviewIndex, 1)[0];
    return deletedReview;
  }

  // Helper methods
  calculateSpamScore(comment, title) {
    let score = 0;

    // Check for excessive caps
    const capsRatio = (comment.match(/[A-Z]/g) || []).length / comment.length;
    if (capsRatio > 0.5) score += 0.3;

    // Check for excessive punctuation
    const punctuationRatio = (comment.match(/[!?]{2,}/g) || []).length;
    if (punctuationRatio > 0) score += 0.2;

    // Check for common spam words
    const spamWords = ['fake', 'scam', 'terrible', 'worst', 'never buy'];
    const spamWordCount = spamWords.filter(word => 
      comment.toLowerCase().includes(word) || title.toLowerCase().includes(word)
    ).length;
    score += spamWordCount * 0.2;

    // Check for very short comments
    if (comment.length < 10) score += 0.3;

    // Check for repeated characters
    if (/(.)\1{3,}/.test(comment)) score += 0.2;

    return Math.min(score, 1.0);
  }

  async sendAdminNotification(review) {
    // Simulate email notification to admin
    await this.delay(100);
    
    const emailData = {
      to: 'admin@freshmart.com',
      subject: 'New Review Awaiting Moderation',
      template: 'review_moderation',
      data: {
        productId: review.productId,
        customerName: review.customerName,
        rating: review.rating,
        title: review.title,
        comment: review.comment,
        spamScore: review.spamScore,
        reviewUrl: `/admin/reviews/${review.Id}`
      }
    };

    console.log('Admin notification sent:', emailData);
    return true;
  }

  async sendCustomerNotification(review) {
    // Simulate email notification to customer
    await this.delay(100);

    const emailData = {
      to: review.customerEmail,
      subject: `Review ${review.status === 'approved' ? 'Approved' : 'Update'}`,
      template: 'review_status_update',
      data: {
        customerName: review.customerName,
        productId: review.productId,
        status: review.status,
        title: review.title,
        rejectionReason: review.rejectionReason
      }
    };

    console.log('Customer notification sent:', emailData);
    return true;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const reviewService = new ReviewService();