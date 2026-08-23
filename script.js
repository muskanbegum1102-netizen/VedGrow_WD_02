/**
 * EasyConvert - Temperature & Unit Converter Web App
 * Highly commented, beginner-friendly JavaScript codebase.
 */

// ==========================================================================
// 1. CONVERSION CONFIGURATIONS AND FORMULAS
// ==========================================================================

// Define the units and conversion functions for each category
const CONVERSIONS = {
    temperature: {
        name: 'Temperature',
        units: [
            { id: 'C', name: 'Celsius (°C)', symbol: '°C' },
            { id: 'F', name: 'Fahrenheit (°F)', symbol: '°F' },
            { id: 'K', name: 'Kelvin (K)', symbol: 'K' }
        ],
        // Temperature conversions are non-linear, so we use direct calculations
        convert: (value, from, to) => {
            if (from === to) return value;
            
            // Step 1: Convert source unit to Celsius
            let celsius;
            if (from === 'C') {
                celsius = value;
            } else if (from === 'F') {
                celsius = (value - 32) * 5 / 9;
            } else if (from === 'K') {
                celsius = value - 273.15;
            }
            
            // Step 2: Convert Celsius to target unit
            if (to === 'C') {
                return celsius;
            } else if (to === 'F') {
                return (celsius * 9 / 5) + 32;
            } else if (to === 'K') {
                return celsius + 273.15;
            }
            return value;
        }
    },
    length: {
        name: 'Length',
        units: [
            { id: 'm', name: 'Meter (m)', symbol: 'm', factor: 1 },
            { id: 'km', name: 'Kilometer (km)', symbol: 'km', factor: 1000 },
            { id: 'cm', name: 'Centimeter (cm)', symbol: 'cm', factor: 0.01 }
        ],
        // Linear conversion via factor (factor is how many meters are in 1 unit)
        convert: (value, from, to) => {
            const units = CONVERSIONS.length.units;
            const fromUnit = units.find(u => u.id === from);
            const toUnit = units.find(u => u.id === to);
            
            if (!fromUnit || !toUnit) return value;
            
            // Convert to base unit (Meter) first, then to the target unit
            const baseValue = value * fromUnit.factor;
            return baseValue / toUnit.factor;
        }
    },
    weight: {
        name: 'Weight',
        units: [
            { id: 'kg', name: 'Kilogram (kg)', symbol: 'kg', factor: 1 },
            { id: 'g', name: 'Gram (g)', symbol: 'g', factor: 0.001 },
            { id: 'lb', name: 'Pound (lb)', symbol: 'lb', factor: 0.45359237 }
        ],
        // Linear conversion via factor (factor is how many kilograms are in 1 unit)
        convert: (value, from, to) => {
            const units = CONVERSIONS.weight.units;
            const fromUnit = units.find(u => u.id === from);
            const toUnit = units.find(u => u.id === to);
            
            if (!fromUnit || !toUnit) return value;
            
            // Convert to base unit (Kilogram) first, then to the target unit
            const baseValue = value * fromUnit.factor;
            return baseValue / toUnit.factor;
        }
    }
};

// ==========================================================================
// 2. DOM ELEMENT SELECTORS
// ==========================================================================

const tabs = document.querySelectorAll('.tab-btn');
const inputValue = document.getElementById('input-value');
const outputValue = document.getElementById('output-value');
const selectFromUnit = document.getElementById('select-from-unit');
const selectToUnit = document.getElementById('select-to-unit');
const btnSwap = document.getElementById('btn-swap');
const errorMessage = document.getElementById('error-message');
const historyList = document.getElementById('history-list');
const btnClearHistory = document.getElementById('btn-clear-history');
const emptyHistoryMsg = document.getElementById('empty-history-msg');

// State Variables
let currentCategory = 'temperature';
let historySaveTimeout = null;

// ==========================================================================
// 3. CORE FUNCTIONALITY & LOGIC
// ==========================================================================

/**
 * Initialize the dropdown selections based on current category
 */
function populateUnitDropdowns() {
    const categoryData = CONVERSIONS[currentCategory];
    
    // Clear previous options
    selectFromUnit.innerHTML = '';
    selectToUnit.innerHTML = '';
    
    // Add options for each unit
    categoryData.units.forEach(unit => {
        const optionFrom = document.createElement('option');
        optionFrom.value = unit.id;
        optionFrom.textContent = unit.name;
        selectFromUnit.appendChild(optionFrom);

        const optionTo = document.createElement('option');
        optionTo.value = unit.id;
        optionTo.textContent = unit.name;
        selectToUnit.appendChild(optionTo);
    });

    // Default select state: From = first unit, To = second unit
    if (categoryData.units.length > 1) {
        selectFromUnit.selectedIndex = 0;
        selectToUnit.selectedIndex = 1;
    }
}

/**
 * Validates the inputs depending on the category rules
 * Returns { isValid: boolean, message: string }
 */
function validateInput(value, fromUnit) {
    // If the input is empty, it's not a validation error, we just clear outputs
    if (inputValue.value.trim() === '') {
        return { isValid: true, message: '' };
    }

    // Check if the input is not a number
    if (isNaN(value)) {
        return { isValid: false, message: 'Please enter a valid number.' };
    }

    // Length and Weight must not be negative
    if ((currentCategory === 'length' || currentCategory === 'weight') && value < 0) {
        return { isValid: false, message: `${CONVERSIONS[currentCategory].name} cannot be negative.` };
    }

    // Absolute zero checks for temperature
    if (currentCategory === 'temperature') {
        if (fromUnit === 'K' && value < 0) {
            return { isValid: false, message: 'Kelvin temperature cannot be below absolute zero (0 K).' };
        }
        if (fromUnit === 'C' && value < -273.15) {
            return { isValid: false, message: 'Celsius temperature cannot be below absolute zero (-273.15 °C).' };
        }
        if (fromUnit === 'F' && value < -459.67) {
            return { isValid: false, message: 'Fahrenheit temperature cannot be below absolute zero (-459.67 °F).' };
        }
    }

    return { isValid: true, message: '' };
}

/**
 * Formats a number to be user-friendly (rounds to 4 decimal places and strips trailing zeros)
 */
function formatNumber(num) {
    // Number.toFixed formats it to a string; parseFloat removes any unnecessary trailing zeros
    return parseFloat(Number(num).toFixed(4));
}

/**
 * Perform conversion and update UI
 */
function performConversion() {
    const rawValue = parseFloat(inputValue.value);
    const fromUnit = selectFromUnit.value;
    const toUnit = selectToUnit.value;
    
    // Clear any previous error and output if there is no input
    if (inputValue.value.trim() === '') {
        outputValue.value = '';
        hideError();
        return;
    }

    // Run input validation rules
    const validation = validateInput(rawValue, fromUnit);
    if (!validation.isValid) {
        showError(validation.message);
        outputValue.value = '';
        return;
    }

    // Clear error message since the input is valid
    hideError();

    // Calculate result
    const result = CONVERSIONS[currentCategory].convert(rawValue, fromUnit, toUnit);
    
    // Display result formatted beautifully
    outputValue.value = formatNumber(result);

    // Trigger debounced storage logic to prevent saving intermediate keystrokes
    debounceHistorySave(rawValue, fromUnit, result, toUnit);
}

/**
 * Display an error message to the user
 */
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'flex';
}

/**
 * Hide the error message container
 */
function hideError() {
    errorMessage.textContent = '';
    errorMessage.style.display = 'none';
}

/**
 * Swaps "From" and "To" selected units and recalculates
 */
function handleSwap() {
    const tempUnit = selectFromUnit.value;
    selectFromUnit.value = selectToUnit.value;
    selectToUnit.value = tempUnit;

    // If there is an existing output, swap the output to input and convert
    // Otherwise, just re-convert based on existing input
    if (outputValue.value !== '' && !isNaN(parseFloat(outputValue.value))) {
        inputValue.value = outputValue.value;
    }

    performConversion();
}

// ==========================================================================
// 4. LOCALSTORAGE & HISTORY MANAGEMENT
// ==========================================================================

/**
 * Debounce saving history so we only save when the user stops typing
 */
function debounceHistorySave(fromVal, fromUnit, toVal, toUnit) {
    // Clear previous pending timeout
    if (historySaveTimeout) {
        clearTimeout(historySaveTimeout);
    }

    // Start a new 1.2-second timer to save conversion
    historySaveTimeout = setTimeout(() => {
        saveToHistory(fromVal, fromUnit, toVal, toUnit);
    }, 1200);
}

/**
 * Returns the unit symbol based on unit ID
 */
function getUnitSymbol(unitId) {
    const categoryData = CONVERSIONS[currentCategory];
    const unit = categoryData.units.find(u => u.id === unitId);
    return unit ? unit.symbol : unitId;
}

/**
 * Saves a valid conversion record to local storage
 */
function saveToHistory(fromVal, fromUnit, toVal, toUnit) {
    // Don't save duplicate consecutive conversions or conversions with identical units & values
    if (fromUnit === toUnit && fromVal === toVal) return;

    const history = getHistory();
    
    const newEntry = {
        id: Date.now(),
        categoryName: CONVERSIONS[currentCategory].name,
        fromVal: formatNumber(fromVal),
        fromSymbol: getUnitSymbol(fromUnit),
        toVal: formatNumber(toVal),
        toSymbol: getUnitSymbol(toUnit)
    };

    // Check if the exact same conversion is already the latest item in history to avoid duplication
    if (history.length > 0) {
        const last = history[0];
        if (last.fromVal === newEntry.fromVal && 
            last.fromSymbol === newEntry.fromSymbol && 
            last.toVal === newEntry.toVal && 
            last.toSymbol === newEntry.toSymbol) {
            return; // Exit to avoid duplicate entries
        }
    }

    // Insert new entry at the beginning (newest first)
    history.unshift(newEntry);

    // Limit history list to top 5 entries
    const updatedHistory = history.slice(0, 5);

    // Save back to localStorage
    localStorage.setItem('conversionHistory', JSON.stringify(updatedHistory));

    // Refresh history panel
    renderHistory();
}

/**
 * Retrieves the history array from localStorage
 */
function getHistory() {
    const historyJSON = localStorage.getItem('conversionHistory');
    return historyJSON ? JSON.parse(historyJSON) : [];
}

/**
 * Renders history items to the DOM
 */
function renderHistory() {
    const history = getHistory();
    historyList.innerHTML = '';

    if (history.length === 0) {
        emptyHistoryMsg.style.display = 'block';
        btnClearHistory.disabled = true;
        return;
    }

    emptyHistoryMsg.style.display = 'none';
    btnClearHistory.disabled = false;

    history.forEach(item => {
        const li = document.createElement('li');
        li.className = 'history-item';
        
        li.innerHTML = `
            <span class="history-formula">
                ${item.fromVal} ${item.fromSymbol} &rarr; ${item.toVal} ${item.toSymbol}
            </span>
            <span class="history-cat">${item.categoryName}</span>
        `;
        
        historyList.appendChild(li);
    });
}

/**
 * Wipes out all history from localstorage and redraws the empty UI state
 */
function clearHistory() {
    localStorage.removeItem('conversionHistory');
    renderHistory();
}

// ==========================================================================
// 5. EVENT LISTENERS
// ==========================================================================

// Handle switching categories via tab headers
tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
        // Remove active class from all tabs
        tabs.forEach(t => {
            t.classList.remove('active');
            t.setAttribute('aria-selected', 'false');
        });

        // Set active state on target tab
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');

        // Update category state
        currentCategory = tab.getAttribute('data-category');

        // Clear input value and output value for the new category
        inputValue.value = '';
        outputValue.value = '';
        hideError();

        // Populate dropdown selectors with correct unit options
        populateUnitDropdowns();
        
        // Focus the input element for better UX
        inputValue.focus();
    });
});

// Event listeners for real-time calculations
inputValue.addEventListener('input', performConversion);
selectFromUnit.addEventListener('change', performConversion);
selectToUnit.addEventListener('change', performConversion);

// Event listener for Swap button
btnSwap.addEventListener('click', handleSwap);

// Event listener for Clear History button
btnClearHistory.addEventListener('click', clearHistory);

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    populateUnitDropdowns();
    renderHistory();
});
