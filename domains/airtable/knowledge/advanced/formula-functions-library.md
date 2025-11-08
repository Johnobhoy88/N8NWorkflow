# Airtable Formula Functions - Complete Library (2025)

## Table of Contents
- [Formula Basics](#formula-basics)
- [Text Functions](#text-functions)
- [Number & Math Functions](#number--math-functions)
- [Logical Functions](#logical-functions)
- [Date & Time Functions](#date--time-functions)
- [Record Functions](#record-functions)
- [Array Functions](#array-functions)
- [Advanced Patterns](#advanced-patterns)
- [Common Use Cases](#common-use-cases)

---

## Formula Basics

### Syntax Rules

```
Basic operators:  + - * / % &
Comparison:       = != < <= > >=
Logical:          AND() OR() NOT() IF() SWITCH()
Field reference:  {Field Name}
String literal:   'text' or "text"
```

### Data Types

```
Number:    42, 3.14, -100
String:    'Hello', "World"
Boolean:   TRUE(), FALSE()
Date:      TODAY(), NOW()
Array:     [value1, value2, value3]
Blank:     BLANK()
```

---

## Text Functions

### CONCATENATE() / &

**Combine text strings:**
```
CONCATENATE({First Name}, ' ', {Last Name})
// Or using &:
{First Name} & ' ' & {Last Name}
// Result: "John Doe"
```

**Complex example:**
```
'Order #' & {Order Number} & ' - ' & {Status} & ' (' & {Count} & ' items)'
// Result: "Order #12345 - Shipped (3 items)"
```

---

### LEFT(), RIGHT(), MID()

**Extract portions of text:**
```
// First 3 characters
LEFT({Product Code}, 3)
// Input: "ABC-12345" → Output: "ABC"

// Last 4 characters
RIGHT({Phone}, 4)
// Input: "555-123-4567" → Output: "4567"

// Extract middle portion
MID({Email}, FIND('@', {Email}) + 1, LEN({Email}))
// Input: "user@company.com" → Output: "company.com"
```

---

### LEN()

**String length:**
```
LEN({Description})
// Input: "Hello World" → Output: 11

// Character count indicator
LEN({Description}) & ' / 280 characters'
// Output: "145 / 280 characters"
```

---

### FIND() & SEARCH()

**Find substring position:**
```
// FIND is case-sensitive
FIND('gmail', {Email})
// Input: "user@gmail.com" → Output: 6
// Input: "user@Gmail.com" → Output: 0 (not found)

// SEARCH is case-insensitive
SEARCH('gmail', {Email})
// Input: "user@Gmail.com" → Output: 6
```

**Extract domain from email:**
```
MID({Email}, FIND('@', {Email}) + 1, LEN({Email}))
// Input: "john@company.com" → Output: "company.com"
```

---

### SUBSTITUTE()

**Replace text:**
```
SUBSTITUTE({Phone}, '-', '')
// Input: "555-123-4567" → Output: "5551234567"

// Replace multiple times
SUBSTITUTE(SUBSTITUTE({Text}, 'old', 'new'), 'foo', 'bar')
```

---

### TRIM(), LOWER(), UPPER()

**Text formatting:**
```
TRIM({Name})
// Input: "  John Doe  " → Output: "John Doe"

LOWER({Email})
// Input: "John@Example.COM" → Output: "john@example.com"

UPPER({Country Code})
// Input: "usa" → Output: "USA"
```

---

### REPT()

**Repeat text:**
```
REPT('⭐', {Rating})
// Input: Rating = 3 → Output: "⭐⭐⭐"

// Progress bar
REPT('▓', {Progress} / 10) & REPT('░', 10 - {Progress} / 10)
// Input: Progress = 70 → Output: "▓▓▓▓▓▓▓░░░"
```

---

### ENCODE_URL_COMPONENT()

**URL encoding:**
```
'https://example.com/search?q=' & ENCODE_URL_COMPONENT({Search Term})
// Input: Search Term = "hello world" → Output: "...?q=hello%20world"
```

---

## Number & Math Functions

### Basic Arithmetic

```
{Price} * {Quantity}
{Total} - {Discount}
{Amount} / {Count}
{Base} + {Tax}
{Value} % 100  // Modulo
```

---

### ROUND(), ROUNDUP(), ROUNDDOWN()

```
ROUND({Price}, 2)
// Input: 19.856 → Output: 19.86

ROUNDUP({Price}, 0)
// Input: 19.2 → Output: 20

ROUNDDOWN({Price}, 1)
// Input: 19.87 → Output: 19.8
```

---

### ABS(), SQRT(), POWER()

```
ABS({Balance})
// Input: -150 → Output: 150

SQRT({Area})
// Input: 16 → Output: 4

POWER({Base}, {Exponent})
// Input: Base=2, Exponent=3 → Output: 8
```

---

### MOD()

**Modulo operation:**
```
MOD({Number}, 2)
// Check if even: Result = 0
// Check if odd: Result = 1

// Alternate row colors
IF(MOD(RECORD_ID(), 2) = 0, '⚪', '⚫')
```

---

### INT()

**Integer part:**
```
INT({Value})
// Input: 19.87 → Output: 19

// Extract dollars from price
'$' & INT({Price}) & '.' & RIGHT('0' & ROUND(({Price} - INT({Price})) * 100, 0), 2)
// Input: 19.5 → Output: "$19.50"
```

---

### MAX(), MIN()

```
MAX({Quantity}, {Minimum Order})
// Returns larger of two values

MIN({Budget}, {Actual Cost})
// Returns smaller of two values

// Nested
MAX(0, {Balance} - {Minimum Balance})
// Ensure non-negative result
```

---

### SUM(), AVERAGE(), COUNT()

**For arrays/rollups:**
```
SUM({values})
// Input: [1, 2, 3, 4, 5] → Output: 15

AVERAGE({values})
// Input: [10, 20, 30] → Output: 20

COUNT({values})
// Input: [1, 2, 3, 4, 5] → Output: 5
```

---

## Logical Functions

### IF()

**Basic conditional:**
```
IF({Status} = 'Paid', '✅ Paid', '❌ Unpaid')

// Nested IF (multiple conditions)
IF(
  {Score} >= 90, 'A',
  IF(
    {Score} >= 80, 'B',
    IF(
      {Score} >= 70, 'C',
      IF(
        {Score} >= 60, 'D',
        'F'
      )
    )
  )
)
```

---

### SWITCH()

**Better than nested IF for multiple conditions:**
```
SWITCH(
  {Status},
  'New', '🆕',
  'In Progress', '🔄',
  'Completed', '✅',
  'Cancelled', '❌',
  '❓'  // Default
)

// With expressions
SWITCH(
  TRUE(),
  {Score} >= 90, 'A',
  {Score} >= 80, 'B',
  {Score} >= 70, 'C',
  {Score} >= 60, 'D',
  'F'
)
```

---

### AND(), OR(), NOT()

```
// All conditions must be true
AND({Email} != '', {Phone} != '', {Address} != '')
// Output: TRUE only if all fields filled

// At least one condition must be true
OR({Priority} = 'High', {Priority} = 'Critical')

// Negate condition
NOT({Archived})
// Output: TRUE if NOT archived

// Complex logic
AND(
  OR({Status} = 'Active', {Status} = 'Pending'),
  {Balance} > 0,
  NOT({Blacklisted})
)
```

---

### XOR()

**Exclusive OR:**
```
XOR({Has Email}, {Has Phone})
// TRUE if exactly one is true, FALSE if both or neither
```

---

### BLANK(), IS_BLANK()

```
// Return blank value
IF({Condition}, {Value}, BLANK())

// Check if field is blank
IF(IS_BLANK({Email}), 'No email', {Email})
```

---

## Date & Time Functions

### TODAY(), NOW()

```
TODAY()
// Output: 2025-01-08 (date only, no time)

NOW()
// Output: 2025-01-08 10:30:00 (with time)
```

---

### DATEADD()

**Add time to date:**
```
DATEADD({Start Date}, 7, 'days')
// Add 7 days

DATEADD({Created}, 2, 'weeks')
// Add 2 weeks

DATEADD({Due Date}, -1, 'months')
// Subtract 1 month

// Units: 'seconds', 'minutes', 'hours', 'days', 'weeks', 'months', 'years'
```

**Calculate due date:**
```
DATEADD(TODAY(), {Days to Complete}, 'days')
```

---

### DATETIME_DIFF()

**Difference between dates:**
```
DATETIME_DIFF({End Date}, {Start Date}, 'days')
// Output: Number of days between dates

DATETIME_DIFF(NOW(), {Created}, 'hours')
// Hours since creation

// Days until deadline
DATETIME_DIFF({Deadline}, TODAY(), 'days')

// Units: 'milliseconds', 'seconds', 'minutes', 'hours', 'days', 'weeks', 'months', 'years'
```

**Age calculation:**
```
DATETIME_DIFF(TODAY(), {Birth Date}, 'years')
```

---

### DATETIME_FORMAT()

**Format date for display:**
```
DATETIME_FORMAT({Date}, 'YYYY-MM-DD')
// Output: "2025-01-08"

DATETIME_FORMAT(NOW(), 'MMMM DD, YYYY')
// Output: "January 08, 2025"

DATETIME_FORMAT({Created}, 'M/D/YY h:mm A')
// Output: "1/8/25 10:30 AM"

// Common formats:
// YYYY - 4-digit year (2025)
// YY - 2-digit year (25)
// MMMM - Full month (January)
// MMM - Short month (Jan)
// MM - 2-digit month (01)
// M - Month (1)
// DD - 2-digit day (08)
// D - Day (8)
// HH - 24-hour (14)
// h - 12-hour (2)
// mm - Minutes (05)
// ss - Seconds (30)
// A - AM/PM
```

---

### DATETIME_PARSE()

**Parse string to date:**
```
DATETIME_PARSE({Date String}, 'MM/DD/YYYY')
// Input: "01/08/2025" → Output: Date object

DATETIME_PARSE({Date String}, 'YYYY-MM-DD')
// Input: "2025-01-08" → Output: Date object
```

---

### WEEKDAY(), WEEKNUM()

```
WEEKDAY({Date})
// Output: 0 (Sunday) to 6 (Saturday)

// Is weekend?
OR(WEEKDAY({Date}) = 0, WEEKDAY({Date}) = 6)

WEEKNUM({Date})
// Output: Week number of year (1-52)
```

---

### IS_BEFORE(), IS_AFTER(), IS_SAME()

```
IS_BEFORE({Start Date}, TODAY())
// TRUE if Start Date is in the past

IS_AFTER({Due Date}, TODAY())
// TRUE if Due Date is in the future

IS_SAME({Date}, TODAY(), 'day')
// TRUE if Date is today

// Units: 'day', 'week', 'month', 'year'
```

**Overdue indicator:**
```
IF(
  AND({Status} != 'Completed', IS_BEFORE({Due Date}, TODAY())),
  '🔴 Overdue',
  '✅ On Track'
)
```

---

## Record Functions

### RECORD_ID()

**Unique record identifier:**
```
RECORD_ID()
// Output: "recABCDEF123456"

// Generate sequential number
VALUE(RIGHT(RECORD_ID(), 6))
// Extracts numeric portion
```

---

### CREATED_TIME(), LAST_MODIFIED_TIME()

```
CREATED_TIME()
// When record was created

LAST_MODIFIED_TIME()
// When record was last updated

// Days since created
DATETIME_DIFF(NOW(), CREATED_TIME(), 'days')

// Last modified by field doesn't exist in formula
// Use automation or Last Modified By field type
```

---

## Array Functions

### ARRAYJOIN()

**Join array elements:**
```
ARRAYJOIN({Tags}, ', ')
// Input: ['Tag1', 'Tag2', 'Tag3'] → Output: "Tag1, Tag2, Tag3"

ARRAYJOIN({Linked Records}, ' • ')
// Custom separator
```

---

### ARRAYUNIQUE()

**Remove duplicates:**
```
ARRAYUNIQUE({Values})
// Input: [1, 2, 2, 3, 3, 3] → Output: [1, 2, 3]
```

---

### ARRAYFLATTEN()

**Flatten nested arrays:**
```
ARRAYFLATTEN([{Array 1}, {Array 2}])
// Combine multiple arrays into one
```

---

### ARRAYCOMPACT()

**Remove empty values:**
```
ARRAYCOMPACT({Values})
// Input: [1, '', 2, null, 3] → Output: [1, 2, 3]
```

---

## Advanced Patterns

### Status Icon Indicators

```
SWITCH(
  {Status},
  'Not Started', '⚪',
  'In Progress', '🔵',
  'Blocked', '🔴',
  'Completed', '✅',
  'Cancelled', '❌',
  '❓'
)
```

---

### Priority Sorting Value

```
SWITCH(
  {Priority},
  'Critical', 1,
  'High', 2,
  'Medium', 3,
  'Low', 4,
  5
)
// Use this in sort field for proper ordering
```

---

### Full Name with Title

```
IF(
  {Title},
  {Title} & ' ' & {First Name} & ' ' & {Last Name},
  {First Name} & ' ' & {Last Name}
)
// Output: "Dr. John Doe" or "John Doe"
```

---

### Email Validation

```
IF(
  AND(
    LEN({Email}) > 0,
    FIND('@', {Email}) > 0,
    FIND('.', {Email}) > FIND('@', {Email})
  ),
  '✅ Valid',
  '❌ Invalid'
)
```

---

### Phone Formatting (US)

```
IF(
  LEN(SUBSTITUTE({Phone}, '-', '')) = 10,
  '(' & LEFT({Phone}, 3) & ') ' & MID({Phone}, 4, 3) & '-' & RIGHT({Phone}, 4),
  {Phone}
)
// Input: "5551234567" → Output: "(555) 123-4567"
```

---

### Currency Formatting

```
'$' & ROUND({Amount}, 2)
// Basic

// With thousands separator (requires manual implementation)
IF(
  {Amount} >= 1000,
  '$' & INT({Amount} / 1000) & ',' & RIGHT('000' & MOD(INT({Amount}), 1000), 3) & '.' & RIGHT('0' & ROUND(({Amount} - INT({Amount})) * 100), 2),
  '$' & ROUND({Amount}, 2)
)
```

---

### Percentage Complete

```
ROUND({Completed Tasks} / {Total Tasks} * 100, 0) & '%'
// Output: "75%"

// With progress bar
REPT('▓', ROUND({Completed Tasks} / {Total Tasks} * 10, 0)) &
REPT('░', 10 - ROUND({Completed Tasks} / {Total Tasks} * 10, 0)) &
' ' & ROUND({Completed Tasks} / {Total Tasks} * 100, 0) & '%'
// Output: "▓▓▓▓▓▓▓░░░ 70%"
```

---

### Age/Time Ago

```
IF(
  DATETIME_DIFF(NOW(), {Created}, 'days') < 1,
  DATETIME_DIFF(NOW(), {Created}, 'hours') & 'h ago',
  IF(
    DATETIME_DIFF(NOW(), {Created}, 'days') < 30,
    DATETIME_DIFF(NOW(), {Created}, 'days') & 'd ago',
    IF(
      DATETIME_DIFF(NOW(), {Created}, 'days') < 365,
      DATETIME_DIFF(NOW(), {Created}, 'months') & 'mo ago',
      DATETIME_DIFF(NOW(), {Created}, 'years') & 'y ago'
    )
  )
)
// Output: "5h ago", "3d ago", "2mo ago", "1y ago"
```

---

### Conditional Formatting Value

```
IF(
  AND({Status} = 'Active', {Balance} > 0),
  '🟢 Active',
  IF(
    {Status} = 'Pending',
    '🟡 Pending',
    '🔴 Inactive'
  )
)
```

---

### Generate Unique ID

```
DATETIME_FORMAT(CREATED_TIME(), 'YYYYMMDD') & '-' & RIGHT(RECORD_ID(), 6)
// Output: "20250108-ABC123"
```

---

### Rollup Calculations

```
// Sum of linked records
SUM({values})

// Average
AVERAGE({values})

// Count non-empty
COUNT({values})

// Join as text
ARRAYJOIN({values}, ', ')

// Conditional sum
SUM(
  {Linked Records->Amount},
  {Linked Records->Status} = 'Paid'
)
```

---

## Common Use Cases

### 1. Task Status with Due Date

```
IF(
  {Completed},
  '✅ Completed',
  IF(
    IS_BEFORE({Due Date}, TODAY()),
    '🔴 Overdue - ' & DATETIME_DIFF(TODAY(), {Due Date}, 'days') & ' days',
    IF(
      IS_SAME({Due Date}, TODAY(), 'day'),
      '🟡 Due Today',
      '🟢 On Track - ' & DATETIME_DIFF({Due Date}, TODAY(), 'days') & ' days left'
    )
  )
)
```

---

### 2. Customer Lifetime Value

```
ROUND(
  SUM({Orders->Total}) +
  ({Average Order Value} * {Projected Future Orders}),
  2
)
```

---

### 3. SLA Compliance

```
IF(
  IS_BLANK({Resolved Time}),
  '⏳ In Progress',
  IF(
    DATETIME_DIFF({Resolved Time}, {Created Time}, 'hours') <= {SLA Hours},
    '✅ Within SLA',
    '❌ SLA Breach - ' & (DATETIME_DIFF({Resolved Time}, {Created Time}, 'hours') - {SLA Hours}) & 'h over'
  )
)
```

---

### 4. Discount Calculator

```
IF(
  {Quantity} >= 100, {Price} * 0.8,  // 20% discount
  IF(
    {Quantity} >= 50, {Price} * 0.9,  // 10% discount
    IF(
      {Quantity} >= 10, {Price} * 0.95,  // 5% discount
      {Price}  // No discount
    )
  )
)
```

---

### 5. Project Health Score

```
IF(
  AND(
    {Tasks Completed} / {Total Tasks} >= 0.8,
    IS_AFTER({Target Date}, TODAY())
  ),
  '🟢 Healthy',
  IF(
    OR(
      {Tasks Completed} / {Total Tasks} < 0.5,
      IS_BEFORE({Target Date}, TODAY())
    ),
    '🔴 At Risk',
    '🟡 Needs Attention'
  )
)
```

---

## Best Practices

### ✅ DO

1. **Use descriptive field names** in formulas
2. **Add comments** for complex formulas
3. **Test edge cases** (empty values, nulls)
4. **Use BLANK()** instead of empty string ""
5. **Format dates consistently** with DATETIME_FORMAT
6. **Validate inputs** before calculations
7. **Use SWITCH()** instead of nested IF when possible
8. **Round currency** to 2 decimal places
9. **Use TRIM()** on user inputs
10. **Cache complex calculations** in separate fields

### ❌ DON'T

1. **Don't create circular references**
2. **Don't nest IF more than 3-4 levels** (use SWITCH)
3. **Don't ignore blank values** in calculations
4. **Don't assume field types** won't change
5. **Don't use formulas** for data that changes frequently (use automation)
6. **Don't overcomplicate** - split into multiple formula fields
7. **Don't ignore timezone** differences in date calculations
8. **Don't hardcode values** that might change
9. **Don't use formulas** for external API calls (use automation)
10. **Don't forget** ROUND() for money calculations

---

## Performance Tips

1. **Rollups are slower** than direct formulas - use sparingly
2. **Lookups are faster** than rollups for single values
3. **Split complex formulas** into multiple fields for better performance
4. **Use COUNT() instead of SUM()** when just counting
5. **Cache frequently calculated values** in separate formula fields

---

**Last Updated:** January 2025
**Formula Version:** Airtable Formula 2.0
**Documentation:** https://support.airtable.com/docs/formula-field-reference
