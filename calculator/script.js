document.addEventListener('DOMContentLoaded', () => {
    const $ = (selector) => document.querySelector(selector);

    const tabButtons = [...document.querySelectorAll('[data-tab-target]')];
    const tabPanels = [...document.querySelectorAll('.tab-panel')];

    function setActiveTab(targetId, focusTab = false) {
        tabButtons.forEach((button) => {
            const isActive = button.dataset.tabTarget === targetId;
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-selected', String(isActive));
            if (isActive && focusTab) button.focus();
        });
        tabPanels.forEach((panel) => panel.classList.toggle('is-active', panel.id === targetId));
        if (targetId === 'compound-panel' && typeof drawChart === 'function' && typeof calculateProjection === 'function') {
            window.requestAnimationFrame(() => drawChart(calculateProjection(getProjectionInputs()).snapshots));
        }
    }

    tabButtons.forEach((button, index) => {
        button.addEventListener('click', () => setActiveTab(button.dataset.tabTarget));
        button.addEventListener('keydown', (event) => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            const nextIndex = event.key === 'Home' ? 0
                : event.key === 'End' ? tabButtons.length - 1
                    : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabButtons.length) % tabButtons.length;
            setActiveTab(tabButtons[nextIndex].dataset.tabTarget, true);
        });
    });

    const regularDisplay = $('#regular-display');
    const regularExpressionOutput = $('#regular-expression');
    let regularExpression = '';
    let regularPreviousExpression = '';
    let regularJustEvaluated = false;
    let regularError = false;

    const calculatorNumberFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 12 });

    function formatCalculatorValue(value) {
        if (!Number.isFinite(value)) return 'Error';
        const absoluteValue = Math.abs(value);
        if (absoluteValue !== 0 && (absoluteValue >= 1e12 || absoluteValue < 1e-8)) {
            return value.toExponential(8).replace(/\.0+e/, 'e').replace(/(\.\d*?[1-9])0+e/, '$1e');
        }
        return calculatorNumberFormatter.format(value);
    }

    function tokenizeRegularExpression(expression) {
        const tokens = [];
        let index = 0;
        while (index < expression.length) {
            const character = expression[index];
            if (/\s/.test(character)) {
                index += 1;
                continue;
            }
            if (/\d|\./.test(character)) {
                const start = index;
                let dots = 0;
                while (index < expression.length && /[\d.]/.test(expression[index])) {
                    if (expression[index] === '.') dots += 1;
                    index += 1;
                }
                const numberText = expression.slice(start, index);
                if (dots > 1 || numberText === '.') throw new Error('Invalid number');
                tokens.push(Number(numberText));
                continue;
            }
            if ('+-*/'.includes(character)) {
                tokens.push(character);
                index += 1;
                continue;
            }
            throw new Error('Invalid character');
        }
        return tokens;
    }

    function evaluateRegularExpression(expression) {
        const tokens = tokenizeRegularExpression(expression);
        let index = 0;

        function parsePrimary() {
            const token = tokens[index];
            if (token === '+' || token === '-') {
                index += 1;
                const value = parsePrimary();
                return token === '-' ? -value : value;
            }
            if (typeof token !== 'number') throw new Error('Expected number');
            index += 1;
            return token;
        }

        function parseMultiplication() {
            let value = parsePrimary();
            while (tokens[index] === '*' || tokens[index] === '/') {
                const operator = tokens[index];
                index += 1;
                const nextValue = parsePrimary();
                value = operator === '*' ? value * nextValue : value / nextValue;
            }
            return value;
        }

        function parseAddition() {
            let value = parseMultiplication();
            while (tokens[index] === '+' || tokens[index] === '-') {
                const operator = tokens[index];
                index += 1;
                const nextValue = parseMultiplication();
                value = operator === '+' ? value + nextValue : value - nextValue;
            }
            return value;
        }

        if (!tokens.length) throw new Error('Empty expression');
        const result = parseAddition();
        if (index !== tokens.length || !Number.isFinite(result)) throw new Error('Invalid expression');
        return result;
    }

    function renderRegularCalculator() {
        regularDisplay.textContent = regularError ? 'Error' : regularJustEvaluated ? formatCalculatorValue(Number(regularExpression)) : regularExpression || '0';
        regularExpressionOutput.textContent = regularError ? 'Try again' : regularJustEvaluated ? `${regularPreviousExpression} =` : regularExpression || 'Ready';
    }

    function resetRegularCalculator() {
        regularExpression = '';
        regularPreviousExpression = '';
        regularJustEvaluated = false;
        regularError = false;
        renderRegularCalculator();
    }

    function appendRegularValue(value) {
        if (regularError || regularJustEvaluated) {
            regularExpression = '';
            regularJustEvaluated = false;
            regularError = false;
        }
        if (/\d/.test(value) && regularExpression.endsWith(')')) regularExpression += '*';
        regularExpression += value;
        renderRegularCalculator();
    }

    function appendRegularDecimal() {
        if (regularError || regularJustEvaluated) {
            regularExpression = '';
            regularJustEvaluated = false;
            regularError = false;
        }
        const lastOperator = Math.max(regularExpression.lastIndexOf('+'), regularExpression.lastIndexOf('-'), regularExpression.lastIndexOf('*'), regularExpression.lastIndexOf('/'));
        const currentNumber = regularExpression.slice(lastOperator + 1);
        if (currentNumber.includes('.')) return;
        regularExpression += currentNumber ? '.' : '0.';
        renderRegularCalculator();
    }

    function appendRegularOperator(operator) {
        if (regularError) resetRegularCalculator();
        if (regularJustEvaluated) regularJustEvaluated = false;
        if (!regularExpression && operator !== '-') {
            regularExpression = '0' + operator;
        } else if (!regularExpression && operator === '-') {
            regularExpression = '-';
        } else if (/[+\-*/]$/.test(regularExpression)) {
            regularExpression = regularExpression.slice(0, -1) + operator;
        } else {
            regularExpression += operator;
        }
        renderRegularCalculator();
    }

    function applyRegularPercent() {
        if (!regularExpression || regularError) return;
        const match = regularExpression.match(/(\d*\.?\d+)$/);
        if (!match) return;
        const start = match.index;
        regularExpression = `${regularExpression.slice(0, start)}${Number(match[1]) / 100}`;
        regularJustEvaluated = false;
        renderRegularCalculator();
    }

    function calculateRegular() {
        if (!regularExpression) return;
        try {
            regularPreviousExpression = regularExpression;
            regularExpression = String(evaluateRegularExpression(regularExpression));
            regularJustEvaluated = true;
            regularError = false;
        } catch {
            regularError = true;
            regularJustEvaluated = false;
        }
        renderRegularCalculator();
    }

    function handleRegularAction(action) {
        if (action === 'clear') resetRegularCalculator();
        if (action === 'backspace') {
            if (regularJustEvaluated || regularError) return resetRegularCalculator();
            regularExpression = regularExpression.slice(0, -1);
            renderRegularCalculator();
        }
        if (action === 'percent') applyRegularPercent();
        if (action === 'equals') calculateRegular();
    }

    document.querySelectorAll('[data-regular-key]').forEach((button) => {
        button.addEventListener('click', () => {
            const value = button.dataset.regularKey;
            if (value === '.') appendRegularDecimal();
            else if ('+-*/'.includes(value)) appendRegularOperator(value);
            else appendRegularValue(value);
        });
    });
    document.querySelectorAll('[data-regular-action]').forEach((button) => button.addEventListener('click', () => handleRegularAction(button.dataset.regularAction)));

    const scientificDisplay = $('#scientific-display');
    const scientificExpressionOutput = $('#scientific-expression');
    let scientificExpression = '';
    let scientificPreviousExpression = '';
    let scientificJustEvaluated = false;
    let scientificError = false;
    let scientificDegrees = true;

    const scientificFunctionNames = new Set(['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'log', 'ln', 'sqrt', 'abs', 'fact', 'e']);

    function factorial(value) {
        if (value < 0 || !Number.isInteger(value) || value > 170) throw new Error('Factorial is limited to whole numbers up to 170');
        let result = 1;
        for (let index = 2; index <= value; index += 1) result *= index;
        return result;
    }

    function evaluateScientificExpression(expression) {
        const names = expression.match(/[A-Za-z]+/g) || [];
        if (names.some((name) => !scientificFunctionNames.has(name))) throw new Error('Unknown function');
        if (/[^0-9A-Za-z+\-*/().,^π%!\s]/.test(expression)) throw new Error('Invalid character');
        const javascriptExpression = expression
            .replace(/(\d+(?:\.\d+)?)%/g, '($1 / 100)')
            .replace(/(\d+(?:\.\d+)?)!/g, 'fact($1)')
            .replace(/π/g, 'PI')
            .replace(/\be\b/g, 'E')
            .replace(/\^/g, '**');
        const radians = (value) => scientificDegrees ? value * Math.PI / 180 : value;
        const fromRadians = (value) => scientificDegrees ? value * 180 / Math.PI : value;
        const evaluator = new Function('sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'log', 'ln', 'sqrt', 'abs', 'fact', 'PI', 'E', `"use strict"; return (${javascriptExpression});`);
        const result = evaluator(
            (value) => Math.sin(radians(value)),
            (value) => Math.cos(radians(value)),
            (value) => Math.tan(radians(value)),
            (value) => fromRadians(Math.asin(value)),
            (value) => fromRadians(Math.acos(value)),
            (value) => fromRadians(Math.atan(value)),
            (value) => Math.log10(value),
            (value) => Math.log(value),
            (value) => Math.sqrt(value),
            (value) => Math.abs(value),
            factorial,
            Math.PI,
            Math.E
        );
        if (!Number.isFinite(result)) throw new Error('Result is not finite');
        return result;
    }

    function renderScientificCalculator() {
        scientificDisplay.textContent = scientificError ? 'Error' : scientificJustEvaluated ? formatCalculatorValue(Number(scientificExpression)) : scientificExpression || '0';
        scientificExpressionOutput.textContent = scientificError ? 'Try again' : scientificJustEvaluated ? `${scientificPreviousExpression} =` : scientificExpression || 'Ready';
    }

    function resetScientificCalculator() {
        scientificExpression = '';
        scientificPreviousExpression = '';
        scientificJustEvaluated = false;
        scientificError = false;
        renderScientificCalculator();
    }

    function scientificImplicitMultiply() {
        return /[\dπe)]$/.test(scientificExpression) ? '*' : '';
    }

    function appendScientificValue(value) {
        if (scientificError || scientificJustEvaluated) {
            scientificExpression = '';
            scientificJustEvaluated = false;
            scientificError = false;
        }
        if (value === 'π' || value === 'e') scientificExpression += scientificImplicitMultiply();
        if (/\d/.test(value) && /[πe)]$/.test(scientificExpression)) scientificExpression += '*';
        scientificExpression += value;
        renderScientificCalculator();
    }

    function appendScientificFunction(functionName) {
        if (scientificError) resetScientificCalculator();
        scientificJustEvaluated = false;
        if (functionName === 'square') {
            if (scientificExpression) scientificExpression += '^2';
        } else if (functionName === 'fact') {
            if (scientificExpression) scientificExpression += '!';
        } else {
            scientificExpression += scientificImplicitMultiply() + `${functionName}(`;
        }
        renderScientificCalculator();
    }

    function appendScientificDecimal() {
        if (scientificError || scientificJustEvaluated) {
            scientificExpression = '';
            scientificJustEvaluated = false;
            scientificError = false;
        }
        const lastOperator = Math.max(scientificExpression.lastIndexOf('+'), scientificExpression.lastIndexOf('-'), scientificExpression.lastIndexOf('*'), scientificExpression.lastIndexOf('/'), scientificExpression.lastIndexOf('^'), scientificExpression.lastIndexOf('('));
        const currentNumber = scientificExpression.slice(lastOperator + 1);
        if (currentNumber.includes('.')) return;
        scientificExpression += currentNumber ? '.' : '0.';
        renderScientificCalculator();
    }

    function appendScientificOperator(operator) {
        if (scientificError) resetScientificCalculator();
        scientificJustEvaluated = false;
        if (!scientificExpression && operator === '-') scientificExpression = '-';
        else if (!scientificExpression) scientificExpression = `0${operator}`;
        else if (/[+\-*/^]$/.test(scientificExpression)) scientificExpression = scientificExpression.slice(0, -1) + operator;
        else scientificExpression += operator;
        renderScientificCalculator();
    }

    function appendScientificParenthesis(parenthesis) {
        if (scientificError) resetScientificCalculator();
        scientificJustEvaluated = false;
        if (parenthesis === '(') scientificExpression += scientificImplicitMultiply() + '(';
        else if ((scientificExpression.match(/\(/g) || []).length > (scientificExpression.match(/\)/g) || []).length && /[\dπe)]$/.test(scientificExpression)) scientificExpression += ')';
        renderScientificCalculator();
    }

    function calculateScientific() {
        if (!scientificExpression) return;
        try {
            scientificPreviousExpression = scientificExpression;
            scientificExpression = String(evaluateScientificExpression(scientificExpression));
            scientificJustEvaluated = true;
            scientificError = false;
        } catch {
            scientificError = true;
            scientificJustEvaluated = false;
        }
        renderScientificCalculator();
    }

    function handleScientificAction(action) {
        if (action === 'clear') resetScientificCalculator();
        if (action === 'backspace') {
            if (scientificJustEvaluated || scientificError) return resetScientificCalculator();
            scientificExpression = scientificExpression.slice(0, -1);
            renderScientificCalculator();
        }
        if (action === 'equals') calculateScientific();
    }

    document.querySelectorAll('[data-scientific-value]').forEach((button) => {
        button.addEventListener('click', () => {
            const value = button.dataset.scientificValue;
            if (/^\d$/.test(value)) appendScientificValue(value);
            else if (value === '.') appendScientificDecimal();
            else if ('+-*/^%'.includes(value)) value === '%' ? appendScientificValue('%') : appendScientificOperator(value);
            else if (value === '(' || value === ')') appendScientificParenthesis(value);
            else if (value === 'pi') appendScientificValue('π');
            else if (value === 'e') appendScientificValue('e');
            else appendScientificFunction(value);
        });
    });
    document.querySelectorAll('[data-scientific-action]').forEach((button) => button.addEventListener('click', () => handleScientificAction(button.dataset.scientificAction)));
    $('#scientific-angle').addEventListener('click', () => {
        scientificDegrees = !scientificDegrees;
        $('#scientific-angle').textContent = scientificDegrees ? 'DEG' : 'RAD';
    });

    document.addEventListener('keydown', (event) => {
        if (event.target.matches('input, select, textarea')) return;
        const activePanel = document.querySelector('.tab-panel.is-active')?.id;
        const isScientific = activePanel === 'scientific-panel';
        const key = event.key;
        if (!isScientific && /^[0-9]$/.test(key)) {
            event.preventDefault();
            appendRegularValue(key);
        } else if (!isScientific && '+-*/'.includes(key)) {
            event.preventDefault();
            appendRegularOperator(key);
        } else if (!isScientific && key === '.') {
            event.preventDefault();
            appendRegularDecimal();
        } else if (isScientific && /^[0-9]$/.test(key)) {
            event.preventDefault();
            appendScientificValue(key);
        } else if (isScientific && '+-*/^%'.includes(key)) {
            event.preventDefault();
            key === '%' ? appendScientificValue('%') : appendScientificOperator(key);
        } else if (isScientific && key === '.') {
            event.preventDefault();
            appendScientificDecimal();
        } else if (key === 'Enter' || key === '=') {
            event.preventDefault();
            isScientific ? calculateScientific() : calculateRegular();
        } else if (key === 'Escape') {
            event.preventDefault();
            isScientific ? resetScientificCalculator() : resetRegularCalculator();
        } else if (key === 'Backspace') {
            event.preventDefault();
            isScientific ? handleScientificAction('backspace') : handleRegularAction('backspace');
        }
    });

    renderRegularCalculator();
    renderScientificCalculator();

    const compoundForm = $('#compound-form');
    const principalInput = $('#principal');
    const rateInput = $('#rate');
    const yearsInput = $('#years');
    const monthsInput = $('#months');
    const frequencyInput = $('#frequency');
    const customFrequencyField = $('#custom-frequency-field');
    const customFrequencyInput = $('#custom-frequency');
    const contributionInput = $('#contribution');
    const contributionFrequencyInput = $('#contribution-frequency');
    const breakdownBody = $('#breakdown-body');
    const chart = $('#growth-chart');

    const numberFormatter = new Intl.NumberFormat(undefined, {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2
    });
    const converterFormatter = new Intl.NumberFormat(undefined, {
        maximumFractionDigits: 8,
        maximumSignificantDigits: 12
    });

    const toNumber = (input, fallback = 0) => {
        const parsed = Number.parseFloat(input?.value ?? input);
        return Number.isFinite(parsed) ? parsed : fallback;
    };

    const formatExactAmount = (value) => numberFormatter.format(Number.isFinite(value) ? value : 0);
    const formatAmount = (value) => {
        const safeValue = Number.isFinite(value) ? value : 0;
        const absoluteValue = Math.abs(safeValue);
        const trimZeros = (text) => text.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
        if (absoluteValue >= 100000) return `${trimZeros((safeValue / 100000).toFixed(2))}L`;
        if (absoluteValue >= 1000) return `${trimZeros((safeValue / 1000).toFixed(2))}K`;
        return formatExactAmount(safeValue);
    };

    function getFrequency() {
        if (frequencyInput.value === 'custom') {
            return Math.min(3650, Math.max(1, Math.round(toNumber(customFrequencyInput, 12))));
        }
        return Number(frequencyInput.value);
    }

    function getContributionTiming() {
        return document.querySelector('input[name="contribution-timing"]:checked')?.value || 'end';
    }

    function getProjectionInputs() {
        const years = Math.min(1000, Math.max(0, Math.floor(toNumber(yearsInput))));
        const months = Math.min(11, Math.max(0, Math.floor(toNumber(monthsInput))));
        const totalYears = years + months / 12;
        const frequency = getFrequency();
        const contributionFrequency = Number(contributionFrequencyInput.value);

        return {
            principal: Math.max(0, toNumber(principalInput)),
            annualRate: toNumber(rateInput) / 100,
            totalYears,
            frequency,
            contribution: Math.max(0, toNumber(contributionInput)),
            contributionFrequency,
            contributionTiming: getContributionTiming()
        };
    }

    function calculateProjection(inputs) {
        const {
            principal,
            annualRate,
            totalYears,
            frequency,
            contribution,
            contributionFrequency,
            contributionTiming
        } = inputs;

        if (totalYears === 0) {
            return {
                balance: principal,
                interest: 0,
                totalAdded: 0,
                effectiveRate: Math.pow(Math.max(0, 1 + annualRate / frequency), frequency) - 1,
                doublingYears: annualRate > 0 ? Math.log(2) / (frequency * Math.log(1 + annualRate / frequency)) : null,
                snapshots: [{ year: 0, added: 0, interest: 0, totalAdded: 0, balance: principal }]
            };
        }

        // A maximum of daily steps keeps the calculator responsive while still
        // allowing contribution dates and compounding dates to feel natural.
        const stepsPerYear = Math.min(365, Math.max(12, frequency, contributionFrequency));
        const stepCount = Math.max(1, Math.ceil(totalYears * stepsPerYear));
        const periodRateBase = Math.max(0, 1 + annualRate / frequency);
        const stepRate = Math.pow(periodRateBase, frequency / stepsPerYear) - 1;
        const contributionStep = stepsPerYear / contributionFrequency;
        const epsilon = 0.00000001;
        let balance = principal;
        let totalAdded = 0;
        let totalInterest = 0;
        let nextContribution = contributionTiming === 'beginning' ? 0 : contributionStep;
        let nextYear = 1;
        let yearAdded = 0;
        let yearInterest = 0;
        const snapshots = [];

        for (let step = 0; step < stepCount; step += 1) {
            const end = Math.min(totalYears, (step + 1) / stepsPerYear);

            if (contributionTiming === 'beginning') {
                while (nextContribution < end - epsilon && nextContribution < totalYears + epsilon) {
                    balance += contribution;
                    totalAdded += contribution;
                    yearAdded += contribution;
                    nextContribution += contributionStep;
                }
            }

            const beforeGrowth = balance;
            balance *= 1 + stepRate;
            const interestForStep = balance - beforeGrowth;
            totalInterest += interestForStep;
            yearInterest += interestForStep;

            if (contributionTiming === 'end') {
                while (nextContribution <= end + epsilon && nextContribution <= totalYears + epsilon) {
                    balance += contribution;
                    totalAdded += contribution;
                    yearAdded += contribution;
                    nextContribution += contributionStep;
                }
            }

            while (nextYear <= Math.ceil(totalYears) && end >= nextYear - epsilon) {
                snapshots.push({
                    year: nextYear,
                    added: yearAdded,
                    interest: yearInterest,
                    totalAdded,
                    balance
                });
                yearAdded = 0;
                yearInterest = 0;
                nextYear += 1;
            }
        }

        // If the duration is a partial year, show the final partial period.
        if (snapshots.length === 0 || snapshots[snapshots.length - 1].year < totalYears) {
            snapshots.push({
                year: totalYears,
                added: yearAdded,
                interest: yearInterest,
                totalAdded,
                balance
            });
        }

        return {
            balance,
            interest: totalInterest,
            totalAdded,
            effectiveRate: Math.pow(periodRateBase, frequency) - 1,
            doublingYears: annualRate > 0 ? Math.log(2) / (frequency * Math.log(1 + annualRate / frequency)) : null,
            snapshots
        };
    }

    function formatDuration(years) {
        if (!Number.isFinite(years)) return '—';
        let wholeYears = Math.floor(years);
        let months = Math.round((years - wholeYears) * 12);
        if (months === 12) {
            wholeYears += 1;
            months = 0;
        }
        if (wholeYears === 0) return `${Math.max(1, months)} mo`;
        if (months === 0) return `${wholeYears} yr`;
        return `${wholeYears} yr ${months} mo`;
    }

    function drawChart(snapshots) {
        const context = chart.getContext('2d');
        const bounds = chart.getBoundingClientRect();
        const width = Math.max(280, Math.round(bounds.width));
        const height = 190;
        const pixelRatio = window.devicePixelRatio || 1;
        chart.width = width * pixelRatio;
        chart.height = height * pixelRatio;
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        context.clearRect(0, 0, width, height);

        if (!snapshots.length) return;

        const padding = { top: 10, right: 7, bottom: 23, left: 7 };
        const plotWidth = width - padding.left - padding.right;
        const plotHeight = height - padding.top - padding.bottom;
        const values = snapshots.map((snapshot) => Math.max(0, snapshot.balance));
        const maxValue = Math.max(...values, 1);
        const points = snapshots.map((snapshot, index) => ({
            x: padding.left + (index / Math.max(1, snapshots.length - 1)) * plotWidth,
            y: padding.top + plotHeight - (Math.max(0, snapshot.balance) / maxValue) * plotHeight
        }));

        context.strokeStyle = 'rgba(145, 161, 190, 0.12)';
        context.lineWidth = 1;
        [0, 0.5, 1].forEach((fraction) => {
            const y = padding.top + plotHeight * fraction;
            context.beginPath();
            context.moveTo(padding.left, y);
            context.lineTo(width - padding.right, y);
            context.stroke();
        });

        const fill = context.createLinearGradient(0, padding.top, 0, height);
        fill.addColorStop(0, 'rgba(140, 168, 255, 0.28)');
        fill.addColorStop(1, 'rgba(140, 168, 255, 0.01)');
        context.beginPath();
        context.moveTo(points[0].x, height - padding.bottom);
        points.forEach((point) => context.lineTo(point.x, point.y));
        context.lineTo(points[points.length - 1].x, height - padding.bottom);
        context.closePath();
        context.fillStyle = fill;
        context.fill();

        context.beginPath();
        points.forEach((point, index) => {
            if (index === 0) context.moveTo(point.x, point.y);
            else context.lineTo(point.x, point.y);
        });
        context.strokeStyle = '#9db4ff';
        context.lineWidth = 2.2;
        context.lineJoin = 'round';
        context.lineCap = 'round';
        context.stroke();

        const first = points[0];
        const last = points[points.length - 1];
        [first, last].forEach((point) => {
            context.beginPath();
            context.arc(point.x, point.y, 3.4, 0, Math.PI * 2);
            context.fillStyle = '#0f1a31';
            context.fill();
            context.strokeStyle = '#a9bcff';
            context.lineWidth = 1.7;
            context.stroke();
        });

        context.fillStyle = '#66748d';
        context.font = '10px Manrope, sans-serif';
        context.textAlign = 'left';
        context.fillText('Start', padding.left, height - 5);
        context.textAlign = 'right';
        context.fillText(`${formatDuration(snapshots[snapshots.length - 1].year)}`, width - padding.right, height - 5);
    }

    function renderBreakdown(snapshots, principal) {
        const rows = [{ year: 0, added: 0, interest: 0, totalAdded: 0, balance: principal }, ...snapshots];
        breakdownBody.textContent = '';
        rows.forEach((row) => {
            const tr = document.createElement('tr');
            const yearLabel = row.year === 0 ? 'Start' : Number.isInteger(row.year) ? `Year ${row.year}` : `Year ${row.year.toFixed(1)}`;
            [yearLabel, formatAmount(row.added), formatAmount(row.interest), formatAmount(row.totalAdded), formatAmount(row.balance)].forEach((value) => {
                const cell = document.createElement('td');
                cell.textContent = value;
                tr.appendChild(cell);
            });
            breakdownBody.appendChild(tr);
        });
    }

    function calculateAndRender(event) {
        event?.preventDefault();
        const inputs = getProjectionInputs();
        const result = calculateProjection(inputs);
        $('#future-balance').textContent = formatAmount(result.balance);
        $('#interest-earned').textContent = formatAmount(result.interest);
        $('#total-added').textContent = formatAmount(result.totalAdded);
            $('#effective-rate').textContent = `${formatExactAmount(result.effectiveRate * 100)}%`;
        $('#doubling-time').textContent = formatDuration(result.doublingYears);
        $('#results-period').textContent = inputs.totalYears === 1 ? '1 year' : `${inputs.totalYears} years`;
        renderBreakdown(result.snapshots, inputs.principal);
        drawChart(result.snapshots);
    }

    frequencyInput.addEventListener('change', () => {
        customFrequencyField.classList.toggle('is-visible', frequencyInput.value === 'custom');
        calculateAndRender();
    });
    [principalInput, rateInput, yearsInput, monthsInput, customFrequencyInput, contributionInput, contributionFrequencyInput].forEach((input) => {
        input.addEventListener('input', calculateAndRender);
        input.addEventListener('change', calculateAndRender);
    });
    document.querySelectorAll('input[name="contribution-timing"]').forEach((input) => input.addEventListener('change', calculateAndRender));
    compoundForm.addEventListener('submit', calculateAndRender);
    $('#reset-calculator').addEventListener('click', () => {
        principalInput.value = 5000;
        rateInput.value = 5;
        yearsInput.value = 10;
        monthsInput.value = 0;
        frequencyInput.value = 12;
        customFrequencyInput.value = 12;
        customFrequencyField.classList.remove('is-visible');
        contributionInput.value = 100;
        contributionFrequencyInput.value = 12;
        document.querySelector('input[name="contribution-timing"][value="end"]').checked = true;
        calculateAndRender();
    });
    window.addEventListener('resize', () => drawChart(calculateProjection(getProjectionInputs()).snapshots));

    const linearUnits = (units) => units.map(([id, label, short, factor]) => ({
        id,
        label,
        short,
        toBase: (value) => value * factor,
        fromBase: (value) => value / factor
    }));

    const converterData = {
        length: {
            name: 'Length & distance', icon: '↔',
            units: linearUnits([
                ['meter', 'Meter', 'm', 1], ['kilometer', 'Kilometer', 'km', 1000], ['centimeter', 'Centimeter', 'cm', 0.01],
                ['millimeter', 'Millimeter', 'mm', 0.001], ['mile', 'Mile', 'mi', 1609.344], ['yard', 'Yard', 'yd', 0.9144],
                ['foot', 'Foot', 'ft', 0.3048], ['inch', 'Inch', 'in', 0.0254], ['nautical-mile', 'Nautical mile', 'nmi', 1852]
            ]),
            popular: [['meter', 'foot'], ['kilometer', 'mile'], ['inch', 'centimeter']]
        },
        area: {
            name: 'Area', icon: '▧',
            units: linearUnits([
                ['square-meter', 'Square meter', 'm²', 1], ['square-kilometer', 'Square kilometer', 'km²', 1000000],
                ['square-centimeter', 'Square centimeter', 'cm²', 0.0001], ['square-foot', 'Square foot', 'ft²', 0.09290304],
                ['square-yard', 'Square yard', 'yd²', 0.83612736], ['square-mile', 'Square mile', 'mi²', 2589988.110336],
                ['acre', 'Acre', 'ac', 4046.8564224], ['hectare', 'Hectare', 'ha', 10000]
            ]),
            popular: [['square-meter', 'square-foot'], ['acre', 'square-foot'], ['hectare', 'acre']]
        },
        mass: {
            name: 'Mass & weight', icon: '◒',
            units: linearUnits([
                ['kilogram', 'Kilogram', 'kg', 1], ['gram', 'Gram', 'g', 0.001], ['milligram', 'Milligram', 'mg', 0.000001],
                ['microgram', 'Microgram', 'µg', 0.000000001], ['tonne', 'Tonne', 't', 1000], ['pound', 'Pound', 'lb', 0.45359237],
                ['ounce', 'Ounce', 'oz', 0.028349523125], ['stone', 'Stone', 'st', 6.35029318]
            ]),
            popular: [['kilogram', 'pound'], ['gram', 'ounce'], ['stone', 'pound']]
        },
        volume: {
            name: 'Liquid volume', icon: '◉',
            units: linearUnits([
                ['liter', 'Liter', 'L', 1], ['milliliter', 'Milliliter', 'mL', 0.001], ['cubic-meter', 'Cubic meter', 'm³', 1000],
                ['cubic-centimeter', 'Cubic centimeter', 'cm³', 0.001], ['us-gallon', 'US gallon', 'gal', 3.785411784],
                ['imperial-gallon', 'Imperial gallon', 'imp gal', 4.54609], ['us-quart', 'US quart', 'qt', 0.946352946],
                ['us-pint', 'US pint', 'pt', 0.473176473], ['fluid-ounce', 'Fluid ounce', 'fl oz', 0.0295735295625]
            ]),
            popular: [['liter', 'us-gallon'], ['milliliter', 'fluid-ounce'], ['us-gallon', 'liter']]
        },
        temperature: {
            name: 'Temperature', icon: '☼',
            units: [
                { id: 'celsius', label: 'Celsius', short: '°C', toBase: (v) => v, fromBase: (v) => v },
                { id: 'fahrenheit', label: 'Fahrenheit', short: '°F', toBase: (v) => (v - 32) * 5 / 9, fromBase: (v) => v * 9 / 5 + 32 },
                { id: 'kelvin', label: 'Kelvin', short: 'K', toBase: (v) => v - 273.15, fromBase: (v) => v + 273.15 }
            ],
            popular: [['celsius', 'fahrenheit'], ['fahrenheit', 'celsius'], ['celsius', 'kelvin']]
        },
        speed: {
            name: 'Speed', icon: '➜',
            units: linearUnits([
                ['meter-per-second', 'Meter per second', 'm/s', 1], ['kilometer-per-hour', 'Kilometer per hour', 'km/h', 0.2777777778],
                ['mile-per-hour', 'Mile per hour', 'mph', 0.44704], ['knot', 'Knot', 'kn', 0.5144444444], ['foot-per-second', 'Foot per second', 'ft/s', 0.3048]
            ]),
            popular: [['kilometer-per-hour', 'mile-per-hour'], ['meter-per-second', 'kilometer-per-hour'], ['knot', 'kilometer-per-hour']]
        },
        acceleration: {
            name: 'Acceleration', icon: '↗',
            units: linearUnits([
                ['meter-per-second-squared', 'Meter per second²', 'm/s²', 1], ['foot-per-second-squared', 'Foot per second²', 'ft/s²', 0.3048],
                ['standard-gravity', 'Standard gravity', 'g', 9.80665], ['gal', 'Gal', 'Gal', 0.01]
            ]),
            popular: [['standard-gravity', 'meter-per-second-squared'], ['meter-per-second-squared', 'foot-per-second-squared']]
        },
        time: {
            name: 'Time', icon: '◷',
            units: linearUnits([
                ['second', 'Second', 's', 1], ['minute', 'Minute', 'min', 60], ['hour', 'Hour', 'h', 3600], ['day', 'Day', 'd', 86400],
                ['week', 'Week', 'wk', 604800], ['month', 'Month (30 days)', 'mo', 2592000], ['year', 'Year (365 days)', 'yr', 31536000]
            ]),
            popular: [['hour', 'minute'], ['day', 'hour'], ['year', 'day']]
        },
        data: {
            name: 'Data storage', icon: '▣',
            units: linearUnits([
                ['bit', 'Bit', 'bit', 1], ['byte', 'Byte', 'B', 8], ['kilobit', 'Kilobit', 'kb', 1000], ['kilobyte', 'Kilobyte', 'kB', 8000],
                ['megabit', 'Megabit', 'Mb', 1000000], ['megabyte', 'Megabyte', 'MB', 8000000], ['gigabit', 'Gigabit', 'Gb', 1000000000],
                ['gigabyte', 'Gigabyte', 'GB', 8000000000], ['terabyte', 'Terabyte', 'TB', 8000000000000]
            ]),
            popular: [['byte', 'bit'], ['gigabyte', 'megabyte'], ['megabyte', 'gigabit']]
        },
        transfer: {
            name: 'Data transfer rate', icon: '⇵',
            units: linearUnits([
                ['bit-per-second', 'Bit per second', 'bit/s', 1], ['byte-per-second', 'Byte per second', 'B/s', 8],
                ['kilobit-per-second', 'Kilobit per second', 'kb/s', 1000], ['megabit-per-second', 'Megabit per second', 'Mb/s', 1000000],
                ['gigabit-per-second', 'Gigabit per second', 'Gb/s', 1000000000], ['megabyte-per-second', 'Megabyte per second', 'MB/s', 8000000],
                ['gigabyte-per-second', 'Gigabyte per second', 'GB/s', 8000000000]
            ]),
            popular: [['megabit-per-second', 'megabyte-per-second'], ['gigabit-per-second', 'megabyte-per-second']]
        },
        energy: {
            name: 'Energy', icon: 'ϟ',
            units: linearUnits([
                ['joule', 'Joule', 'J', 1], ['kilojoule', 'Kilojoule', 'kJ', 1000], ['calorie', 'Calorie', 'cal', 4.184],
                ['kilocalorie', 'Kilocalorie', 'kcal', 4184], ['watt-hour', 'Watt-hour', 'Wh', 3600], ['kilowatt-hour', 'Kilowatt-hour', 'kWh', 3600000],
                ['btu', 'British thermal unit', 'BTU', 1055.05585262]
            ]),
            popular: [['kilowatt-hour', 'joule'], ['kilocalorie', 'calorie'], ['watt-hour', 'kilowatt-hour']]
        },
        power: {
            name: 'Power', icon: '⌁',
            units: linearUnits([
                ['watt', 'Watt', 'W', 1], ['kilowatt', 'Kilowatt', 'kW', 1000], ['megawatt', 'Megawatt', 'MW', 1000000],
                ['horsepower', 'Horsepower', 'hp', 745.6998716], ['metric-horsepower', 'Metric horsepower', 'PS', 735.49875]
            ]),
            popular: [['watt', 'horsepower'], ['kilowatt', 'horsepower'], ['megawatt', 'kilowatt']]
        },
        pressure: {
            name: 'Pressure', icon: '◌',
            units: linearUnits([
                ['pascal', 'Pascal', 'Pa', 1], ['kilopascal', 'Kilopascal', 'kPa', 1000], ['bar', 'Bar', 'bar', 100000],
                ['atmosphere', 'Atmosphere', 'atm', 101325], ['psi', 'Pounds per square inch', 'psi', 6894.757293], ['mmhg', 'Millimeters of mercury', 'mmHg', 133.3223874]
            ]),
            popular: [['bar', 'psi'], ['atmosphere', 'pascal'], ['kilopascal', 'psi']]
        },
        force: {
            name: 'Force', icon: '✣',
            units: linearUnits([
                ['newton', 'Newton', 'N', 1], ['kilonewton', 'Kilonewton', 'kN', 1000], ['dyne', 'Dyne', 'dyn', 0.00001],
                ['pound-force', 'Pound-force', 'lbf', 4.4482216153], ['kilogram-force', 'Kilogram-force', 'kgf', 9.80665]
            ]),
            popular: [['newton', 'pound-force'], ['kilonewton', 'newton'], ['newton', 'kilogram-force']]
        },
        fuel: {
            name: 'Fuel economy', icon: '⌂',
            units: [
                { id: 'km-per-liter', label: 'Kilometers per liter', short: 'km/L', toBase: (v) => v, fromBase: (v) => v },
                { id: 'liters-per-100km', label: 'Liters per 100 km', short: 'L/100 km', toBase: (v) => v === 0 ? 0 : 100 / v, fromBase: (v) => v === 0 ? 0 : 100 / v },
                { id: 'mpg-us', label: 'Miles per gallon (US)', short: 'mpg US', toBase: (v) => v * 0.4251437075, fromBase: (v) => v / 0.4251437075 },
                { id: 'mpg-uk', label: 'Miles per gallon (UK)', short: 'mpg UK', toBase: (v) => v * 0.3540061899, fromBase: (v) => v / 0.3540061899 }
            ],
            popular: [['km-per-liter', 'mpg-us'], ['liters-per-100km', 'km-per-liter'], ['mpg-us', 'mpg-uk']]
        },
        angle: {
            name: 'Angle', icon: '∠',
            units: linearUnits([
                ['degree', 'Degree', '°', Math.PI / 180], ['radian', 'Radian', 'rad', 1], ['gradian', 'Gradian', 'gon', Math.PI / 200],
                ['arcminute', 'Arcminute', '′', Math.PI / 10800], ['arcsecond', 'Arcsecond', '″', Math.PI / 648000]
            ]),
            popular: [['degree', 'radian'], ['radian', 'degree'], ['degree', 'arcminute']]
        },
        cooking: {
            name: 'Cooking volume', icon: '♨',
            units: linearUnits([
                ['teaspoon', 'Teaspoon', 'tsp', 4.92892159375], ['tablespoon', 'Tablespoon', 'tbsp', 14.7867647813],
                ['us-cup', 'US cup', 'cup', 236.5882365], ['us-pint', 'US pint', 'pt', 473.176473], ['us-quart', 'US quart', 'qt', 946.352946],
                ['us-gallon', 'US gallon', 'gal', 3785.411784], ['milliliter', 'Milliliter', 'mL', 1], ['liter', 'Liter', 'L', 1000]
            ]),
            popular: [['us-cup', 'milliliter'], ['tablespoon', 'teaspoon'], ['liter', 'us-gallon']]
        },
        density: {
            name: 'Density', icon: '▤',
            units: linearUnits([
                ['kilogram-per-cubic-meter', 'Kilogram per cubic meter', 'kg/m³', 1], ['gram-per-cubic-centimeter', 'Gram per cubic centimeter', 'g/cm³', 1000],
                ['kilogram-per-liter', 'Kilogram per liter', 'kg/L', 1000], ['pound-per-cubic-foot', 'Pound per cubic foot', 'lb/ft³', 16.01846337]
            ]),
            popular: [['gram-per-cubic-centimeter', 'kilogram-per-cubic-meter'], ['kilogram-per-liter', 'pound-per-cubic-foot']]
        }
    };

    const categoryKeys = Object.keys(converterData);
    const categoryList = $('#category-list');
    const categorySearch = $('#category-search');
    const fromUnit = $('#from-unit');
    const toUnit = $('#to-unit');
    const convertInput = $('#convert-input');
    const convertOutput = $('#convert-output');
    const conversionSummary = $('#conversion-summary');
    const popularList = $('#popular-list');
    let activeCategory = 'length';

    const findUnit = (category, id) => converterData[category].units.find((unit) => unit.id === id);
    const formatConverted = (value) => Number.isFinite(value) ? converterFormatter.format(value) : '—';

    function renderCategoryList() {
        const query = categorySearch.value.trim().toLowerCase();
        const visibleKeys = categoryKeys.filter((key) => {
            const category = converterData[key];
            const searchable = `${category.name} ${category.units.map((unit) => `${unit.label} ${unit.short}`).join(' ')}`.toLowerCase();
            return searchable.includes(query);
        });

        if (!visibleKeys.includes(activeCategory) && visibleKeys.length) activeCategory = visibleKeys[0];
        categoryList.textContent = '';

        if (!visibleKeys.length) {
            const empty = document.createElement('p');
            empty.className = 'panel-label';
            empty.textContent = 'No matching converter';
            categoryList.appendChild(empty);
            return;
        }

        visibleKeys.forEach((key) => {
            const category = converterData[key];
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `category-button${key === activeCategory ? ' is-active' : ''}`;
            button.dataset.category = key;
            const icon = document.createElement('span');
            icon.className = 'category-icon';
            icon.textContent = category.icon;
            const label = document.createElement('span');
            label.textContent = category.name;
            button.append(icon, label);
            button.addEventListener('click', () => {
                activeCategory = key;
                renderCategoryList();
                renderConverter();
            });
            categoryList.appendChild(button);
        });
    }

    function populateSelect(select, units, selectedId) {
        select.textContent = '';
        units.forEach((unit) => {
            const option = document.createElement('option');
            option.value = unit.id;
            option.textContent = `${unit.label} (${unit.short})`;
            option.selected = unit.id === selectedId;
            select.appendChild(option);
        });
    }

    function convertValue() {
        const category = converterData[activeCategory];
        const from = findUnit(activeCategory, fromUnit.value) || category.units[0];
        const to = findUnit(activeCategory, toUnit.value) || category.units[1] || category.units[0];
        const input = Number.parseFloat(convertInput.value);
        const output = Number.isFinite(input) ? to.fromBase(from.toBase(input)) : NaN;
        convertOutput.textContent = formatConverted(output);
        const inputLabel = Number.isFinite(input) ? formatConverted(input) : '—';
        conversionSummary.textContent = `${inputLabel} ${from.label} = ${formatConverted(output)} ${to.label}`;
    }

    function renderPopular(category) {
        popularList.textContent = '';
        category.popular.forEach(([fromId, toId]) => {
            const from = findUnit(activeCategory, fromId);
            const to = findUnit(activeCategory, toId);
            if (!from || !to) return;
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'popular-chip';
            button.textContent = `${from.short} → ${to.short}`;
            button.title = `${from.label} to ${to.label}`;
            button.addEventListener('click', () => {
                fromUnit.value = from.id;
                toUnit.value = to.id;
                convertValue();
            });
            popularList.appendChild(button);
        });
    }

    function renderConverter() {
        const category = converterData[activeCategory];
        const previousFrom = fromUnit.value;
        const previousTo = toUnit.value;
        $('#active-category-title').textContent = category.name;
        populateSelect(fromUnit, category.units, category.units.some((unit) => unit.id === previousFrom) ? previousFrom : category.units[0].id);
        populateSelect(toUnit, category.units, category.units.some((unit) => unit.id === previousTo && unit.id !== fromUnit.value) ? previousTo : (category.units[1] || category.units[0]).id);
        convertInput.value = convertInput.value || 1;
        renderPopular(category);
        convertValue();
    }

    categorySearch.addEventListener('input', () => {
        renderCategoryList();
        renderConverter();
    });
    $('#clear-search').addEventListener('click', () => {
        categorySearch.value = '';
        renderCategoryList();
        renderConverter();
        categorySearch.focus();
    });
    [convertInput, fromUnit, toUnit].forEach((element) => {
        element.addEventListener('input', convertValue);
        element.addEventListener('change', convertValue);
    });
    $('#swap-units').addEventListener('click', () => {
        const currentFrom = fromUnit.value;
        fromUnit.value = toUnit.value;
        toUnit.value = currentFrom;
        convertValue();
    });
    $('#copy-result').addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(convertOutput.textContent);
            const button = $('#copy-result');
            const original = button.textContent;
            button.textContent = 'Copied!';
            window.setTimeout(() => { button.textContent = original; }, 1200);
        } catch {
            // Clipboard access can be unavailable on file:// pages; the value remains visible.
        }
    });

    $('#unit-count').textContent = categoryKeys.reduce((total, key) => total + converterData[key].units.length, 0);
    renderCategoryList();
    renderConverter();
    calculateAndRender();
});
