/*
 * Shared India new-regime tax formula.
 *
 * This models normal slab-rate income for AY 2026–27. Salary standard
 * deduction is applied only when salaried=true; business/interest income
 * callers should pass salary=0 and salaried=false.
 */
const INDIA_NEW_REGIME_SLABS = [
    { label: 'Up to ₹4L', upper: 400000, rate: 0 },
    { label: '₹4L – ₹8L', upper: 800000, rate: 0.05 },
    { label: '₹8L – ₹12L', upper: 1200000, rate: 0.10 },
    { label: '₹12L – ₹16L', upper: 1600000, rate: 0.15 },
    { label: '₹16L – ₹20L', upper: 2000000, rate: 0.20 },
    { label: '₹20L – ₹24L', upper: 2400000, rate: 0.25 },
    { label: 'Above ₹24L', upper: Infinity, rate: 0.30 }
];

const INDIA_SURCHARGE_BANDS = [
    { threshold: 5000000, rate: 0 },
    { threshold: 10000000, rate: 0.10 },
    { threshold: 20000000, rate: 0.15 },
    { threshold: 50000000, rate: 0.25 },
    { threshold: Infinity, rate: 0.25 }
];

function indiaSlabTax(income) {
    let lower = 0;
    let total = 0;
    const rows = INDIA_NEW_REGIME_SLABS.map(slab => {
        const amount = Math.max(0, Math.min(income, slab.upper) - lower);
        const tax = amount * slab.rate;
        lower = slab.upper;
        total += tax;
        return { ...slab, amount, tax };
    });
    return { total, rows };
}

function indiaSurchargeRate(income) {
    if (income > 50000000) return 0.25;
    if (income > 20000000) return 0.25;
    if (income > 10000000) return 0.15;
    if (income > 5000000) return 0.10;
    return 0;
}

function indiaRebate(income, tax, resident) {
    if (!resident) return 0;
    if (income <= 1200000) return Math.min(tax, 60000);
    // Marginal relief: tax cannot exceed the income above ₹12L.
    return Math.max(0, tax - (income - 1200000));
}

function indiaTaxBeforeSurcharge(income, resident) {
    const tax = indiaSlabTax(income).total;
    return Math.max(0, tax - indiaRebate(income, tax, resident));
}

function calculateIndiaNewRegimeTax({
    salary = 0,
    otherIncome = 0,
    deductions = 0,
    resident = true,
    salaried = false
} = {}) {
    salary = Math.max(0, Number(salary) || 0);
    otherIncome = Math.max(0, Number(otherIncome) || 0);
    deductions = Math.max(0, Number(deductions) || 0);

    const grossIncome = salary + otherIncome;
    const standardDeduction = salaried ? Math.min(salary, 75000) : 0;
    const taxableIncome = Math.max(0, grossIncome - standardDeduction - deductions);
    const slab = indiaSlabTax(taxableIncome);
    const rebate = indiaRebate(taxableIncome, slab.total, resident);
    const taxAfterRebate = Math.max(0, slab.total - rebate);
    const rate = indiaSurchargeRate(taxableIncome);
    let surcharge = taxAfterRebate * rate;

    // Apply marginal relief at surcharge thresholds where applicable.
    const lowerThreshold = [...INDIA_SURCHARGE_BANDS].reverse()
        .find(band => taxableIncome > band.threshold && band.threshold !== Infinity);
    if (lowerThreshold && rate > 0) {
        const taxAtThreshold = indiaTaxBeforeSurcharge(lowerThreshold.threshold, resident);
        const taxAtThresholdWithSurcharge = taxAtThreshold +
            taxAtThreshold * indiaSurchargeRate(lowerThreshold.threshold);
        const allowedTotal = taxAtThresholdWithSurcharge +
            (taxableIncome - lowerThreshold.threshold);
        surcharge = Math.max(0, Math.min(surcharge, allowedTotal - taxAfterRebate));
    }

    const cess = (taxAfterRebate + surcharge) * 0.04;
    const annualTax = taxAfterRebate + surcharge + cess;
    return {
        grossIncome,
        standardDeduction,
        taxableIncome,
        slab,
        rebate,
        taxAfterRebate,
        surcharge,
        cess,
        annualTax
    };
}

window.calculateIndiaNewRegimeTax = calculateIndiaNewRegimeTax;
