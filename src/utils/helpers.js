export function toLetter (number) {
  if (!isNaN(number) && number >= 0 && number <= 26) {
    const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('')
    return alphabet[number]
  }
  return 'a'
}

export function getSafe (value, defVal) {
  try {
    return value()
  } catch (e) {
    return defVal
  }
}
