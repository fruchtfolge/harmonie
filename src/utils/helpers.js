module.exports = {
  toLetter (number) {
    if (!isNaN(number) && number >= 0 && number <= 26) {
      const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('')
      return alphabet[number - 1]
    }
    return 'a'
  }
}
