const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const pdfParse = require('pdf-parse');

const parseCSV = (filePath) => {
    return new Promise((resolve, reject) => {
        const transactions = [];
        
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => {
                let date = row.Date || row.date || row['Transaction Date'] || row['Posting Date'];
                let description = row.Description || row.description || row['Merchant Name'] || row['Payee'];
                let amount = parseFloat(row.Amount || row.amount || row.Debit || row.Withdrawal || row['Debit Amount'] || 0);
                
                if (amount < 0) amount = Math.abs(amount);
                
                if (date && description && amount > 0) {
                    transactions.push({
                        date: new Date(date),
                        merchant: description.trim().substring(0, 100),
                        amount: amount,
                        category: 'Uncategorized',
                        status: 'pending'
                    });
                }
            })
            .on('end', () => resolve(transactions))
            .on('error', (error) => reject(error));
    });
};

const parsePDF = async (filePath) => {
    try {
        const dataBuffer = fs.readFileSync(filePath);
        const pdfData = await pdfParse(dataBuffer);
        const text = pdfData.text || '';
        const lines = text.split(/\r?\n/);
        const transactions = [];

        const dateRegex = /(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})/;

        for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line) continue;
            
            // Skip typical statement headers
            const lower = line.toLowerCase();
            if (lower.includes('statement') || lower.includes('account holder') || lower.includes('description') || lower.includes('balance')) {
                continue;
            }

            const dateMatch = line.match(dateRegex);
            if (!dateMatch) continue;

            const dateStr = dateMatch[1];
            
            // Extract numeric amounts from the line
            const amounts = [];
            let match;
            const amtRe = /[$€£₹]?\s*([0-9,]+\.\d{2})/g;
            while ((match = amtRe.exec(line)) !== null) {
                const num = parseFloat(match[1].replace(/,/g, ''));
                if (!isNaN(num) && num > 0) amounts.push(num);
            }

            if (amounts.length === 0) continue;
            const amount = amounts[amounts.length - 1];

            // Strip date and amount patterns to extract the merchant/description
            let merchant = line
                .replace(dateStr, '')
                .replace(/[$€£₹]?\s*[0-9,]+\.\d{2}/g, '')
                .replace(/[-|•,]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();

            if (merchant && amount > 0) {
                const parsedDate = new Date(dateStr);
                if (!isNaN(parsedDate.getTime())) {
                    transactions.push({
                        date: parsedDate,
                        merchant: merchant.substring(0, 100),
                        amount: Math.abs(amount),
                        category: 'Uncategorized',
                        status: 'pending'
                    });
                }
            }
        }

        return transactions;
    } catch (error) {
        console.error('PDF parsing error:', error);
        return [];
    }
};

const parseStatementFile = async (filePath, originalName = '') => {
    const isPdf = originalName.toLowerCase().endsWith('.pdf') || filePath.toLowerCase().endsWith('.pdf');
    if (isPdf) {
        return await parsePDF(filePath);
    }
    return await parseCSV(filePath);
};

module.exports = { parseCSV, parsePDF, parseStatementFile };

