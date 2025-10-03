// Utility functions for combining and converting quantities

interface ParsedQuantity {
  amount: number
  unit: string
  originalText: string
}

// Common unit conversions (all converted to base units)
const UNIT_CONVERSIONS: Record<string, { base: string; factor: number }> = {
  // Volume - base unit: cup
  'cup': { base: 'cup', factor: 1 },
  'cups': { base: 'cup', factor: 1 },
  'c': { base: 'cup', factor: 1 },
  'tablespoon': { base: 'cup', factor: 1/16 },
  'tablespoons': { base: 'cup', factor: 1/16 },
  'tbsp': { base: 'cup', factor: 1/16 },
  'teaspoon': { base: 'cup', factor: 1/48 },
  'teaspoons': { base: 'cup', factor: 1/48 },
  'tsp': { base: 'cup', factor: 1/48 },
  'fluid ounce': { base: 'cup', factor: 1/8 },
  'fluid ounces': { base: 'cup', factor: 1/8 },
  'fl oz': { base: 'cup', factor: 1/8 },
  'pint': { base: 'cup', factor: 2 },
  'pints': { base: 'cup', factor: 2 },
  'pt': { base: 'cup', factor: 2 },
  'quart': { base: 'cup', factor: 4 },
  'quarts': { base: 'cup', factor: 4 },
  'qt': { base: 'cup', factor: 4 },
  'gallon': { base: 'cup', factor: 16 },
  'gallons': { base: 'cup', factor: 16 },
  'gal': { base: 'cup', factor: 16 },
  'liter': { base: 'cup', factor: 4.227 },
  'liters': { base: 'cup', factor: 4.227 },
  'l': { base: 'cup', factor: 4.227 },
  'milliliter': { base: 'cup', factor: 0.004227 },
  'milliliters': { base: 'cup', factor: 0.004227 },
  'ml': { base: 'cup', factor: 0.004227 },

  // Weight - base unit: pound
  'pound': { base: 'lb', factor: 1 },
  'pounds': { base: 'lb', factor: 1 },
  'lb': { base: 'lb', factor: 1 },
  'lbs': { base: 'lb', factor: 1 },
  'ounce': { base: 'lb', factor: 1/16 },
  'ounces': { base: 'lb', factor: 1/16 },
  'oz': { base: 'lb', factor: 1/16 },
  'gram': { base: 'lb', factor: 0.00220462 },
  'grams': { base: 'lb', factor: 0.00220462 },
  'g': { base: 'lb', factor: 0.00220462 },
  'kilogram': { base: 'lb', factor: 2.20462 },
  'kilograms': { base: 'lb', factor: 2.20462 },
  'kg': { base: 'lb', factor: 2.20462 },

  // Count - base unit: piece
  'piece': { base: 'piece', factor: 1 },
  'pieces': { base: 'piece', factor: 1 },
  'item': { base: 'piece', factor: 1 },
  'items': { base: 'piece', factor: 1 },
  'each': { base: 'piece', factor: 1 },
  'whole': { base: 'piece', factor: 1 },
  'clove': { base: 'piece', factor: 1 },
  'cloves': { base: 'piece', factor: 1 },
  'head': { base: 'piece', factor: 1 },
  'heads': { base: 'piece', factor: 1 },
  'bunch': { base: 'piece', factor: 1 },
  'bunches': { base: 'piece', factor: 1 },
  'package': { base: 'piece', factor: 1 },
  'packages': { base: 'piece', factor: 1 },
  'can': { base: 'piece', factor: 1 },
  'cans': { base: 'piece', factor: 1 },
  'jar': { base: 'piece', factor: 1 },
  'jars': { base: 'piece', factor: 1 },
  'bottle': { base: 'piece', factor: 1 },
  'bottles': { base: 'piece', factor: 1 },
}

// Parse quantity string like "1/4 cup", "2 tbsp", "3", "1.5 lbs"
export function parseQuantity(quantityText: string): ParsedQuantity | null {
  if (!quantityText || quantityText.trim() === '') {
    return null
  }

  const text = quantityText.trim().toLowerCase()
  
  // Handle "to taste" or similar
  if (text.includes('to taste') || text.includes('as needed') || text.includes('pinch')) {
    return {
      amount: 0,
      unit: 'to taste',
      originalText: quantityText
    }
  }

  // Extract number and unit
  const match = text.match(/^(\d+(?:\/\d+)?(?:\.\d+)?)\s*(.*)$/)
  if (!match) {
    // Try to handle cases like "a pinch", "some", etc.
    return {
      amount: 1,
      unit: text,
      originalText: quantityText
    }
  }

  const [, amountStr, unitStr] = match
  
  // Parse fraction or decimal
  let amount: number
  if (amountStr.includes('/')) {
    const [numerator, denominator] = amountStr.split('/')
    amount = parseInt(numerator) / parseInt(denominator)
  } else {
    amount = parseFloat(amountStr)
  }

  const unit = unitStr.trim() || 'piece'

  return {
    amount,
    unit,
    originalText: quantityText
  }
}

// Convert quantity to base unit for combining
export function convertToBaseUnit(parsed: ParsedQuantity): { amount: number; baseUnit: string } {
  const conversion = UNIT_CONVERSIONS[parsed.unit.toLowerCase()]
  
  if (conversion) {
    return {
      amount: parsed.amount * conversion.factor,
      baseUnit: conversion.base
    }
  }

  // If no conversion found, use as-is
  return {
    amount: parsed.amount,
    baseUnit: parsed.unit
  }
}

// Convert from base unit back to a nice display unit
export function convertFromBaseUnit(amount: number, baseUnit: string): { amount: number; unit: string } {
  if (baseUnit === 'cup') {
    // Choose appropriate unit for cups
    if (amount >= 4) {
      return { amount: amount / 4, unit: 'quart' + (amount / 4 !== 1 ? 's' : '') }
    } else if (amount >= 1) {
      return { amount, unit: 'cup' + (amount !== 1 ? 's' : '') }
    } else if (amount >= 1/16) {
      const tbsp = amount * 16
      return { amount: tbsp, unit: 'tbsp' }
    } else {
      const tsp = amount * 48
      return { amount: tsp, unit: 'tsp' }
    }
  } else if (baseUnit === 'lb') {
    // Choose appropriate unit for weight
    if (amount >= 1) {
      return { amount, unit: 'lb' + (amount !== 1 ? 's' : '') }
    } else {
      const oz = amount * 16
      return { amount: oz, unit: 'oz' }
    }
  } else if (baseUnit === 'piece') {
    // For countable items
    return { amount, unit: amount === 1 ? 'piece' : 'pieces' }
  }

  // Default: return as-is
  return { amount, baseUnit }
}

// Format amount as fraction if it makes sense
export function formatAmount(amount: number): string {
  // Common fractions
  const fractions: Record<string, string> = {
    '0.25': '1/4',
    '0.33': '1/3',
    '0.5': '1/2',
    '0.67': '2/3',
    '0.75': '3/4',
    '1.25': '1 1/4',
    '1.33': '1 1/3',
    '1.5': '1 1/2',
    '1.67': '1 2/3',
    '1.75': '1 3/4',
    '2.25': '2 1/4',
    '2.33': '2 1/3',
    '2.5': '2 1/2',
    '2.67': '2 2/3',
    '2.75': '2 3/4',
  }

  const rounded = Math.round(amount * 100) / 100
  const key = rounded.toString()
  
  if (fractions[key]) {
    return fractions[key]
  }

  // If it's a whole number, return as integer
  if (rounded === Math.floor(rounded)) {
    return Math.floor(rounded).toString()
  }

  // Otherwise return with up to 2 decimal places
  return rounded.toString()
}

// Main function to combine quantities
export function combineQuantities(quantities: Array<{ quantity: string; unit: string; name: string }>): {
  combinedQuantity: string
  combinedUnit: string
  usageCount: number
  originalQuantities: string[]
} {
  if (quantities.length === 0) {
    return {
      combinedQuantity: '1',
      combinedUnit: 'piece',
      usageCount: 0,
      originalQuantities: []
    }
  }

  if (quantities.length === 1) {
    return {
      combinedQuantity: quantities[0].quantity,
      combinedUnit: quantities[0].unit,
      usageCount: 1,
      originalQuantities: [`${quantities[0].quantity} ${quantities[0].unit}`.trim()]
    }
  }

  // Parse all quantities
  const parsed = quantities
    .map(q => parseQuantity(`${q.quantity} ${q.unit}`.trim()))
    .filter(p => p !== null) as ParsedQuantity[]

  if (parsed.length === 0) {
    return {
      combinedQuantity: '1',
      combinedUnit: 'piece',
      usageCount: quantities.length,
      originalQuantities: quantities.map(q => `${q.quantity} ${q.unit}`.trim())
    }
  }

  // Convert to base units and group by base unit
  const baseUnits: Record<string, { totalAmount: number; originalQuantities: string[] }> = {}

  for (const p of parsed) {
    const { amount, baseUnit } = convertToBaseUnit(p)
    
    if (!baseUnits[baseUnit]) {
      baseUnits[baseUnit] = { totalAmount: 0, originalQuantities: [] }
    }
    
    baseUnits[baseUnit].totalAmount += amount
    baseUnits[baseUnit].originalQuantities.push(p.originalText)
  }

  // Find the base unit with the most total amount (primary unit)
  const primaryBaseUnit = Object.keys(baseUnits).reduce((a, b) => 
    baseUnits[a].totalAmount > baseUnits[b].totalAmount ? a : b
  )

  const primaryData = baseUnits[primaryBaseUnit]
  const { amount: finalAmount, unit: finalUnit } = convertFromBaseUnit(
    primaryData.totalAmount, 
    primaryBaseUnit
  )

  return {
    combinedQuantity: formatAmount(finalAmount),
    combinedUnit: finalUnit,
    usageCount: quantities.length,
    originalQuantities: Object.values(baseUnits).flatMap(b => b.originalQuantities)
  }
}

