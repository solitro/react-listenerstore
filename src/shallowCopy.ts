export function shallowCopy<T>(value:T):T {
  if (value === null || typeof value !== 'object') {
    // For primitive types (number, string, boolean, null, undefined, symbol, bigint)
    return value;
  }

  if (Array.isArray(value)) {
    // For arrays
    return [...value] as T;
  }

  if (value instanceof Map) {
    // For Map
    return new Map(value) as T;
  }

  if (value instanceof Set) {
    // For Set
    return new Set(value) as T;
  }

  if (value instanceof Date) {
    // For Date
    return new Date(value.getTime()) as T;
  }

  if (value instanceof RegExp) {
    // For RegExp
    return new RegExp(value) as T;
  }

  // For plain objects
  return { ...value } as T;
}
