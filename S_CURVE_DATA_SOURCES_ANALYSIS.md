# 📊 S-CURVE DATA SOURCES DEEP DIVE

## 🎯 OVERVIEW
The S-curve in Earned Value Management shows three key metrics over time:
- **PV (Planned Value)** - What should have been spent by this date
- **EV (Earned Value)** - What has been earned/accomplished by this date  
- **AC (Actual Cost)** - What has actually been spent by this date

## 📈 PLANNED VALUE (PV) - WHERE IT COMES FROM

### **S-Curve Calculation:**
```javascript
// For each date point in S-curve:
const timeProgress = elapsedTime / totalDuration;
itemPV = originalBudget * timeProgress;
```

### **Data Sources (Priority Order):**
1. **Original Budget Amount** (`item.originalBudget`)
   - **Source**: ACC Budget data
   - **Priority**: Revised > Original > Amount > Attributes
   - **Fields**: `budget.revised`, `budget.originalAmount`, `budget.amount`
   - **Calculation**: `originalBudget * timeProgress`

2. **Time Progression**
   - **Start Date**: `item.plannedStart` (from budget dates)
   - **End Date**: `item.plannedFinish` (from budget dates)
   - **Formula**: `(currentDate - startDate) / (endDate - startDate)`

3. **Budget Schedule**
   - **Source**: Budget planned start/finish dates
   - **Fallback**: Default to year start/end if not available
   - **Logic**: Only include budgets that have started (`date >= itemStart`)

## 💰 EARNED VALUE (EV) - WHERE IT COMES FROM

### **S-Curve Calculation:**
```javascript
const physicalProgress = item.physicalProgress || 0;
itemEV = originalBudget * physicalProgress;
```

### **Data Sources (Priority Order):**
1. **Physical Progress** (`item.physicalProgress`)
   - **Primary Formula**: `(budget output / budget planned output)`
   - **Source**: Timesheet data aggregation
   - **Calculation**: `Math.min(1, budgetOutput / budgetPlannedOutput)`

2. **Budget Output Data**
   - **Tracked Output**: Sum of `ts.outputUnits` from timesheets
   - **Planned Output**: `budget.plannedOutput` or `budget.quantity`
   - **Source**: Archived timesheets filtered by budget

3. **Progress Validation**
   - **Warning**: If `budgetOutput > budgetPlannedOutput`
   - **Capping**: `Math.min(1, ratio)` to prevent >100% progress

## 💸 ACTUAL COST (AC) - WHERE IT COMES FROM

### **S-Curve Calculation:**
```javascript
itemAC = item.actualCost || 0;
```

### **Data Sources (Priority Order):**
1. **Expense Tab Total Costs** (HIGHEST PRIORITY)
   - **Source**: `expenseCosts[budgetId].totalExpenseCost`
   - **Data**: Synced expenses from Expense Tab
   - **Storage**: `localStorage('zoyantra_created_expenses')`

2. **ACC Budget Actual Costs**
   - **Source**: `accActualCosts[budgetId]`
   - **Data**: ACC API budget actual costs
   - **Method**: `accService.getProjectActualCosts()`

3. **Synced Expenses**
   - **Source**: `expenses.filter(expense => expense.budgetId === budgetId)`
   - **Data**: Archived expenses with `status === 'synced'`
   - **Calculation**: Sum of `expense.amount`

4. **Performance Tracker**
   - **Source**: `accPerformanceData[budgetId].actualCost`
   - **Data**: ACC Performance Tracker data
   - **Method**: `accService.getPerformanceData()`

5. **Local Budget Actuals**
   - **Source**: `actuals[budgetId]`
   - **Data**: Local budget actuals
   - **Fallback**: When no ACC data available

6. **Timesheet Hourly Rate** (LAST RESORT)
   - **Source**: `timesheet.hourlyRate * timesheet.hours`
   - **Data**: Archived timesheets
   - **Calculation**: Sum of hourly costs per budget

## 📊 SCHEDULE VARIANCE (SV) - WHERE IT COMES FROM

### **S-Curve Calculation:**
```javascript
// SV is calculated as: EV - PV
// But in S-curve, we show PV, EV, AC separately
// SV is derived from the difference between EV and PV lines
```

### **Data Sources:**
1. **EV Line**: Based on physical progress (timesheet output data)
2. **PV Line**: Based on time progression (budget schedule)
3. **SV Calculation**: `EV - PV` (positive = ahead, negative = behind)

## 🔄 DATA FLOW IN S-CURVE

### **Step 1: Data Loading**
```javascript
// Load EVM items with all data sources
const evmData = useMemo(() => {
  // Calculate PV, EV, AC for each budget
  // Store in evmItems array
}, [dependencies]);
```

### **Step 2: S-Curve Generation**
```javascript
// For each date point:
filteredItems.forEach(item => {
  // Get item data
  const originalBudget = item.originalBudget;      // From ACC budget
  const physicalProgress = item.physicalProgress;  // From timesheets
  const actualCost = item.actualCost;             // From expense data
  
  // Calculate time-based PV
  const timeProgress = (date - startDate) / (endDate - startDate);
  itemPV = originalBudget * timeProgress;
  
  // Calculate progress-based EV
  itemEV = originalBudget * physicalProgress;
  
  // Use actual cost
  itemAC = actualCost;
});
```

### **Step 3: Data Aggregation**
```javascript
// Sum all items for each date
pv += itemPV;  // Sum of all budget PVs
ev += itemEV;  // Sum of all budget EVs  
ac += itemAC;  // Sum of all budget ACs
```

## 🎯 KEY INSIGHTS

### **PV (Planned Value) Sources:**
- ✅ **Time-based**: Uses budget start/finish dates
- ✅ **Linear progression**: PV increases linearly over time
- ✅ **Budget-driven**: Based on original budget amounts

### **EV (Earned Value) Sources:**
- ✅ **Progress-based**: Uses actual physical progress
- ✅ **Timesheet-driven**: Based on output units completed
- ✅ **Real work**: Reflects actual work accomplished

### **AC (Actual Cost) Sources:**
- ✅ **Expense-driven**: Prioritizes synced expenses
- ✅ **ACC-integrated**: Uses ACC budget actuals
- ✅ **Multi-source**: Falls back through multiple data sources

### **SV (Schedule Variance) Sources:**
- ✅ **Derived metric**: SV = EV - PV
- ✅ **Visual indicator**: Gap between EV and PV lines
- ✅ **Performance measure**: Shows schedule performance

## 🚨 CRITICAL DEPENDENCIES

1. **Budget Dates**: Need `plannedStart` and `plannedFinish` for PV calculation
2. **Timesheet Data**: Need output units for EV calculation  
3. **Expense Data**: Need synced expenses for AC calculation
4. **Current Date**: Need `reportDate` for time-based calculations

## 📝 DEBUGGING OUTPUT

The S-curve includes extensive console logging:
```javascript
console.log('📊 S-Curve calculation for ${item.itemName} on ${dateStr}:', {
  timeProgress: timeProgress.toFixed(3),
  physicalProgress: physicalProgress.toFixed(3), 
  originalBudget: originalBudget,
  calculatedPV: itemPV.toFixed(2),
  calculatedEV: itemEV.toFixed(2),
  calculatedAC: itemAC.toFixed(2)
});
```

This provides full visibility into how each value is calculated for each budget on each date point.
