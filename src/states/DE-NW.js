const parse = require('..utils/parse')

module.exports = async (files) => {
  const data = await parse.xml(files)
  console.log(data);
}