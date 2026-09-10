// Pattern detection for recurring transactions
const detectRecurringTransactions = (transactions) => {
    const merchantGroups = new Map();
    
    for (const tx of transactions) {
        const merchant = normalizeMerchantName(tx.merchant || tx.name || tx.description);
        if (!merchantGroups.has(merchant)) {
            merchantGroups.set(merchant, []);
        }
        merchantGroups.get(merchant).push(tx);
    }
    
    const detected = [];
    
    for (const [merchant, txns] of merchantGroups) {
        if (txns.length < 2) continue;
        
        const sorted = txns.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        const intervals = [];
        for (let i = 1; i < sorted.length; i++) {
            const days = (new Date(sorted[i].date) - new Date(sorted[i-1].date)) / (1000 * 60 * 60 * 24);
            intervals.push(days);
        }
        
        const avgInterval = intervals.reduce((a,b) => a+b, 0) / intervals.length;
        
        let billingCycle = null;
        if (avgInterval >= 25 && avgInterval <= 35) billingCycle = 'monthly';
        else if (avgInterval >= 350 && avgInterval <= 380) billingCycle = 'yearly';
        else if (avgInterval >= 7 && avgInterval <= 9) billingCycle = 'weekly';
        else continue;
        
        const amounts = sorted.map(t => t.amount);
        const avgAmount = amounts.reduce((a,b) => a+b, 0) / amounts.length;
        const amountDeviation = Math.max(...amounts) - Math.min(...amounts);
        const isAmountConsistent = amountDeviation < (avgAmount * 0.2);
        
        if (!isAmountConsistent) continue;
        
        let confidence = 70;
        if (txns.length >= 6) confidence += 20;
        else if (txns.length >= 4) confidence += 10;
        
        const lastDate = new Date(sorted[sorted.length-1].date);
        const nextRenewalDate = new Date(lastDate);
        if (billingCycle === 'monthly') nextRenewalDate.setMonth(lastDate.getMonth() + 1);
        else if (billingCycle === 'yearly') nextRenewalDate.setFullYear(lastDate.getFullYear() + 1);
        else if (billingCycle === 'weekly') nextRenewalDate.setDate(lastDate.getDate() + 7);
        
        detected.push({
            merchant: merchant,
            originalMerchant: txns[0].merchant || txns[0].name,
            amount: parseFloat(avgAmount.toFixed(2)),
            billingCycle,
            nextRenewalDate,
            confidence: Math.min(Math.round(confidence), 100),
            matchedTransactionIds: txns.map(t => t._id || t.id),
            transactionCount: txns.length
        });
    }
    
    return detected;
};

const normalizeMerchantName = (name) => {
    let normalized = (name || '').toLowerCase();
    
    const mappings = {
        'netflix': 'Netflix',
        'spotify': 'Spotify',
        'amazon prime': 'Amazon Prime',
        'apple.com': 'Apple',
        'google': 'Google',
        'microsoft': 'Microsoft',
        'disney+': 'Disney+',
        'hulu': 'Hulu',
        'youtube': 'YouTube Premium',
        'aws': 'AWS',
        'cloudflare': 'Cloudflare',
        'github': 'GitHub',
        'vercel': 'Vercel',
        'figma': 'Figma',
        'slack': 'Slack',
        'notion': 'Notion',
        'zoom': 'Zoom'
    };
    
    for (const [key, value] of Object.entries(mappings)) {
        if (normalized.includes(key)) return value;
    }
    
    return name.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
};

module.exports = { detectRecurringTransactions };
