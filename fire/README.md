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

## How to Use

1. **Age**: Enter your current age
2. **Inflation (%)**: Enter the expected inflation rate for your expenses
3. **Capital (₹ L)**: Enter your current investment capital in lakhs of rupees
4. **Tax Rate (%)**: Enter the tax rate applicable to your investment returns
5. **Retn/m (%)**: Enter your expected monthly returns on investments
6. **Expns/m (₹ L)**: Enter your expected monthly expenses in retirement in lakhs of rupees

The calculator will then show projections for:
- Your current age (shows initial capital without calculations)
- Your age + 5 years
- Your age + 10 years
- Ages 60, 70, and 90 (if applicable)

### Table Columns:
- **Age**: The target age for the projection
- **Capital**: Your projected corpus at that age (for current age, this shows your initial capital)
- **Int**: Interest earned in the final year
- **Expns/y**: Your projected annual expenses at that age (adjusted for inflation)

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

The display format shows values in L (Lakhs) until 99L, then changes to Cr (Crores) and so on.
