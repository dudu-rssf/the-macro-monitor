/**
 * Hodrick-Prescott filter via Cholesky decomposition of the pentadiagonal system.
 * Solves (I + lambda * D2'D2) g = y where D2 is the second difference matrix.
 * Standard lambda = 1600 for quarterly data.
 */
export function hpTrend(y: number[], lambda = 1600): number[] {
  const n = y.length
  if (n < 5) return [...y]

  // Diagonals of A = I + lambda * D2'D2
  // main: 1 + lambda * [1, 5, 6, ..., 6, 5, 1]
  // ±1:   lambda * [-2, -4, ..., -4, -2]
  // ±2:   lambda * [1, 1, ..., 1]
  const a = new Float64Array(n)
  const b = new Float64Array(n - 1)
  const c = new Float64Array(n - 2)

  a[0] = 1 + lambda;   a[n-1] = 1 + lambda
  a[1] = 1 + 5*lambda; a[n-2] = 1 + 5*lambda
  for (let i = 2; i <= n-3; i++) a[i] = 1 + 6*lambda

  b[0] = -2*lambda; b[n-2] = -2*lambda
  for (let i = 1; i <= n-3; i++) b[i] = -4*lambda

  for (let i = 0; i < n-2; i++) c[i] = lambda

  // Cholesky factorization: A = L L^T
  // L is lower triangular with bandwidth 2 (l, m sub1, p sub2)
  const l = new Float64Array(n)
  const m = new Float64Array(n - 1)
  const p = new Float64Array(n - 2)

  l[0] = Math.sqrt(a[0])
  m[0] = b[0] / l[0]
  p[0] = c[0] / l[0]

  l[1] = Math.sqrt(a[1] - m[0]*m[0])
  if (n > 2) m[1] = (b[1] - m[0]*p[0]) / l[1]
  if (n > 3) p[1] = c[1] / l[1]

  for (let i = 2; i < n; i++) {
    const pi2 = i >= 2 ? p[i-2] : 0
    const mi1 = i >= 1 ? m[i-1] : 0
    l[i] = Math.sqrt(a[i] - mi1*mi1 - pi2*pi2)
    if (i < n-1) m[i] = (b[i] - mi1 * (i >= 2 ? p[i-2] : 0)) / l[i]
    if (i < n-2) p[i] = c[i] / l[i]
  }

  // Forward substitution: L z = y
  const z = new Float64Array(n)
  z[0] = y[0] / l[0]
  if (n > 1) z[1] = (y[1] - m[0]*z[0]) / l[1]
  for (let i = 2; i < n; i++) {
    z[i] = (y[i] - m[i-1]*z[i-1] - p[i-2]*z[i-2]) / l[i]
  }

  // Backward substitution: L^T g = z
  const g = new Float64Array(n)
  g[n-1] = z[n-1] / l[n-1]
  if (n > 1) g[n-2] = (z[n-2] - m[n-2]*g[n-1]) / l[n-2]
  for (let i = n-3; i >= 0; i--) {
    g[i] = (z[i] - m[i]*g[i+1] - p[i]*g[i+2]) / l[i]
  }

  return Array.from(g)
}

/** Returns % deviation of y from its HP trend. */
export function hpGap(y: number[], lambda = 1600): number[] {
  const trend = hpTrend(y, lambda)
  return y.map((v, i) => parseFloat(((v / trend[i] - 1) * 100).toFixed(2)))
}
