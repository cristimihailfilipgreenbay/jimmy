/** An estimated cost as the design shows it; null means the model's price was not known. */
export const formatCost = (usd: number | null) => (usd === null ? 'n/a' : `$${usd.toFixed(4)}`)
