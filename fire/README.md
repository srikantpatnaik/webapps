# FIRE Calculator

A Financial Independence, Retire Early (FIRE) calculator to help you determine if and when you can achieve financial independence based on your current financial situation and projected expenses.

## What is FIRE?

FIRE (Financial Independence, Retire Early) is a movement focused on aggressive saving and investing to achieve financial independence and the ability to retire early. The general rule of thumb is that you need a corpus 25 times your annual expenses to safely retire.

## Features

- Calculate your financial independence status at different ages
- Factor in monthly returns on investments
- Account for inflation on expenses
- Consider tax implications on returns
- Preserve your data in the browser
- Mobile-friendly interface with improved spacing

## How to Use

1. **Age**: Enter your current age
2. **Inflation (%)**: Enter the expected inflation rate for your expenses
3. **Capital (₹ L)**: Enter your current investment capital in lakhs of rupees
4. **Tax Rate (%)**: Enter the tax rate applicable to your investment returns
5. **Retn/m (%)**: Enter your expected monthly returns on investments
6. **Expns/m (₹ L)**: Enter your expected monthly expenses in retirement in lakhs of rupees

The calculator will then show projections for:
- First row: Current age with only Age and Capital shown (other columns empty)
- Next two rows: Projections for the following two years
- Subsequent rows: Ages 50, 60, and 80 (if applicable)

### Table Columns:
- **Age**: The target age for the projection
- **Capital**: Your projected corpus at that age (for current age, this shows your initial capital)
- **Gain**: Annual investment gains in the final year (shown in L format)
- **Taxes**: Annual taxes paid on gains (shown in L format with grey text)
- **Expns/y**: Your projected annual expenses at that age (adjusted for inflation, shown in L format with grey text)

## Display Thresholds

The calculator uses special conversion thresholds:
- Values ≥ 100,000 (100K) are displayed in L (Lakhs) instead of K
- Values ≥ 10,000,000 (100L) are displayed in Cr (Crores) instead of L
- Values ≥ 1,000,000,000 (100Cr) are displayed in B (Billions) instead of Cr
- All values are displayed with 1 decimal place instead of 2

## Mobile Optimization

- Title and form spacing reduced for better mobile view
- Font sizes and element padding adjusted for compact display
- Improved responsive design for smaller screens

## Assumptions

- The calculator assumes the current year as the retirement year
- Monthly withdrawals are made for expenses
- Returns are calculated monthly and then taxed
- Inflation compounds annually on expenses
- The same monthly return rate is applied throughout the projection period

## Data Persistence

Your inputs are automatically saved in your browser's local storage, so they'll be preserved when you return to the calculator.

## Footer Message

> "Assumes current year as retirement year. Preserves data in browser."

## Technical Details

The calculator uses a monthly compounding model:
1. Monthly returns are calculated on the current balance
2. Tax is applied to the monthly gains
3. Monthly expenses are withdrawn from the corpus
4. Annual inflation is applied to expenses for the following year

The display format now uses custom thresholds (100K→1L, 100L→1Cr, 100Cr→1B) and shows values with 1 decimal place.
