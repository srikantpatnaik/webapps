# India Income Tax Dashboard

Static calculator for the 2026 filing-season new tax regime (AY 2026–27).

It models normal slab-rate income with:

- Salary/pension mode with ₹75,000 standard deduction, or business/self-employed mode without the salary standard deduction
- ₹4L / ₹8L / ₹12L / ₹16L / ₹20L / ₹24L slab boundaries
- 5%, 10%, 15%, 20%, 25% and 30% rates after the nil band
- ₹60,000 Section 87A rebate for resident individuals with taxable income up to ₹12L
- marginal relief just above ₹12L
- ₹75,000 standard deduction for salary or pension
- surcharge bands and 4% health and education cess

It intentionally does not calculate special-rate income such as capital gains or lottery winnings, or compare the old regime. Inputs are saved in browser local storage.
