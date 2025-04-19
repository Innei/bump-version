export const snakecase = (str: string) => {
  return str.replaceAll(/([A-Z])/g, ($1) => {
    return `_${$1.toLowerCase()}`
  })
}
