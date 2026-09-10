const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
    // Basic Info
    merchant: { type: String, required: true },
    originalMerchant: { type: String },
    amount: { type: Number, required: true },
    billingCycle: { type: String, enum: ['monthly', 'yearly', 'weekly', 'quarterly'], default: 'monthly' },
    
    // Dates
    startDate: { type: Date, default: Date.now },
    nextRenewalDate: { type: Date, required: true },
    lastBilledDate: { type: Date },
    cancelledDate: { type: Date },
    
    // Status Management
    status: { 
        type: String, 
        enum: ['active', 'paused', 'cancelled', 'expired', 'pending_review'],
        default: 'active'
    },
    
    // Auto-detection metadata
    detectedSource: { type: String, enum: ['manual', 'gmail', 'plaid', 'csv', 'pdf', 'statement'], default: 'manual' },
    detectionConfidence: { type: Number, min: 0, max: 100 },
    matchedTransactionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' }],
    
    // For pause/resume guidance (when provider doesn't have API)
    cancellationUrl: { type: String },
    cancellationInstructions: { type: String },
    
    // Notifications
    reminderSent: { type: Boolean, default: false },
    reminderDate: { type: Date },
    
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});

// Indexes for faster queries
subscriptionSchema.index({ userId: 1, merchant: 1 });
subscriptionSchema.index({ userId: 1, status: 1 });
subscriptionSchema.index({ nextRenewalDate: 1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);
