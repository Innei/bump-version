export const memoReturnValueFunction = <T extends (...args: any[]) => any>(
  fn: T,
): T => {
  let cache: any = undefined
  return ((...args: any[]) => {
    if (cache === undefined) {
      cache = fn(...args)
    }
    return cache
  }) as T
}