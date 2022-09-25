export const snakecase = (str: string) => {
  return str.replace(/([A-Z])/g, ($1) => {
    return `_${$1.toLowerCase()}`
  })
}
