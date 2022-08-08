var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

var validator$2 = {};

var util$2 = {};

(function (exports) {

	const nameStartChar = ':A-Za-z_\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD';
	const nameChar = nameStartChar + '\\-.\\d\\u00B7\\u0300-\\u036F\\u203F-\\u2040';
	const nameRegexp = '[' + nameStartChar + '][' + nameChar + ']*';
	const regexName = new RegExp('^' + nameRegexp + '$');

	const getAllMatches = function(string, regex) {
	  const matches = [];
	  let match = regex.exec(string);
	  while (match) {
	    const allmatches = [];
	    allmatches.startIndex = regex.lastIndex - match[0].length;
	    const len = match.length;
	    for (let index = 0; index < len; index++) {
	      allmatches.push(match[index]);
	    }
	    matches.push(allmatches);
	    match = regex.exec(string);
	  }
	  return matches;
	};

	const isName = function(string) {
	  const match = regexName.exec(string);
	  return !(match === null || typeof match === 'undefined');
	};

	exports.isExist = function(v) {
	  return typeof v !== 'undefined';
	};

	exports.isEmptyObject = function(obj) {
	  return Object.keys(obj).length === 0;
	};

	/**
	 * Copy all the properties of a into b.
	 * @param {*} target
	 * @param {*} a
	 */
	exports.merge = function(target, a, arrayMode) {
	  if (a) {
	    const keys = Object.keys(a); // will return an array of own properties
	    const len = keys.length; //don't make it inline
	    for (let i = 0; i < len; i++) {
	      if (arrayMode === 'strict') {
	        target[keys[i]] = [ a[keys[i]] ];
	      } else {
	        target[keys[i]] = a[keys[i]];
	      }
	    }
	  }
	};
	/* exports.merge =function (b,a){
	  return Object.assign(b,a);
	} */

	exports.getValue = function(v) {
	  if (exports.isExist(v)) {
	    return v;
	  } else {
	    return '';
	  }
	};

	// const fakeCall = function(a) {return a;};
	// const fakeCallNoReturn = function() {};

	exports.isName = isName;
	exports.getAllMatches = getAllMatches;
	exports.nameRegexp = nameRegexp;
} (util$2));

const util$1 = util$2;

const defaultOptions$2 = {
  allowBooleanAttributes: false, //A tag can have attributes without any value
  unpairedTags: []
};

//const tagsPattern = new RegExp("<\\/?([\\w:\\-_\.]+)\\s*\/?>","g");
validator$2.validate = function (xmlData, options) {
  options = Object.assign({}, defaultOptions$2, options);

  //xmlData = xmlData.replace(/(\r\n|\n|\r)/gm,"");//make it single line
  //xmlData = xmlData.replace(/(^\s*<\?xml.*?\?>)/g,"");//Remove XML starting tag
  //xmlData = xmlData.replace(/(<!DOCTYPE[\s\w\"\.\/\-\:]+(\[.*\])*\s*>)/g,"");//Remove DOCTYPE
  const tags = [];
  let tagFound = false;

  //indicates that the root tag has been closed (aka. depth 0 has been reached)
  let reachedRoot = false;

  if (xmlData[0] === '\ufeff') {
    // check for byte order mark (BOM)
    xmlData = xmlData.substr(1);
  }
  
  for (let i = 0; i < xmlData.length; i++) {

    if (xmlData[i] === '<' && xmlData[i+1] === '?') {
      i+=2;
      i = readPI(xmlData,i);
      if (i.err) return i;
    }else if (xmlData[i] === '<') {
      //starting of tag
      //read until you reach to '>' avoiding any '>' in attribute value
      let tagStartPos = i;
      i++;
      
      if (xmlData[i] === '!') {
        i = readCommentAndCDATA(xmlData, i);
        continue;
      } else {
        let closingTag = false;
        if (xmlData[i] === '/') {
          //closing tag
          closingTag = true;
          i++;
        }
        //read tagname
        let tagName = '';
        for (; i < xmlData.length &&
          xmlData[i] !== '>' &&
          xmlData[i] !== ' ' &&
          xmlData[i] !== '\t' &&
          xmlData[i] !== '\n' &&
          xmlData[i] !== '\r'; i++
        ) {
          tagName += xmlData[i];
        }
        tagName = tagName.trim();
        //console.log(tagName);

        if (tagName[tagName.length - 1] === '/') {
          //self closing tag without attributes
          tagName = tagName.substring(0, tagName.length - 1);
          //continue;
          i--;
        }
        if (!validateTagName(tagName)) {
          let msg;
          if (tagName.trim().length === 0) {
            msg = "Invalid space after '<'.";
          } else {
            msg = "Tag '"+tagName+"' is an invalid name.";
          }
          return getErrorObject('InvalidTag', msg, getLineNumberForPosition(xmlData, i));
        }

        const result = readAttributeStr(xmlData, i);
        if (result === false) {
          return getErrorObject('InvalidAttr', "Attributes for '"+tagName+"' have open quote.", getLineNumberForPosition(xmlData, i));
        }
        let attrStr = result.value;
        i = result.index;

        if (attrStr[attrStr.length - 1] === '/') {
          //self closing tag
          const attrStrStart = i - attrStr.length;
          attrStr = attrStr.substring(0, attrStr.length - 1);
          const isValid = validateAttributeString(attrStr, options);
          if (isValid === true) {
            tagFound = true;
            //continue; //text may presents after self closing tag
          } else {
            //the result from the nested function returns the position of the error within the attribute
            //in order to get the 'true' error line, we need to calculate the position where the attribute begins (i - attrStr.length) and then add the position within the attribute
            //this gives us the absolute index in the entire xml, which we can use to find the line at last
            return getErrorObject(isValid.err.code, isValid.err.msg, getLineNumberForPosition(xmlData, attrStrStart + isValid.err.line));
          }
        } else if (closingTag) {
          if (!result.tagClosed) {
            return getErrorObject('InvalidTag', "Closing tag '"+tagName+"' doesn't have proper closing.", getLineNumberForPosition(xmlData, i));
          } else if (attrStr.trim().length > 0) {
            return getErrorObject('InvalidTag', "Closing tag '"+tagName+"' can't have attributes or invalid starting.", getLineNumberForPosition(xmlData, tagStartPos));
          } else {
            const otg = tags.pop();
            if (tagName !== otg.tagName) {
              let openPos = getLineNumberForPosition(xmlData, otg.tagStartPos);
              return getErrorObject('InvalidTag',
                "Expected closing tag '"+otg.tagName+"' (opened in line "+openPos.line+", col "+openPos.col+") instead of closing tag '"+tagName+"'.",
                getLineNumberForPosition(xmlData, tagStartPos));
            }

            //when there are no more tags, we reached the root level.
            if (tags.length == 0) {
              reachedRoot = true;
            }
          }
        } else {
          const isValid = validateAttributeString(attrStr, options);
          if (isValid !== true) {
            //the result from the nested function returns the position of the error within the attribute
            //in order to get the 'true' error line, we need to calculate the position where the attribute begins (i - attrStr.length) and then add the position within the attribute
            //this gives us the absolute index in the entire xml, which we can use to find the line at last
            return getErrorObject(isValid.err.code, isValid.err.msg, getLineNumberForPosition(xmlData, i - attrStr.length + isValid.err.line));
          }

          //if the root level has been reached before ...
          if (reachedRoot === true) {
            return getErrorObject('InvalidXml', 'Multiple possible root nodes found.', getLineNumberForPosition(xmlData, i));
          } else if(options.unpairedTags.indexOf(tagName) !== -1); else {
            tags.push({tagName, tagStartPos});
          }
          tagFound = true;
        }

        //skip tag text value
        //It may include comments and CDATA value
        for (i++; i < xmlData.length; i++) {
          if (xmlData[i] === '<') {
            if (xmlData[i + 1] === '!') {
              //comment or CADATA
              i++;
              i = readCommentAndCDATA(xmlData, i);
              continue;
            } else if (xmlData[i+1] === '?') {
              i = readPI(xmlData, ++i);
              if (i.err) return i;
            } else {
              break;
            }
          } else if (xmlData[i] === '&') {
            const afterAmp = validateAmpersand(xmlData, i);
            if (afterAmp == -1)
              return getErrorObject('InvalidChar', "char '&' is not expected.", getLineNumberForPosition(xmlData, i));
            i = afterAmp;
          }else {
            if (reachedRoot === true && !isWhiteSpace(xmlData[i])) {
              return getErrorObject('InvalidXml', "Extra text at the end", getLineNumberForPosition(xmlData, i));
            }
          }
        } //end of reading tag text value
        if (xmlData[i] === '<') {
          i--;
        }
      }
    } else {
      if ( isWhiteSpace(xmlData[i])) {
        continue;
      }
      return getErrorObject('InvalidChar', "char '"+xmlData[i]+"' is not expected.", getLineNumberForPosition(xmlData, i));
    }
  }

  if (!tagFound) {
    return getErrorObject('InvalidXml', 'Start tag expected.', 1);
  }else if (tags.length == 1) {
      return getErrorObject('InvalidTag', "Unclosed tag '"+tags[0].tagName+"'.", getLineNumberForPosition(xmlData, tags[0].tagStartPos));
  }else if (tags.length > 0) {
      return getErrorObject('InvalidXml', "Invalid '"+
          JSON.stringify(tags.map(t => t.tagName), null, 4).replace(/\r?\n/g, '')+
          "' found.", {line: 1, col: 1});
  }

  return true;
};

function isWhiteSpace(char){
  return char === ' ' || char === '\t' || char === '\n'  || char === '\r';
}
/**
 * Read Processing insstructions and skip
 * @param {*} xmlData
 * @param {*} i
 */
function readPI(xmlData, i) {
  const start = i;
  for (; i < xmlData.length; i++) {
    if (xmlData[i] == '?' || xmlData[i] == ' ') {
      //tagname
      const tagname = xmlData.substr(start, i - start);
      if (i > 5 && tagname === 'xml') {
        return getErrorObject('InvalidXml', 'XML declaration allowed only at the start of the document.', getLineNumberForPosition(xmlData, i));
      } else if (xmlData[i] == '?' && xmlData[i + 1] == '>') {
        //check if valid attribut string
        i++;
        break;
      } else {
        continue;
      }
    }
  }
  return i;
}

function readCommentAndCDATA(xmlData, i) {
  if (xmlData.length > i + 5 && xmlData[i + 1] === '-' && xmlData[i + 2] === '-') {
    //comment
    for (i += 3; i < xmlData.length; i++) {
      if (xmlData[i] === '-' && xmlData[i + 1] === '-' && xmlData[i + 2] === '>') {
        i += 2;
        break;
      }
    }
  } else if (
    xmlData.length > i + 8 &&
    xmlData[i + 1] === 'D' &&
    xmlData[i + 2] === 'O' &&
    xmlData[i + 3] === 'C' &&
    xmlData[i + 4] === 'T' &&
    xmlData[i + 5] === 'Y' &&
    xmlData[i + 6] === 'P' &&
    xmlData[i + 7] === 'E'
  ) {
    let angleBracketsCount = 1;
    for (i += 8; i < xmlData.length; i++) {
      if (xmlData[i] === '<') {
        angleBracketsCount++;
      } else if (xmlData[i] === '>') {
        angleBracketsCount--;
        if (angleBracketsCount === 0) {
          break;
        }
      }
    }
  } else if (
    xmlData.length > i + 9 &&
    xmlData[i + 1] === '[' &&
    xmlData[i + 2] === 'C' &&
    xmlData[i + 3] === 'D' &&
    xmlData[i + 4] === 'A' &&
    xmlData[i + 5] === 'T' &&
    xmlData[i + 6] === 'A' &&
    xmlData[i + 7] === '['
  ) {
    for (i += 8; i < xmlData.length; i++) {
      if (xmlData[i] === ']' && xmlData[i + 1] === ']' && xmlData[i + 2] === '>') {
        i += 2;
        break;
      }
    }
  }

  return i;
}

const doubleQuote = '"';
const singleQuote = "'";

/**
 * Keep reading xmlData until '<' is found outside the attribute value.
 * @param {string} xmlData
 * @param {number} i
 */
function readAttributeStr(xmlData, i) {
  let attrStr = '';
  let startChar = '';
  let tagClosed = false;
  for (; i < xmlData.length; i++) {
    if (xmlData[i] === doubleQuote || xmlData[i] === singleQuote) {
      if (startChar === '') {
        startChar = xmlData[i];
      } else if (startChar !== xmlData[i]) ; else {
        startChar = '';
      }
    } else if (xmlData[i] === '>') {
      if (startChar === '') {
        tagClosed = true;
        break;
      }
    }
    attrStr += xmlData[i];
  }
  if (startChar !== '') {
    return false;
  }

  return {
    value: attrStr,
    index: i,
    tagClosed: tagClosed
  };
}

/**
 * Select all the attributes whether valid or invalid.
 */
const validAttrStrRegxp = new RegExp('(\\s*)([^\\s=]+)(\\s*=)?(\\s*([\'"])(([\\s\\S])*?)\\5)?', 'g');

//attr, ="sd", a="amit's", a="sd"b="saf", ab  cd=""

function validateAttributeString(attrStr, options) {
  //console.log("start:"+attrStr+":end");

  //if(attrStr.trim().length === 0) return true; //empty string

  const matches = util$1.getAllMatches(attrStr, validAttrStrRegxp);
  const attrNames = {};

  for (let i = 0; i < matches.length; i++) {
    if (matches[i][1].length === 0) {
      //nospace before attribute name: a="sd"b="saf"
      return getErrorObject('InvalidAttr', "Attribute '"+matches[i][2]+"' has no space in starting.", getPositionFromMatch(matches[i]))
    } else if (matches[i][3] !== undefined && matches[i][4] === undefined) {
      return getErrorObject('InvalidAttr', "Attribute '"+matches[i][2]+"' is without value.", getPositionFromMatch(matches[i]));
    } else if (matches[i][3] === undefined && !options.allowBooleanAttributes) {
      //independent attribute: ab
      return getErrorObject('InvalidAttr', "boolean attribute '"+matches[i][2]+"' is not allowed.", getPositionFromMatch(matches[i]));
    }
    /* else if(matches[i][6] === undefined){//attribute without value: ab=
                    return { err: { code:"InvalidAttr",msg:"attribute " + matches[i][2] + " has no value assigned."}};
                } */
    const attrName = matches[i][2];
    if (!validateAttrName(attrName)) {
      return getErrorObject('InvalidAttr', "Attribute '"+attrName+"' is an invalid name.", getPositionFromMatch(matches[i]));
    }
    if (!attrNames.hasOwnProperty(attrName)) {
      //check for duplicate attribute.
      attrNames[attrName] = 1;
    } else {
      return getErrorObject('InvalidAttr', "Attribute '"+attrName+"' is repeated.", getPositionFromMatch(matches[i]));
    }
  }

  return true;
}

function validateNumberAmpersand(xmlData, i) {
  let re = /\d/;
  if (xmlData[i] === 'x') {
    i++;
    re = /[\da-fA-F]/;
  }
  for (; i < xmlData.length; i++) {
    if (xmlData[i] === ';')
      return i;
    if (!xmlData[i].match(re))
      break;
  }
  return -1;
}

function validateAmpersand(xmlData, i) {
  // https://www.w3.org/TR/xml/#dt-charref
  i++;
  if (xmlData[i] === ';')
    return -1;
  if (xmlData[i] === '#') {
    i++;
    return validateNumberAmpersand(xmlData, i);
  }
  let count = 0;
  for (; i < xmlData.length; i++, count++) {
    if (xmlData[i].match(/\w/) && count < 20)
      continue;
    if (xmlData[i] === ';')
      break;
    return -1;
  }
  return i;
}

function getErrorObject(code, message, lineNumber) {
  return {
    err: {
      code: code,
      msg: message,
      line: lineNumber.line || lineNumber,
      col: lineNumber.col,
    },
  };
}

function validateAttrName(attrName) {
  return util$1.isName(attrName);
}

// const startsWithXML = /^xml/i;

function validateTagName(tagname) {
  return util$1.isName(tagname) /* && !tagname.match(startsWithXML) */;
}

//this function returns the line number for the character at the given index
function getLineNumberForPosition(xmlData, index) {
  const lines = xmlData.substring(0, index).split(/\r?\n/);
  return {
    line: lines.length,

    // column number is last line's length + 1, because column numbering starts at 1:
    col: lines[lines.length - 1].length + 1
  };
}

//this function returns the position of the first character of match within attrStr
function getPositionFromMatch(match) {
  return match.startIndex + match[1].length;
}

var OptionsBuilder = {};

const defaultOptions$1 = {
    preserveOrder: false,
    attributeNamePrefix: '@_',
    attributesGroupName: false,
    textNodeName: '#text',
    ignoreAttributes: true,
    removeNSPrefix: false, // remove NS from tag name or attribute name if true
    allowBooleanAttributes: false, //a tag can have attributes without any value
    //ignoreRootElement : false,
    parseTagValue: true,
    parseAttributeValue: false,
    trimValues: true, //Trim string values of tag and attributes
    cdataPropName: false,
    numberParseOptions: {
      hex: true,
      leadingZeros: true
    },
    tagValueProcessor: function(tagName, val) {
      return val;
    },
    attributeValueProcessor: function(attrName, val) {
      return val;
    },
    stopNodes: [], //nested tags will not be parsed even for errors
    alwaysCreateTextNode: false,
    isArray: () => false,
    commentPropName: false,
    unpairedTags: [],
    processEntities: true,
    htmlEntities: false,
    ignoreDeclaration: false,
    ignorePiTags: false,
    transformTagName: false,
};
   
const buildOptions$1 = function(options) {
    return Object.assign({}, defaultOptions$1, options);
};

OptionsBuilder.buildOptions = buildOptions$1;
OptionsBuilder.defaultOptions = defaultOptions$1;

class XmlNode{
  constructor(tagname) {
    this.tagname = tagname;
    this.child = []; //nested tags, text, cdata, comments in order
    this[":@"] = {}; //attributes map
  }
  add(key,val){
    // this.child.push( {name : key, val: val, isCdata: isCdata });
    this.child.push( {[key]: val });
  }
  addChild(node) {
    if(node[":@"] && Object.keys(node[":@"]).length > 0){
      this.child.push( { [node.tagname]: node.child, [":@"]: node[":@"] });
    }else {
      this.child.push( { [node.tagname]: node.child });
    }
  };
}

var xmlNode$1 = XmlNode;

//TODO: handle comments
function readDocType$1(xmlData, i){
    
    const entities = {};
    if( xmlData[i + 3] === 'O' &&
         xmlData[i + 4] === 'C' &&
         xmlData[i + 5] === 'T' &&
         xmlData[i + 6] === 'Y' &&
         xmlData[i + 7] === 'P' &&
         xmlData[i + 8] === 'E')
    {    
        i = i+9;
        let angleBracketsCount = 1;
        let hasBody = false, entity = false, comment = false;
        let exp = "";
        for(;i<xmlData.length;i++){
            if (xmlData[i] === '<') {
                if( hasBody && 
                     xmlData[i+1] === '!' &&
                     xmlData[i+2] === 'E' &&
                     xmlData[i+3] === 'N' &&
                     xmlData[i+4] === 'T' &&
                     xmlData[i+5] === 'I' &&
                     xmlData[i+6] === 'T' &&
                     xmlData[i+7] === 'Y'
                ){
                    i += 7;
                    entity = true;
                }else if( hasBody && 
                    xmlData[i+1] === '!' &&
                     xmlData[i+2] === 'E' &&
                     xmlData[i+3] === 'L' &&
                     xmlData[i+4] === 'E' &&
                     xmlData[i+5] === 'M' &&
                     xmlData[i+6] === 'E' &&
                     xmlData[i+7] === 'N' &&
                     xmlData[i+8] === 'T'
                ){
                    //Not supported
                    i += 8;
                }else if( hasBody && 
                    xmlData[i+1] === '!' &&
                    xmlData[i+2] === 'A' &&
                    xmlData[i+3] === 'T' &&
                    xmlData[i+4] === 'T' &&
                    xmlData[i+5] === 'L' &&
                    xmlData[i+6] === 'I' &&
                    xmlData[i+7] === 'S' &&
                    xmlData[i+8] === 'T'
                ){
                    //Not supported
                    i += 8;
                }else if( hasBody && 
                    xmlData[i+1] === '!' &&
                    xmlData[i+2] === 'N' &&
                    xmlData[i+3] === 'O' &&
                    xmlData[i+4] === 'T' &&
                    xmlData[i+5] === 'A' &&
                    xmlData[i+6] === 'T' &&
                    xmlData[i+7] === 'I' &&
                    xmlData[i+8] === 'O' &&
                    xmlData[i+9] === 'N'
                ){
                    //Not supported
                    i += 9;
                }else if( //comment
                    xmlData[i+1] === '!' &&
                    xmlData[i+2] === '-' &&
                    xmlData[i+3] === '-'
                ){
                    comment = true;
                }else {
                    throw new Error("Invalid DOCTYPE");
                }
                angleBracketsCount++;
                exp = "";
            } else if (xmlData[i] === '>') {
                if(comment){
                    if( xmlData[i - 1] === "-" && xmlData[i - 2] === "-"){
                        comment = false;
                    }else {
                        throw new Error(`Invalid XML comment in DOCTYPE`);
                    }
                }else if(entity){
                    parseEntityExp(exp, entities);
                    entity = false;
                }
                angleBracketsCount--;
                if (angleBracketsCount === 0) {
                  break;
                }
            }else if( xmlData[i] === '['){
                hasBody = true;
            }else {
                exp += xmlData[i];
            }
        }
        if(angleBracketsCount !== 0){
            throw new Error(`Unclosed DOCTYPE`);
        }
    }else {
        throw new Error(`Invalid Tag instead of DOCTYPE`);
    }
    return {entities, i};
}

const entityRegex = RegExp("^\\s([a-zA-z0-0]+)[ \t](['\"])([^&]+)\\2");
function parseEntityExp(exp, entities){
    const match = entityRegex.exec(exp);
    if(match){
        entities[ match[1] ] = {
            regx : RegExp( `&${match[1]};`,"g"),
            val: match[3]
        };
    }
}
var DocTypeReader = readDocType$1;

const hexRegex = /^[-+]?0x[a-fA-F0-9]+$/;
const numRegex = /^([\-\+])?(0*)(\.[0-9]+([eE]\-?[0-9]+)?|[0-9]+(\.[0-9]+([eE]\-?[0-9]+)?)?)$/;
// const octRegex = /0x[a-z0-9]+/;
// const binRegex = /0x[a-z0-9]+/;


//polyfill
if (!Number.parseInt && window.parseInt) {
    Number.parseInt = window.parseInt;
}
if (!Number.parseFloat && window.parseFloat) {
    Number.parseFloat = window.parseFloat;
}

  
const consider = {
    hex :  true,
    leadingZeros: true,
    decimalPoint: "\.",
    eNotation: true
    //skipLike: /regex/
};

function toNumber$1(str, options = {}){
    // const options = Object.assign({}, consider);
    // if(opt.leadingZeros === false){
    //     options.leadingZeros = false;
    // }else if(opt.hex === false){
    //     options.hex = false;
    // }

    options = Object.assign({}, consider, options );
    if(!str || typeof str !== "string" ) return str;
    
    let trimmedStr  = str.trim();
    // if(trimmedStr === "0.0") return 0;
    // else if(trimmedStr === "+0.0") return 0;
    // else if(trimmedStr === "-0.0") return -0;

    if(options.skipLike !== undefined && options.skipLike.test(trimmedStr)) return str;
    else if (options.hex && hexRegex.test(trimmedStr)) {
        return Number.parseInt(trimmedStr, 16);
    // } else if (options.parseOct && octRegex.test(str)) {
    //     return Number.parseInt(val, 8);
    // }else if (options.parseBin && binRegex.test(str)) {
    //     return Number.parseInt(val, 2);
    }else {
        //separate negative sign, leading zeros, and rest number
        const match = numRegex.exec(trimmedStr);
        if(match){
            const sign = match[1];
            const leadingZeros = match[2];
            let numTrimmedByZeros = trimZeros(match[3]); //complete num without leading zeros
            //trim ending zeros for floating number
            
            const eNotation = match[4] || match[6];
            if(!options.leadingZeros && leadingZeros.length > 0 && sign && trimmedStr[2] !== ".") return str; //-0123
            else if(!options.leadingZeros && leadingZeros.length > 0 && !sign && trimmedStr[1] !== ".") return str; //0123
            else {//no leading zeros or leading zeros are allowed
                const num = Number(trimmedStr);
                const numStr = "" + num;
                if(numStr.search(/[eE]/) !== -1){ //given number is long and parsed to eNotation
                    if(options.eNotation) return num;
                    else return str;
                }else if(eNotation){ //given number has enotation
                    if(options.eNotation) return num;
                    else return str;
                }else if(trimmedStr.indexOf(".") !== -1){ //floating number
                    // const decimalPart = match[5].substr(1);
                    // const intPart = trimmedStr.substr(0,trimmedStr.indexOf("."));

                    
                    // const p = numStr.indexOf(".");
                    // const givenIntPart = numStr.substr(0,p);
                    // const givenDecPart = numStr.substr(p+1);
                    if(numStr === "0" && (numTrimmedByZeros === "") ) return num; //0.0
                    else if(numStr === numTrimmedByZeros) return num; //0.456. 0.79000
                    else if( sign && numStr === "-"+numTrimmedByZeros) return num;
                    else return str;
                }
                
                if(leadingZeros){
                    // if(numTrimmedByZeros === numStr){
                    //     if(options.leadingZeros) return num;
                    //     else return str;
                    // }else return str;
                    if(numTrimmedByZeros === numStr) return num;
                    else if(sign+numTrimmedByZeros === numStr) return num;
                    else return str;
                }

                if(trimmedStr === numStr) return num;
                else if(trimmedStr === sign+numStr) return num;
                // else{
                //     //number with +/- sign
                //     trimmedStr.test(/[-+][0-9]);

                // }
                return str;
            }
            // else if(!eNotation && trimmedStr && trimmedStr !== Number(trimmedStr) ) return str;
            
        }else { //non-numeric string
            return str;
        }
    }
}

/**
 * 
 * @param {string} numStr without leading zeros
 * @returns 
 */
function trimZeros(numStr){
    if(numStr && numStr.indexOf(".") !== -1){//float
        numStr = numStr.replace(/0+$/, ""); //remove ending zeros
        if(numStr === ".")  numStr = "0";
        else if(numStr[0] === ".")  numStr = "0"+numStr;
        else if(numStr[numStr.length-1] === ".")  numStr = numStr.substr(0,numStr.length-1);
        return numStr;
    }
    return numStr;
}
var strnum = toNumber$1;

///@ts-check

const util = util$2;
const xmlNode = xmlNode$1;
const readDocType = DocTypeReader;
const toNumber = strnum;

'<((!\\[CDATA\\[([\\s\\S]*?)(]]>))|((NAME:)?(NAME))([^>]*)>|((\\/)(NAME)\\s*>))([^<]*)'
  .replace(/NAME/g, util.nameRegexp);

//const tagsRegx = new RegExp("<(\\/?[\\w:\\-\._]+)([^>]*)>(\\s*"+cdataRegx+")*([^<]+)?","g");
//const tagsRegx = new RegExp("<(\\/?)((\\w*:)?([\\w:\\-\._]+))([^>]*)>([^<]*)("+cdataRegx+"([^<]*))*([^<]+)?","g");

class OrderedObjParser$1{
  constructor(options){
    this.options = options;
    this.currentNode = null;
    this.tagsNodeStack = [];
    this.docTypeEntities = {};
    this.lastEntities = {
      "amp" : { regex: /&(amp|#38|#x26);/g, val : "&"},
      "apos" : { regex: /&(apos|#39|#x27);/g, val : "'"},
      "gt" : { regex: /&(gt|#62|#x3E);/g, val : ">"},
      "lt" : { regex: /&(lt|#60|#x3C);/g, val : "<"},
      "quot" : { regex: /&(quot|#34|#x22);/g, val : "\""},
    };
    this.htmlEntities = {
      "space": { regex: /&(nbsp|#160);/g, val: " " },
      // "lt" : { regex: /&(lt|#60);/g, val: "<" },
      // "gt" : { regex: /&(gt|#62);/g, val: ">" },
      // "amp" : { regex: /&(amp|#38);/g, val: "&" },
      // "quot" : { regex: /&(quot|#34);/g, val: "\"" },
      // "apos" : { regex: /&(apos|#39);/g, val: "'" },
      "cent" : { regex: /&(cent|#162);/g, val: "¢" },
      "pound" : { regex: /&(pound|#163);/g, val: "£" },
      "yen" : { regex: /&(yen|#165);/g, val: "¥" },
      "euro" : { regex: /&(euro|#8364);/g, val: "€" },
      "copyright" : { regex: /&(copy|#169);/g, val: "©" },
      "reg" : { regex: /&(reg|#174);/g, val: "®" },
      "inr" : { regex: /&(inr|#8377);/g, val: "₹" },
    };
    this.addExternalEntities = addExternalEntities;
    this.parseXml = parseXml;
    this.parseTextData = parseTextData;
    this.resolveNameSpace = resolveNameSpace;
    this.buildAttributesMap = buildAttributesMap;
    this.isItStopNode = isItStopNode;
    this.replaceEntitiesValue = replaceEntitiesValue$2;
    this.readStopNodeData = readStopNodeData;
    this.saveTextToParentTag = saveTextToParentTag;
  }

}

function addExternalEntities(externalEntities){
  const entKeys = Object.keys(externalEntities);
  for (let i = 0; i < entKeys.length; i++) {
    const ent = entKeys[i];
    this.lastEntities[ent] = {
       regex: new RegExp("&"+ent+";","g"),
       val : externalEntities[ent]
    };
  }
}

/**
 * @param {string} val
 * @param {string} tagName
 * @param {string} jPath
 * @param {boolean} dontTrim
 * @param {boolean} hasAttributes
 * @param {boolean} isLeafNode
 * @param {boolean} escapeEntities
 */
function parseTextData(val, tagName, jPath, dontTrim, hasAttributes, isLeafNode, escapeEntities) {
  if (val !== undefined) {
    if (this.options.trimValues && !dontTrim) {
      val = val.trim();
    }
    if(val.length > 0){
      if(!escapeEntities) val = this.replaceEntitiesValue(val);
      
      const newval = this.options.tagValueProcessor(tagName, val, jPath, hasAttributes, isLeafNode);
      if(newval === null || newval === undefined){
        //don't parse
        return val;
      }else if(typeof newval !== typeof val || newval !== val){
        //overwrite
        return newval;
      }else if(this.options.trimValues){
        return parseValue(val, this.options.parseTagValue, this.options.numberParseOptions);
      }else {
        const trimmedVal = val.trim();
        if(trimmedVal === val){
          return parseValue(val, this.options.parseTagValue, this.options.numberParseOptions);
        }else {
          return val;
        }
      }
    }
  }
}

function resolveNameSpace(tagname) {
  if (this.options.removeNSPrefix) {
    const tags = tagname.split(':');
    const prefix = tagname.charAt(0) === '/' ? '/' : '';
    if (tags[0] === 'xmlns') {
      return '';
    }
    if (tags.length === 2) {
      tagname = prefix + tags[1];
    }
  }
  return tagname;
}

//TODO: change regex to capture NS
//const attrsRegx = new RegExp("([\\w\\-\\.\\:]+)\\s*=\\s*(['\"])((.|\n)*?)\\2","gm");
const attrsRegx = new RegExp('([^\\s=]+)\\s*(=\\s*([\'"])([\\s\\S]*?)\\3)?', 'gm');

function buildAttributesMap(attrStr, jPath) {
  if (!this.options.ignoreAttributes && typeof attrStr === 'string') {
    // attrStr = attrStr.replace(/\r?\n/g, ' ');
    //attrStr = attrStr || attrStr.trim();

    const matches = util.getAllMatches(attrStr, attrsRegx);
    const len = matches.length; //don't make it inline
    const attrs = {};
    for (let i = 0; i < len; i++) {
      const attrName = this.resolveNameSpace(matches[i][1]);
      let oldVal = matches[i][4];
      const aName = this.options.attributeNamePrefix + attrName;
      if (attrName.length) {
        if (oldVal !== undefined) {
          if (this.options.trimValues) {
            oldVal = oldVal.trim();
          }
          oldVal = this.replaceEntitiesValue(oldVal);
          const newVal = this.options.attributeValueProcessor(attrName, oldVal, jPath);
          if(newVal === null || newVal === undefined){
            //don't parse
            attrs[aName] = oldVal;
          }else if(typeof newVal !== typeof oldVal || newVal !== oldVal){
            //overwrite
            attrs[aName] = newVal;
          }else {
            //parse
            attrs[aName] = parseValue(
              oldVal,
              this.options.parseAttributeValue,
              this.options.numberParseOptions
            );
          }
        } else if (this.options.allowBooleanAttributes) {
          attrs[aName] = true;
        }
      }
    }
    if (!Object.keys(attrs).length) {
      return;
    }
    if (this.options.attributesGroupName) {
      const attrCollection = {};
      attrCollection[this.options.attributesGroupName] = attrs;
      return attrCollection;
    }
    return attrs;
  }
}

const parseXml = function(xmlData) {
  xmlData = xmlData.replace(/\r\n?/g, "\n"); //TODO: remove this line
  const xmlObj = new xmlNode('!xml');
  let currentNode = xmlObj;
  let textData = "";
  let jPath = "";
  for(let i=0; i< xmlData.length; i++){//for each char in XML data
    const ch = xmlData[i];
    if(ch === '<'){
      // const nextIndex = i+1;
      // const _2ndChar = xmlData[nextIndex];
      if( xmlData[i+1] === '/') {//Closing Tag
        const closeIndex = findClosingIndex(xmlData, ">", i, "Closing Tag is not closed.");
        let tagName = xmlData.substring(i+2,closeIndex).trim();

        if(this.options.removeNSPrefix){
          const colonIndex = tagName.indexOf(":");
          if(colonIndex !== -1){
            tagName = tagName.substr(colonIndex+1);
          }
        }

        if(this.options.transformTagName) {
          tagName = this.options.transformTagName(tagName);
        }

        if(currentNode){
          textData = this.saveTextToParentTag(textData, currentNode, jPath);
        }

        jPath = jPath.substr(0, jPath.lastIndexOf("."));
        
        currentNode = this.tagsNodeStack.pop();//avoid recurssion, set the parent tag scope
        textData = "";
        i = closeIndex;
      } else if( xmlData[i+1] === '?') {

        let tagData = readTagExp(xmlData,i, false, "?>");
        if(!tagData) throw new Error("Pi Tag is not closed.");

        textData = this.saveTextToParentTag(textData, currentNode, jPath);
        if( (this.options.ignoreDeclaration && tagData.tagName === "?xml") || this.options.ignorePiTags);else {
  
          const childNode = new xmlNode(tagData.tagName);
          childNode.add(this.options.textNodeName, "");
          
          if(tagData.tagName !== tagData.tagExp && tagData.attrExpPresent){
            childNode[":@"] = this.buildAttributesMap(tagData.tagExp, jPath);
          }
          currentNode.addChild(childNode);

        }


        i = tagData.closeIndex + 1;
      } else if(xmlData.substr(i + 1, 3) === '!--') {
        const endIndex = findClosingIndex(xmlData, "-->", i+4, "Comment is not closed.");
        if(this.options.commentPropName){
          const comment = xmlData.substring(i + 4, endIndex - 2);

          textData = this.saveTextToParentTag(textData, currentNode, jPath);

          currentNode.add(this.options.commentPropName, [ { [this.options.textNodeName] : comment } ]);
        }
        i = endIndex;
      } else if( xmlData.substr(i + 1, 2) === '!D') {
        const result = readDocType(xmlData, i);
        this.docTypeEntities = result.entities;
        i = result.i;
      }else if(xmlData.substr(i + 1, 2) === '![') {
        const closeIndex = findClosingIndex(xmlData, "]]>", i, "CDATA is not closed.") - 2;
        const tagExp = xmlData.substring(i + 9,closeIndex);

        textData = this.saveTextToParentTag(textData, currentNode, jPath);

        //cdata should be set even if it is 0 length string
        if(this.options.cdataPropName){
          // let val = this.parseTextData(tagExp, this.options.cdataPropName, jPath + "." + this.options.cdataPropName, true, false, true);
          // if(!val) val = "";
          currentNode.add(this.options.cdataPropName, [ { [this.options.textNodeName] : tagExp } ]);
        }else {
          let val = this.parseTextData(tagExp, currentNode.tagname, jPath, true, false, true);
          if(val == undefined) val = "";
          currentNode.add(this.options.textNodeName, val);
        }
        
        i = closeIndex + 2;
      }else {//Opening tag
        let result = readTagExp(xmlData,i, this. options.removeNSPrefix);
        let tagName= result.tagName;
        let tagExp = result.tagExp;
        let attrExpPresent = result.attrExpPresent;
        let closeIndex = result.closeIndex;

        if (this.options.transformTagName) {
          tagName = this.options.transformTagName(tagName);
        }
        
        //save text as child node
        if (currentNode && textData) {
          if(currentNode.tagname !== '!xml'){
            //when nested tag is found
            textData = this.saveTextToParentTag(textData, currentNode, jPath, false);
          }
        }

        if(tagName !== xmlObj.tagname){
          jPath += jPath ? "." + tagName : tagName;
        }

        //check if last tag was unpaired tag
        const lastTag = currentNode;
        if(lastTag && this.options.unpairedTags.indexOf(lastTag.tagname) !== -1 ){
          currentNode = this.tagsNodeStack.pop();
        }

        if (this.isItStopNode(this.options.stopNodes, jPath, tagName)) { //TODO: namespace
          let tagContent = "";
          //self-closing tag
          if(tagExp.length > 0 && tagExp.lastIndexOf("/") === tagExp.length - 1){
            i = result.closeIndex;
          }
          //boolean tag
          else if(this.options.unpairedTags.indexOf(tagName) !== -1){
            i = result.closeIndex;
          }
          //normal tag
          else {
            //read until closing tag is found
            const result = this.readStopNodeData(xmlData, tagName, closeIndex + 1);
            if(!result) throw new Error(`Unexpected end of ${tagName}`);
            i = result.i;
            tagContent = result.tagContent;
          }

          const childNode = new xmlNode(tagName);
          if(tagName !== tagExp && attrExpPresent){
            childNode[":@"] = this.buildAttributesMap(tagExp, jPath);
          }
          if(tagContent) {
            tagContent = this.parseTextData(tagContent, tagName, jPath, true, attrExpPresent, true, true);
          }
          
          jPath = jPath.substr(0, jPath.lastIndexOf("."));
          childNode.add(this.options.textNodeName, tagContent);
          
          currentNode.addChild(childNode);
        }else {
  //selfClosing tag
          if(tagExp.length > 0 && tagExp.lastIndexOf("/") === tagExp.length - 1){
            if(tagName[tagName.length - 1] === "/"){ //remove trailing '/'
              tagName = tagName.substr(0, tagName.length - 1);
              tagExp = tagName;
            }else {
              tagExp = tagExp.substr(0, tagExp.length - 1);
            }
            
            if(this.options.transformTagName) {
              tagName = this.options.transformTagName(tagName);
            }

            const childNode = new xmlNode(tagName);
            if(tagName !== tagExp && attrExpPresent){
              childNode[":@"] = this.buildAttributesMap(tagExp, jPath);
            }
            jPath = jPath.substr(0, jPath.lastIndexOf("."));
            currentNode.addChild(childNode);
          }
    //opening tag
          else {
            const childNode = new xmlNode( tagName);
            this.tagsNodeStack.push(currentNode);
            
            if(tagName !== tagExp && attrExpPresent){
              childNode[":@"] = this.buildAttributesMap(tagExp, jPath);
            }
            currentNode.addChild(childNode);
            currentNode = childNode;
          }
          textData = "";
          i = closeIndex;
        }
      }
    }else {
      textData += xmlData[i];
    }
  }
  return xmlObj.child;
};

const replaceEntitiesValue$2 = function(val){
  if(this.options.processEntities){
    for(let entityName in this.docTypeEntities){
      const entity = this.docTypeEntities[entityName];
      val = val.replace( entity.regx, entity.val);
    }
    for(let entityName in this.lastEntities){
      const entity = this.lastEntities[entityName];
      val = val.replace( entity.regex, entity.val);
    }
    if(this.options.htmlEntities){
      for(let entityName in this.htmlEntities){
        const entity = this.htmlEntities[entityName];
        val = val.replace( entity.regex, entity.val);
      }
    }
  }
  return val;
};
function saveTextToParentTag(textData, currentNode, jPath, isLeafNode) {
  if (textData) { //store previously collected data as textNode
    if(isLeafNode === undefined) isLeafNode = Object.keys(currentNode.child).length === 0;
    
    textData = this.parseTextData(textData,
      currentNode.tagname,
      jPath,
      false,
      currentNode[":@"] ? Object.keys(currentNode[":@"]).length !== 0 : false,
      isLeafNode);

    if (textData !== undefined && textData !== "")
      currentNode.add(this.options.textNodeName, textData);
    textData = "";
  }
  return textData;
}

//TODO: use jPath to simplify the logic
/**
 * 
 * @param {string[]} stopNodes 
 * @param {string} jPath
 * @param {string} currentTagName 
 */
function isItStopNode(stopNodes, jPath, currentTagName){
  const allNodesExp = "*." + currentTagName;
  for (const stopNodePath in stopNodes) {
    const stopNodeExp = stopNodes[stopNodePath];
    if( allNodesExp === stopNodeExp || jPath === stopNodeExp  ) return true;
  }
  return false;
}

/**
 * Returns the tag Expression and where it is ending handling single-dobule quotes situation
 * @param {string} xmlData 
 * @param {number} i starting index
 * @returns 
 */
function tagExpWithClosingIndex(xmlData, i, closingChar = ">"){
  let attrBoundary;
  let tagExp = "";
  for (let index = i; index < xmlData.length; index++) {
    let ch = xmlData[index];
    if (attrBoundary) {
        if (ch === attrBoundary) attrBoundary = "";//reset
    } else if (ch === '"' || ch === "'") {
        attrBoundary = ch;
    } else if (ch === closingChar[0]) {
      if(closingChar[1]){
        if(xmlData[index + 1] === closingChar[1]){
          return {
            data: tagExp,
            index: index
          }
        }
      }else {
        return {
          data: tagExp,
          index: index
        }
      }
    } else if (ch === '\t') {
      ch = " ";
    }
    tagExp += ch;
  }
}

function findClosingIndex(xmlData, str, i, errMsg){
  const closingIndex = xmlData.indexOf(str, i);
  if(closingIndex === -1){
    throw new Error(errMsg)
  }else {
    return closingIndex + str.length - 1;
  }
}

function readTagExp(xmlData,i, removeNSPrefix, closingChar = ">"){
  const result = tagExpWithClosingIndex(xmlData, i+1, closingChar);
  if(!result) return;
  let tagExp = result.data;
  const closeIndex = result.index;
  const separatorIndex = tagExp.search(/\s/);
  let tagName = tagExp;
  let attrExpPresent = true;
  if(separatorIndex !== -1){//separate tag name and attributes expression
    tagName = tagExp.substr(0, separatorIndex).replace(/\s\s*$/, '');
    tagExp = tagExp.substr(separatorIndex + 1);
  }

  if(removeNSPrefix){
    const colonIndex = tagName.indexOf(":");
    if(colonIndex !== -1){
      tagName = tagName.substr(colonIndex+1);
      attrExpPresent = tagName !== result.data.substr(colonIndex + 1);
    }
  }

  return {
    tagName: tagName,
    tagExp: tagExp,
    closeIndex: closeIndex,
    attrExpPresent: attrExpPresent,
  }
}
/**
 * find paired tag for a stop node
 * @param {string} xmlData 
 * @param {string} tagName 
 * @param {number} i 
 */
function readStopNodeData(xmlData, tagName, i){
  const startIndex = i;
  // Starting at 1 since we already have an open tag
  let openTagCount = 1;

  for (; i < xmlData.length; i++) {
    if( xmlData[i] === "<"){ 
      if (xmlData[i+1] === "/") {//close tag
          const closeIndex = findClosingIndex(xmlData, ">", i, `${tagName} is not closed`);
          let closeTagName = xmlData.substring(i+2,closeIndex).trim();
          if(closeTagName === tagName){
            openTagCount--;
            if (openTagCount === 0) {
              return {
                tagContent: xmlData.substring(startIndex, i),
                i : closeIndex
              }
            }
          }
          i=closeIndex;
        } else if(xmlData[i+1] === '?') { 
          const closeIndex = findClosingIndex(xmlData, "?>", i+1, "StopNode is not closed.");
          i=closeIndex;
        } else if(xmlData.substr(i + 1, 3) === '!--') { 
          const closeIndex = findClosingIndex(xmlData, "-->", i+3, "StopNode is not closed.");
          i=closeIndex;
        } else if(xmlData.substr(i + 1, 2) === '![') { 
          const closeIndex = findClosingIndex(xmlData, "]]>", i, "StopNode is not closed.") - 2;
          i=closeIndex;
        } else {
          const tagData = readTagExp(xmlData, i, '>');

          if (tagData) {
            const openTagName = tagData && tagData.tagName;
            if (openTagName === tagName && tagData.tagExp[tagData.tagExp.length-1] !== "/") {
              openTagCount++;
            }
            i=tagData.closeIndex;
          }
        }
      }
  }//end for loop
}

function parseValue(val, shouldParse, options) {
  if (shouldParse && typeof val === 'string') {
    //console.log(options)
    const newval = val.trim();
    if(newval === 'true' ) return true;
    else if(newval === 'false' ) return false;
    else return toNumber(val, options);
  } else {
    if (util.isExist(val)) {
      return val;
    } else {
      return '';
    }
  }
}


var OrderedObjParser_1 = OrderedObjParser$1;

var node2json = {};

/**
 * 
 * @param {array} node 
 * @param {any} options 
 * @returns 
 */
function prettify$1(node, options){
  return compress( node, options);
}

/**
 * 
 * @param {array} arr 
 * @param {object} options 
 * @param {string} jPath 
 * @returns object
 */
function compress(arr, options, jPath){
  let text;
  const compressedObj = {};
  for (let i = 0; i < arr.length; i++) {
    const tagObj = arr[i];
    const property = propName$1(tagObj);
    let newJpath = "";
    if(jPath === undefined) newJpath = property;
    else newJpath = jPath + "." + property;

    if(property === options.textNodeName){
      if(text === undefined) text = tagObj[property];
      else text += "" + tagObj[property];
    }else if(property === undefined){
      continue;
    }else if(tagObj[property]){
      
      let val = compress(tagObj[property], options, newJpath);
      const isLeaf = isLeafTag(val, options);

      if(tagObj[":@"]){
        assignAttributes( val, tagObj[":@"], newJpath, options);
      }else if(Object.keys(val).length === 1 && val[options.textNodeName] !== undefined && !options.alwaysCreateTextNode){
        val = val[options.textNodeName];
      }else if(Object.keys(val).length === 0){
        if(options.alwaysCreateTextNode) val[options.textNodeName] = "";
        else val = "";
      }

      if(compressedObj[property] !== undefined && compressedObj.hasOwnProperty(property)) {
        if(!Array.isArray(compressedObj[property])) {
            compressedObj[property] = [ compressedObj[property] ];
        }
        compressedObj[property].push(val);
      }else {
        //TODO: if a node is not an array, then check if it should be an array
        //also determine if it is a leaf node
        if (options.isArray(property, newJpath, isLeaf )) {
          compressedObj[property] = [val];
        }else {
          compressedObj[property] = val;
        }
      }
    }
    
  }
  // if(text && text.length > 0) compressedObj[options.textNodeName] = text;
  if(typeof text === "string"){
    if(text.length > 0) compressedObj[options.textNodeName] = text;
  }else if(text !== undefined) compressedObj[options.textNodeName] = text;
  return compressedObj;
}

function propName$1(obj){
  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if(key !== ":@") return key;
  }
}

function assignAttributes(obj, attrMap, jpath, options){
  if (attrMap) {
    const keys = Object.keys(attrMap);
    const len = keys.length; //don't make it inline
    for (let i = 0; i < len; i++) {
      const atrrName = keys[i];
      if (options.isArray(atrrName, jpath + "." + atrrName, true, true)) {
        obj[atrrName] = [ attrMap[atrrName] ];
      } else {
        obj[atrrName] = attrMap[atrrName];
      }
    }
  }
}

function isLeafTag(obj, options){
  const propCount = Object.keys(obj).length;
  if( propCount === 0 || (propCount === 1 && obj[options.textNodeName]) ) return true;
  return false;
}
node2json.prettify = prettify$1;

const { buildOptions} = OptionsBuilder;
const OrderedObjParser = OrderedObjParser_1;
const { prettify} = node2json;
const validator$1 = validator$2;

class XMLParser$1{
    
    constructor(options){
        this.externalEntities = {};
        this.options = buildOptions(options);
        
    }
    /**
     * Parse XML dats to JS object 
     * @param {string|Buffer} xmlData 
     * @param {boolean|Object} validationOption 
     */
    parse(xmlData,validationOption){
        if(typeof xmlData === "string");else if( xmlData.toString){
            xmlData = xmlData.toString();
        }else {
            throw new Error("XML data is accepted in String or Bytes[] form.")
        }
        if( validationOption){
            if(validationOption === true) validationOption = {}; //validate with default options
            
            const result = validator$1.validate(xmlData, validationOption);
            if (result !== true) {
              throw Error( `${result.err.msg}:${result.err.line}:${result.err.col}` )
            }
          }
        const orderedObjParser = new OrderedObjParser(this.options);
        orderedObjParser.addExternalEntities(this.externalEntities);
        const orderedResult = orderedObjParser.parseXml(xmlData);
        if(this.options.preserveOrder || orderedResult === undefined) return orderedResult;
        else return prettify(orderedResult, this.options);
    }

    /**
     * Add Entity which is not by default supported by this library
     * @param {string} key 
     * @param {string} value 
     */
    addEntity(key, value){
        if(value.indexOf("&") !== -1){
            throw new Error("Entity value can't have '&'")
        }else if(key.indexOf("&") !== -1 || key.indexOf(";") !== -1){
            throw new Error("An entity must be set without '&' and ';'. Eg. use '#xD' for '&#xD;'")
        }else {
            this.externalEntities[key] = value;
        }
    }
}

var XMLParser_1 = XMLParser$1;

const EOL = "\n";

/**
 * 
 * @param {array} jArray 
 * @param {any} options 
 * @returns 
 */
function toXml(jArray, options){
    return arrToStr( jArray, options, "", 0);
}

function arrToStr(arr, options, jPath, level){
    let xmlStr = "";

    let indentation = "";
    if(options.format && options.indentBy.length > 0){//TODO: this logic can be avoided for each call
        indentation = EOL + "" + options.indentBy.repeat(level);
    }

    for (let i = 0; i < arr.length; i++) {
        const tagObj = arr[i];
        const tagName = propName(tagObj);
        let newJPath = "";
        if(jPath.length === 0) newJPath = tagName;
        else newJPath = `${jPath}.${tagName}`;

        if(tagName === options.textNodeName){
            let tagText = tagObj[tagName];
            if(!isStopNode(newJPath, options)){
                tagText = options.tagValueProcessor( tagName, tagText);
                tagText = replaceEntitiesValue$1(tagText, options);
            }
            xmlStr += indentation + tagText;
            continue;
        }else if( tagName === options.cdataPropName){
            xmlStr += indentation + `<![CDATA[${tagObj[tagName][0][options.textNodeName]}]]>`;
            continue;
        }else if( tagName === options.commentPropName){
            xmlStr += indentation + `<!--${tagObj[tagName][0][options.textNodeName]}-->`;
            continue;
        }else if( tagName[0] === "?"){
            const attStr = attr_to_str(tagObj[":@"], options);
            const tempInd = tagName === "?xml" ? "" : indentation;
            let piTextNodeName = tagObj[tagName][0][options.textNodeName];
            piTextNodeName = piTextNodeName.length !== 0 ? " " + piTextNodeName : ""; //remove extra spacing
            xmlStr += tempInd + `<${tagName}${piTextNodeName}${attStr}?>`;
            continue;
        }
        const attStr = attr_to_str(tagObj[":@"], options);
        let tagStart =  indentation + `<${tagName}${attStr}`;
        let tagValue = arrToStr(tagObj[tagName], options, newJPath, level + 1);
        if(options.unpairedTags.indexOf(tagName) !== -1){
            if(options.suppressUnpairedNode)  xmlStr += tagStart + ">"; 
            else xmlStr += tagStart + "/>"; 
        }else if( (!tagValue || tagValue.length === 0) && options.suppressEmptyNode){ 
            xmlStr += tagStart + "/>"; 
        }else { 
            //TODO: node with only text value should not parse the text value in next line
            xmlStr += tagStart + `>${tagValue}${indentation}</${tagName}>` ;
        }
    }
    
    return xmlStr;
}

function propName(obj){
    const keys = Object.keys(obj);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if(key !== ":@") return key;
    }
  }

function attr_to_str(attrMap, options){
    let attrStr = "";
    if(attrMap && !options.ignoreAttributes){
        for (let attr in attrMap){
            let attrVal = options.attributeValueProcessor(attr, attrMap[attr]);
            attrVal = replaceEntitiesValue$1(attrVal, options);
            if(attrVal === true && options.suppressBooleanAttributes){
                attrStr+= ` ${attr.substr(options.attributeNamePrefix.length)}`;
            }else {
                attrStr+= ` ${attr.substr(options.attributeNamePrefix.length)}="${attrVal}"`;
            }
        }
    }
    return attrStr;
}

function isStopNode(jPath, options){
    jPath = jPath.substr(0,jPath.length - options.textNodeName.length - 1);
    let tagName = jPath.substr(jPath.lastIndexOf(".") + 1);
    for(let index in options.stopNodes){
        if(options.stopNodes[index] === jPath || options.stopNodes[index] === "*."+tagName) return true;
    }
    return false;
}

function replaceEntitiesValue$1(textValue, options){
    if(textValue && textValue.length > 0 && options.processEntities){
      for (let i=0; i< options.entities.length; i++) {
        const entity = options.entities[i];
        textValue = textValue.replace(entity.regex, entity.val);
      }
    }
    return textValue;
  }
var orderedJs2Xml = toXml;

//parse Empty Node as self closing node
const buildFromOrderedJs = orderedJs2Xml;

const defaultOptions = {
  attributeNamePrefix: '@_',
  attributesGroupName: false,
  textNodeName: '#text',
  ignoreAttributes: true,
  cdataPropName: false,
  format: false,
  indentBy: '  ',
  suppressEmptyNode: false,
  suppressUnpairedNode: true,
  suppressBooleanAttributes: true,
  tagValueProcessor: function(key, a) {
    return a;
  },
  attributeValueProcessor: function(attrName, a) {
    return a;
  },
  preserveOrder: false,
  commentPropName: false,
  unpairedTags: [],
  entities: [
    { regex: new RegExp("&", "g"), val: "&amp;" },//it must be on top
    { regex: new RegExp(">", "g"), val: "&gt;" },
    { regex: new RegExp("<", "g"), val: "&lt;" },
    { regex: new RegExp("\'", "g"), val: "&apos;" },
    { regex: new RegExp("\"", "g"), val: "&quot;" }
  ],
  processEntities: true,
  stopNodes: [],
  transformTagName: false,
};

function Builder(options) {
  this.options = Object.assign({}, defaultOptions, options);
  if (this.options.ignoreAttributes || this.options.attributesGroupName) {
    this.isAttribute = function(/*a*/) {
      return false;
    };
  } else {
    this.attrPrefixLen = this.options.attributeNamePrefix.length;
    this.isAttribute = isAttribute;
  }

  this.processTextOrObjNode = processTextOrObjNode;

  if (this.options.format) {
    this.indentate = indentate;
    this.tagEndChar = '>\n';
    this.newLine = '\n';
  } else {
    this.indentate = function() {
      return '';
    };
    this.tagEndChar = '>';
    this.newLine = '';
  }

  if (this.options.suppressEmptyNode) {
    this.buildTextNode = buildEmptyTextNode;
    this.buildObjNode = buildEmptyObjNode;
  } else {
    this.buildTextNode = buildTextValNode;
    this.buildObjNode = buildObjectNode;
  }

  this.buildTextValNode = buildTextValNode;
  this.buildObjectNode = buildObjectNode;

  this.replaceEntitiesValue = replaceEntitiesValue;
  this.buildAttrPairStr = buildAttrPairStr;
}

Builder.prototype.build = function(jObj) {
  if(this.options.preserveOrder){
    return buildFromOrderedJs(jObj, this.options);
  }else {
    if(Array.isArray(jObj) && this.options.arrayNodeName && this.options.arrayNodeName.length > 1){
      jObj = {
        [this.options.arrayNodeName] : jObj
      };
    }
    return this.j2x(jObj, 0).val;
  }
};

Builder.prototype.j2x = function(jObj, level) {
  let attrStr = '';
  let val = '';
  for (let key in jObj) {
    if (typeof jObj[key] === 'undefined') ; else if (jObj[key] === null) {
      if(key[0] === "?") val += this.indentate(level) + '<' + key + '?' + this.tagEndChar;
      else val += this.indentate(level) + '<' + key + '/' + this.tagEndChar;
      // val += this.indentate(level) + '<' + key + '/' + this.tagEndChar;
    } else if (jObj[key] instanceof Date) {
      val += this.buildTextNode(jObj[key], key, '', level);
    } else if (typeof jObj[key] !== 'object') {
      //premitive type
      const attr = this.isAttribute(key);
      if (attr) {
        attrStr += this.buildAttrPairStr(attr, '' + jObj[key]);
      }else {
        //tag value
        if (key === this.options.textNodeName) {
          let newval = this.options.tagValueProcessor(key, '' + jObj[key]);
          val += this.replaceEntitiesValue(newval);
        } else {
          val += this.buildTextNode(jObj[key], key, '', level);
        }
      }
    } else if (Array.isArray(jObj[key])) {
      //repeated nodes
      const arrLen = jObj[key].length;
      for (let j = 0; j < arrLen; j++) {
        const item = jObj[key][j];
        if (typeof item === 'undefined') ; else if (item === null) {
          if(key[0] === "?") val += this.indentate(level) + '<' + key + '?' + this.tagEndChar;
          else val += this.indentate(level) + '<' + key + '/' + this.tagEndChar;
          // val += this.indentate(level) + '<' + key + '/' + this.tagEndChar;
        } else if (typeof item === 'object') {
          val += this.processTextOrObjNode(item, key, level);
        } else {
          val += this.buildTextNode(item, key, '', level);
        }
      }
    } else {
      //nested node
      if (this.options.attributesGroupName && key === this.options.attributesGroupName) {
        const Ks = Object.keys(jObj[key]);
        const L = Ks.length;
        for (let j = 0; j < L; j++) {
          attrStr += this.buildAttrPairStr(Ks[j], '' + jObj[key][Ks[j]]);
        }
      } else {
        val += this.processTextOrObjNode(jObj[key], key, level);
      }
    }
  }
  return {attrStr: attrStr, val: val};
};

function buildAttrPairStr(attrName, val){
  val = this.options.attributeValueProcessor(attrName, '' + val);
  val = this.replaceEntitiesValue(val);
  if (this.options.suppressBooleanAttributes && val === "true") {
    return ' ' + attrName;
  } else return ' ' + attrName + '="' + val + '"';
}

function processTextOrObjNode (object, key, level) {
  const result = this.j2x(object, level + 1);
  if (object[this.options.textNodeName] !== undefined && Object.keys(object).length === 1) {
    return this.buildTextNode(object[this.options.textNodeName], key, result.attrStr, level);
  } else {
    return this.buildObjNode(result.val, key, result.attrStr, level);
  }
}

function buildObjectNode(val, key, attrStr, level) {
  let tagEndExp = '</' + key + this.tagEndChar;
  let piClosingChar = "";
  
  if(key[0] === "?") {
    piClosingChar = "?";
    tagEndExp = "";
  }

  if (attrStr && val.indexOf('<') === -1) {
    return ( this.indentate(level) + '<' +  key + attrStr + piClosingChar + '>' + val + tagEndExp );
  } else if (this.options.commentPropName !== false && key === this.options.commentPropName && piClosingChar.length === 0) {
    return this.indentate(level) + `<!--${val}-->` + this.newLine;
  }else {
    return (
      this.indentate(level) + '<' + key + attrStr + piClosingChar + this.tagEndChar +
      val +
      this.indentate(level) + tagEndExp    );
  }
}

function buildEmptyObjNode(val, key, attrStr, level) {
  if (val !== '') {
    return this.buildObjectNode(val, key, attrStr, level);
  } else {
    if(key[0] === "?") return  this.indentate(level) + '<' + key + attrStr+ '?' + this.tagEndChar;
    else return  this.indentate(level) + '<' + key + attrStr + '/' + this.tagEndChar;
  }
}

function buildTextValNode(val, key, attrStr, level) {
  if (this.options.cdataPropName !== false && key === this.options.cdataPropName) {
    return this.indentate(level) + `<![CDATA[${val}]]>` +  this.newLine;
  }else if (this.options.commentPropName !== false && key === this.options.commentPropName) {
    return this.indentate(level) + `<!--${val}-->` +  this.newLine;
  }else {
    let textValue = this.options.tagValueProcessor(key, val);
    textValue = this.replaceEntitiesValue(textValue);
  
    if( textValue === '' && this.options.unpairedTags.indexOf(key) !== -1){ //unpaired
      if(this.options.suppressUnpairedNode){
        return this.indentate(level) + '<' + key + this.tagEndChar;
      }else {
        return this.indentate(level) + '<' + key + "/" + this.tagEndChar;
      }
    } else {
      return (
        this.indentate(level) + '<' + key + attrStr + '>' +
         textValue +
        '</' + key + this.tagEndChar  );
    }

  }
}

function replaceEntitiesValue(textValue){
  if(textValue && textValue.length > 0 && this.options.processEntities){
    for (let i=0; i<this.options.entities.length; i++) {
      const entity = this.options.entities[i];
      textValue = textValue.replace(entity.regex, entity.val);
    }
  }
  return textValue;
}

function buildEmptyTextNode(val, key, attrStr, level) {
  if( val === '' && this.options.unpairedTags.indexOf(key) !== -1){ //unpaired
    if(this.options.suppressUnpairedNode){
      return this.indentate(level) + '<' + key + this.tagEndChar;
    }else {
      return this.indentate(level) + '<' + key + "/" + this.tagEndChar;
    }
  }else if (val !== '') { //empty
    return this.buildTextValNode(val, key, attrStr, level);
  } else {
    if(key[0] === "?") return  this.indentate(level) + '<' + key + attrStr+ '?' + this.tagEndChar; //PI tag
    else return  this.indentate(level) + '<' + key + attrStr + '/' + this.tagEndChar; //normal
  }
}

function indentate(level) {
  return this.options.indentBy.repeat(level);
}

function isAttribute(name /*, options*/) {
  if (name.startsWith(this.options.attributeNamePrefix)) {
    return name.substr(this.attrPrefixLen);
  } else {
    return false;
  }
}

var json2xml = Builder;

const validator = validator$2;
const XMLParser = XMLParser_1;
const XMLBuilder = json2xml;

var fxp = {
  XMLParser: XMLParser,
  XMLValidator: validator,
  XMLBuilder: XMLBuilder
};

function array_cancel() {
  this._array = null;
  return Promise.resolve();
}

function array_read() {
  var array = this._array;
  this._array = null;
  return Promise.resolve(array ? {done: false, value: array} : {done: true, value: undefined});
}

function array(array) {
  return new ArraySource(array instanceof Uint8Array ? array : new Uint8Array(array));
}

function ArraySource(array) {
  this._array = array;
}

ArraySource.prototype.read = array_read;
ArraySource.prototype.cancel = array_cancel;

function fetchPath(url) {
  return fetch(url).then(function(response) {
    return response.body && response.body.getReader
        ? response.body.getReader()
        : response.arrayBuffer().then(array);
  });
}

function requestPath(url) {
  return new Promise(function(resolve, reject) {
    var request = new XMLHttpRequest;
    request.responseType = "arraybuffer";
    request.onload = function() { resolve(array(request.response)); };
    request.onerror = reject;
    request.ontimeout = reject;
    request.open("GET", url, true);
    request.send();
  });
}

function path(path) {
  return (typeof fetch === "function" ? fetchPath : requestPath)(path);
}

function stream(source) {
  return typeof source.read === "function" ? source : source.getReader();
}

var empty = new Uint8Array(0);

function slice_cancel() {
  return this._source.cancel();
}

function concat$1(a, b) {
  if (!a.length) return b;
  if (!b.length) return a;
  var c = new Uint8Array(a.length + b.length);
  c.set(a);
  c.set(b, a.length);
  return c;
}

function slice_read() {
  var that = this, array = that._array.subarray(that._index);
  return that._source.read().then(function(result) {
    that._array = empty;
    that._index = 0;
    return result.done ? (array.length > 0
        ? {done: false, value: array}
        : {done: true, value: undefined})
        : {done: false, value: concat$1(array, result.value)};
  });
}

function slice_slice(length) {
  if ((length |= 0) < 0) throw new Error("invalid length");
  var that = this, index = this._array.length - this._index;

  // If the request fits within the remaining buffer, resolve it immediately.
  if (this._index + length <= this._array.length) {
    return Promise.resolve(this._array.subarray(this._index, this._index += length));
  }

  // Otherwise, read chunks repeatedly until the request is fulfilled.
  var array = new Uint8Array(length);
  array.set(this._array.subarray(this._index));
  return (function read() {
    return that._source.read().then(function(result) {

      // When done, it’s possible the request wasn’t fully fullfilled!
      // If so, the pre-allocated array is too big and needs slicing.
      if (result.done) {
        that._array = empty;
        that._index = 0;
        return index > 0 ? array.subarray(0, index) : null;
      }

      // If this chunk fulfills the request, return the resulting array.
      if (index + result.value.length >= length) {
        that._array = result.value;
        that._index = length - index;
        array.set(result.value.subarray(0, length - index), index);
        return array;
      }

      // Otherwise copy this chunk into the array, then read the next chunk.
      array.set(result.value, index);
      index += result.value.length;
      return read();
    });
  })();
}

function slice(source) {
  return typeof source.slice === "function" ? source :
      new SliceSource(typeof source.read === "function" ? source
          : source.getReader());
}

function SliceSource(source) {
  this._source = source;
  this._array = empty;
  this._index = 0;
}

SliceSource.prototype.read = slice_read;
SliceSource.prototype.slice = slice_slice;
SliceSource.prototype.cancel = slice_cancel;

function dbf_cancel() {
  return this._source.cancel();
}

function readBoolean(value) {
  return /^[nf]$/i.test(value) ? false
      : /^[yt]$/i.test(value) ? true
      : null;
}

function readDate(value) {
  return new Date(+value.substring(0, 4), value.substring(4, 6) - 1, +value.substring(6, 8));
}

function readNumber(value) {
  return !(value = value.trim()) || isNaN(value = +value) ? null : value;
}

function readString(value) {
  return value.trim() || null;
}

var types = {
  B: readNumber,
  C: readString,
  D: readDate,
  F: readNumber,
  L: readBoolean,
  M: readNumber,
  N: readNumber
};

function dbf_read() {
  var that = this, i = 1;
  return that._source.slice(that._recordLength).then(function(value) {
    return value && (value[0] !== 0x1a) ? {done: false, value: that._fields.reduce(function(p, f) {
      p[f.name] = types[f.type](that._decode(value.subarray(i, i += f.length)));
      return p;
    }, {})} : {done: true, value: undefined};
  });
}

function view(array) {
  return new DataView(array.buffer, array.byteOffset, array.byteLength);
}

function dbf(source, decoder) {
  source = slice(source);
  return source.slice(32).then(function(array) {
    var head = view(array);
    return source.slice(head.getUint16(8, true) - 32).then(function(array) {
      return new Dbf(source, decoder, head, view(array));
    });
  });
}

function Dbf(source, decoder, head, body) {
  this._source = source;
  this._decode = decoder.decode.bind(decoder);
  this._recordLength = head.getUint16(10, true);
  this._fields = [];
  for (var n = 0; body.getUint8(n) !== 0x0d; n += 32) {
    for (var j = 0; j < 11; ++j) if (body.getUint8(n + j) === 0) break;
    this._fields.push({
      name: this._decode(new Uint8Array(body.buffer, body.byteOffset + n, j)),
      type: String.fromCharCode(body.getUint8(n + 11)),
      length: body.getUint8(n + 16)
    });
  }
}

var prototype$2 = Dbf.prototype;
prototype$2.read = dbf_read;
prototype$2.cancel = dbf_cancel;

function cancel() {
  return this._source.cancel();
}

function parseMultiPoint(record) {
  var i = 40, j, n = record.getInt32(36, true), coordinates = new Array(n);
  for (j = 0; j < n; ++j, i += 16) coordinates[j] = [record.getFloat64(i, true), record.getFloat64(i + 8, true)];
  return {type: "MultiPoint", coordinates: coordinates};
}

function parseNull() {
  return null;
}

function parsePoint(record) {
  return {type: "Point", coordinates: [record.getFloat64(4, true), record.getFloat64(12, true)]};
}

function parsePolygon(record) {
  var i = 44, j, n = record.getInt32(36, true), m = record.getInt32(40, true), parts = new Array(n), points = new Array(m), polygons = [], holes = [];
  for (j = 0; j < n; ++j, i += 4) parts[j] = record.getInt32(i, true);
  for (j = 0; j < m; ++j, i += 16) points[j] = [record.getFloat64(i, true), record.getFloat64(i + 8, true)];

  parts.forEach(function(i, j) {
    var ring = points.slice(i, parts[j + 1]);
    if (ringClockwise(ring)) polygons.push([ring]);
    else holes.push(ring);
  });

  holes.forEach(function(hole) {
    polygons.some(function(polygon) {
      if (ringContainsSome(polygon[0], hole)) {
        polygon.push(hole);
        return true;
      }
    }) || polygons.push([hole]);
  });

  return polygons.length === 1
      ? {type: "Polygon", coordinates: polygons[0]}
      : {type: "MultiPolygon", coordinates: polygons};
}
function ringClockwise(ring) {
  if ((n = ring.length) < 4) return false;
  var i = 0, n, area = ring[n - 1][1] * ring[0][0] - ring[n - 1][0] * ring[0][1];
  while (++i < n) area += ring[i - 1][1] * ring[i][0] - ring[i - 1][0] * ring[i][1];
  return area >= 0;
}

function ringContainsSome(ring, hole) {
  var i = -1, n = hole.length, c;
  while (++i < n) {
    if (c = ringContains(ring, hole[i])) {
      return c > 0;
    }
  }
  return false;
}

function ringContains(ring, point) {
  var x = point[0], y = point[1], contains = -1;
  for (var i = 0, n = ring.length, j = n - 1; i < n; j = i++) {
    var pi = ring[i], xi = pi[0], yi = pi[1],
        pj = ring[j], xj = pj[0], yj = pj[1];
    if (segmentContains(pi, pj, point)) {
      return 0;
    }
    if (((yi > y) !== (yj > y)) && ((x < (xj - xi) * (y - yi) / (yj - yi) + xi))) {
      contains = -contains;
    }
  }
  return contains;
}

function segmentContains(p0, p1, p2) {
  var x20 = p2[0] - p0[0], y20 = p2[1] - p0[1];
  if (x20 === 0 && y20 === 0) return true;
  var x10 = p1[0] - p0[0], y10 = p1[1] - p0[1];
  if (x10 === 0 && y10 === 0) return false;
  var t = (x20 * x10 + y20 * y10) / (x10 * x10 + y10 * y10);
  return t < 0 || t > 1 ? false : t === 0 || t === 1 ? true : t * x10 === x20 && t * y10 === y20;
}

function parsePolyLine(record) {
  var i = 44, j, n = record.getInt32(36, true), m = record.getInt32(40, true), parts = new Array(n), points = new Array(m);
  for (j = 0; j < n; ++j, i += 4) parts[j] = record.getInt32(i, true);
  for (j = 0; j < m; ++j, i += 16) points[j] = [record.getFloat64(i, true), record.getFloat64(i + 8, true)];
  return n === 1
      ? {type: "LineString", coordinates: points}
      : {type: "MultiLineString", coordinates: parts.map(function(i, j) { return points.slice(i, parts[j + 1]); })};
}

function concat(a, b) {
  var ab = new Uint8Array(a.length + b.length);
  ab.set(a, 0);
  ab.set(b, a.length);
  return ab;
}

function shp_read() {
  var that = this;
  ++that._index;
  return that._source.slice(12).then(function(array) {
    if (array == null) return {done: true, value: undefined};
    var header = view(array);

    // If the record starts with an invalid shape type (see #36), scan ahead in
    // four-byte increments to find the next valid record, identified by the
    // expected index, a non-empty content length and a valid shape type.
    function skip() {
      return that._source.slice(4).then(function(chunk) {
        if (chunk == null) return {done: true, value: undefined};
        header = view(array = concat(array.slice(4), chunk));
        return header.getInt32(0, false) !== that._index ? skip() : read();
      });
    }

    // All records should have at least four bytes (for the record shape type),
    // so an invalid content length indicates corruption.
    function read() {
      var length = header.getInt32(4, false) * 2 - 4, type = header.getInt32(8, true);
      return length < 0 || (type && type !== that._type) ? skip() : that._source.slice(length).then(function(chunk) {
        return {done: false, value: type ? that._parse(view(concat(array.slice(8), chunk))) : null};
      });
    }

    return read();
  });
}

var parsers = {
  0: parseNull,
  1: parsePoint,
  3: parsePolyLine,
  5: parsePolygon,
  8: parseMultiPoint,
  11: parsePoint, // PointZ
  13: parsePolyLine, // PolyLineZ
  15: parsePolygon, // PolygonZ
  18: parseMultiPoint, // MultiPointZ
  21: parsePoint, // PointM
  23: parsePolyLine, // PolyLineM
  25: parsePolygon, // PolygonM
  28: parseMultiPoint // MultiPointM
};

function shp(source) {
  source = slice(source);
  return source.slice(100).then(function(array) {
    return new Shp(source, view(array));
  });
}
function Shp(source, header) {
  var type = header.getInt32(32, true);
  if (!(type in parsers)) throw new Error("unsupported shape type: " + type);
  this._source = source;
  this._type = type;
  this._index = 0;
  this._parse = parsers[type];
  this.bbox = [header.getFloat64(36, true), header.getFloat64(44, true), header.getFloat64(52, true), header.getFloat64(60, true)];
}

var prototype$1 = Shp.prototype;
prototype$1.read = shp_read;
prototype$1.cancel = cancel;

function noop() {}

function shapefile_cancel() {
  return Promise.all([
    this._dbf && this._dbf.cancel(),
    this._shp.cancel()
  ]).then(noop);
}

function shapefile_read() {
  var that = this;
  return Promise.all([
    that._dbf ? that._dbf.read() : {value: {}},
    that._shp.read()
  ]).then(function(results) {
    var dbf = results[0], shp = results[1];
    return shp.done ? shp : {
      done: false,
      value: {
        type: "Feature",
        properties: dbf.value,
        geometry: shp.value
      }
    };
  });
}

function shapefile(shpSource, dbfSource, decoder) {
  return Promise.all([
    shp(shpSource),
    dbfSource && dbf(dbfSource, decoder)
  ]).then(function(sources) {
    return new Shapefile(sources[0], sources[1]);
  });
}

function Shapefile(shp, dbf) {
  this._shp = shp;
  this._dbf = dbf;
  this.bbox = shp.bbox;
}

var prototype = Shapefile.prototype;
prototype.read = shapefile_read;
prototype.cancel = shapefile_cancel;

function open(shp, dbf, options) {
  if (typeof dbf === "string") {
    if (!/\.dbf$/.test(dbf)) dbf += ".dbf";
    dbf = path(dbf);
  } else if (dbf instanceof ArrayBuffer || dbf instanceof Uint8Array) {
    dbf = array(dbf);
  } else if (dbf != null) {
    dbf = stream(dbf);
  }
  if (typeof shp === "string") {
    if (!/\.shp$/.test(shp)) shp += ".shp";
    if (dbf === undefined) dbf = path(shp.substring(0, shp.length - 4) + ".dbf").catch(function() {});
    shp = path(shp);
  } else if (shp instanceof ArrayBuffer || shp instanceof Uint8Array) {
    shp = array(shp);
  } else {
    shp = stream(shp);
  }
  return Promise.all([shp, dbf]).then(function(sources) {
    var shp = sources[0], dbf = sources[1], encoding = "windows-1252";
    if (options && options.encoding != null) encoding = options.encoding;
    return shapefile(shp, dbf, dbf && new TextDecoder(encoding));
  });
}

function read(shp, dbf, options) {
  return open(shp, dbf, options).then(function(source) {
    var features = [], collection = {type: "FeatureCollection", features: features, bbox: source.bbox};
    return source.read().then(function read(result) {
      if (result.done) return collection;
      features.push(result.value);
      return source.read().then(read);
    });
  });
}

function getSafe (value, defVal) {
  try {
    return value()
  } catch (e) {
    return defVal
  }
}

function globals(defs) {
  defs('EPSG:4326', "+title=WGS 84 (long/lat) +proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees");
  defs('EPSG:4269', "+title=NAD83 (long/lat) +proj=longlat +a=6378137.0 +b=6356752.31414036 +ellps=GRS80 +datum=NAD83 +units=degrees");
  defs('EPSG:3857', "+title=WGS 84 / Pseudo-Mercator +proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +no_defs");

  defs.WGS84 = defs['EPSG:4326'];
  defs['EPSG:3785'] = defs['EPSG:3857']; // maintain backward compat, official code is 3857
  defs.GOOGLE = defs['EPSG:3857'];
  defs['EPSG:900913'] = defs['EPSG:3857'];
  defs['EPSG:102113'] = defs['EPSG:3857'];
}

var PJD_3PARAM = 1;
var PJD_7PARAM = 2;
var PJD_GRIDSHIFT = 3;
var PJD_WGS84 = 4; // WGS84 or equivalent
var PJD_NODATUM = 5; // WGS84 or equivalent
var SRS_WGS84_SEMIMAJOR = 6378137.0;  // only used in grid shift transforms
var SRS_WGS84_SEMIMINOR = 6356752.314;  // only used in grid shift transforms
var SRS_WGS84_ESQUARED = 0.0066943799901413165; // only used in grid shift transforms
var SEC_TO_RAD = 4.84813681109535993589914102357e-6;
var HALF_PI = Math.PI/2;
// ellipoid pj_set_ell.c
var SIXTH = 0.1666666666666666667;
/* 1/6 */
var RA4 = 0.04722222222222222222;
/* 17/360 */
var RA6 = 0.02215608465608465608;
var EPSLN = 1.0e-10;
// you'd think you could use Number.EPSILON above but that makes
// Mollweide get into an infinate loop.

var D2R$1 = 0.01745329251994329577;
var R2D = 57.29577951308232088;
var FORTPI = Math.PI/4;
var TWO_PI = Math.PI * 2;
// SPI is slightly greater than Math.PI, so values that exceed the -180..180
// degree range by a tiny amount don't get wrapped. This prevents points that
// have drifted from their original location along the 180th meridian (due to
// floating point error) from changing their sign.
var SPI = 3.14159265359;

var exports$2 = {};

exports$2.greenwich = 0.0; //"0dE",
exports$2.lisbon = -9.131906111111; //"9d07'54.862\"W",
exports$2.paris = 2.337229166667; //"2d20'14.025\"E",
exports$2.bogota = -74.080916666667; //"74d04'51.3\"W",
exports$2.madrid = -3.687938888889; //"3d41'16.58\"W",
exports$2.rome = 12.452333333333; //"12d27'8.4\"E",
exports$2.bern = 7.439583333333; //"7d26'22.5\"E",
exports$2.jakarta = 106.807719444444; //"106d48'27.79\"E",
exports$2.ferro = -17.666666666667; //"17d40'W",
exports$2.brussels = 4.367975; //"4d22'4.71\"E",
exports$2.stockholm = 18.058277777778; //"18d3'29.8\"E",
exports$2.athens = 23.7163375; //"23d42'58.815\"E",
exports$2.oslo = 10.722916666667; //"10d43'22.5\"E"

var units = {
  ft: {to_meter: 0.3048},
  'us-ft': {to_meter: 1200 / 3937}
};

var ignoredChar = /[\s_\-\/\(\)]/g;
function match(obj, key) {
  if (obj[key]) {
    return obj[key];
  }
  var keys = Object.keys(obj);
  var lkey = key.toLowerCase().replace(ignoredChar, '');
  var i = -1;
  var testkey, processedKey;
  while (++i < keys.length) {
    testkey = keys[i];
    processedKey = testkey.toLowerCase().replace(ignoredChar, '');
    if (processedKey === lkey) {
      return obj[testkey];
    }
  }
}

function projStr(defData) {
  var self = {};
  var paramObj = defData.split('+').map(function(v) {
    return v.trim();
  }).filter(function(a) {
    return a;
  }).reduce(function(p, a) {
    var split = a.split('=');
    split.push(true);
    p[split[0].toLowerCase()] = split[1];
    return p;
  }, {});
  var paramName, paramVal, paramOutname;
  var params = {
    proj: 'projName',
    datum: 'datumCode',
    rf: function(v) {
      self.rf = parseFloat(v);
    },
    lat_0: function(v) {
      self.lat0 = v * D2R$1;
    },
    lat_1: function(v) {
      self.lat1 = v * D2R$1;
    },
    lat_2: function(v) {
      self.lat2 = v * D2R$1;
    },
    lat_ts: function(v) {
      self.lat_ts = v * D2R$1;
    },
    lon_0: function(v) {
      self.long0 = v * D2R$1;
    },
    lon_1: function(v) {
      self.long1 = v * D2R$1;
    },
    lon_2: function(v) {
      self.long2 = v * D2R$1;
    },
    alpha: function(v) {
      self.alpha = parseFloat(v) * D2R$1;
    },
    gamma: function(v) {
      self.rectified_grid_angle = parseFloat(v);
    },
    lonc: function(v) {
      self.longc = v * D2R$1;
    },
    x_0: function(v) {
      self.x0 = parseFloat(v);
    },
    y_0: function(v) {
      self.y0 = parseFloat(v);
    },
    k_0: function(v) {
      self.k0 = parseFloat(v);
    },
    k: function(v) {
      self.k0 = parseFloat(v);
    },
    a: function(v) {
      self.a = parseFloat(v);
    },
    b: function(v) {
      self.b = parseFloat(v);
    },
    r_a: function() {
      self.R_A = true;
    },
    zone: function(v) {
      self.zone = parseInt(v, 10);
    },
    south: function() {
      self.utmSouth = true;
    },
    towgs84: function(v) {
      self.datum_params = v.split(",").map(function(a) {
        return parseFloat(a);
      });
    },
    to_meter: function(v) {
      self.to_meter = parseFloat(v);
    },
    units: function(v) {
      self.units = v;
      var unit = match(units, v);
      if (unit) {
        self.to_meter = unit.to_meter;
      }
    },
    from_greenwich: function(v) {
      self.from_greenwich = v * D2R$1;
    },
    pm: function(v) {
      var pm = match(exports$2, v);
      self.from_greenwich = (pm ? pm : parseFloat(v)) * D2R$1;
    },
    nadgrids: function(v) {
      if (v === '@null') {
        self.datumCode = 'none';
      }
      else {
        self.nadgrids = v;
      }
    },
    axis: function(v) {
      var legalAxis = "ewnsud";
      if (v.length === 3 && legalAxis.indexOf(v.substr(0, 1)) !== -1 && legalAxis.indexOf(v.substr(1, 1)) !== -1 && legalAxis.indexOf(v.substr(2, 1)) !== -1) {
        self.axis = v;
      }
    },
    approx: function() {
      self.approx = true;
    }
  };
  for (paramName in paramObj) {
    paramVal = paramObj[paramName];
    if (paramName in params) {
      paramOutname = params[paramName];
      if (typeof paramOutname === 'function') {
        paramOutname(paramVal);
      }
      else {
        self[paramOutname] = paramVal;
      }
    }
    else {
      self[paramName] = paramVal;
    }
  }
  if(typeof self.datumCode === 'string' && self.datumCode !== "WGS84"){
    self.datumCode = self.datumCode.toLowerCase();
  }
  return self;
}

var NEUTRAL = 1;
var KEYWORD = 2;
var NUMBER = 3;
var QUOTED = 4;
var AFTERQUOTE = 5;
var ENDED = -1;
var whitespace = /\s/;
var latin = /[A-Za-z]/;
var keyword = /[A-Za-z84_]/;
var endThings = /[,\]]/;
var digets = /[\d\.E\-\+]/;
// const ignoredChar = /[\s_\-\/\(\)]/g;
function Parser(text) {
  if (typeof text !== 'string') {
    throw new Error('not a string');
  }
  this.text = text.trim();
  this.level = 0;
  this.place = 0;
  this.root = null;
  this.stack = [];
  this.currentObject = null;
  this.state = NEUTRAL;
}
Parser.prototype.readCharicter = function() {
  var char = this.text[this.place++];
  if (this.state !== QUOTED) {
    while (whitespace.test(char)) {
      if (this.place >= this.text.length) {
        return;
      }
      char = this.text[this.place++];
    }
  }
  switch (this.state) {
    case NEUTRAL:
      return this.neutral(char);
    case KEYWORD:
      return this.keyword(char)
    case QUOTED:
      return this.quoted(char);
    case AFTERQUOTE:
      return this.afterquote(char);
    case NUMBER:
      return this.number(char);
    case ENDED:
      return;
  }
};
Parser.prototype.afterquote = function(char) {
  if (char === '"') {
    this.word += '"';
    this.state = QUOTED;
    return;
  }
  if (endThings.test(char)) {
    this.word = this.word.trim();
    this.afterItem(char);
    return;
  }
  throw new Error('havn\'t handled "' +char + '" in afterquote yet, index ' + this.place);
};
Parser.prototype.afterItem = function(char) {
  if (char === ',') {
    if (this.word !== null) {
      this.currentObject.push(this.word);
    }
    this.word = null;
    this.state = NEUTRAL;
    return;
  }
  if (char === ']') {
    this.level--;
    if (this.word !== null) {
      this.currentObject.push(this.word);
      this.word = null;
    }
    this.state = NEUTRAL;
    this.currentObject = this.stack.pop();
    if (!this.currentObject) {
      this.state = ENDED;
    }

    return;
  }
};
Parser.prototype.number = function(char) {
  if (digets.test(char)) {
    this.word += char;
    return;
  }
  if (endThings.test(char)) {
    this.word = parseFloat(this.word);
    this.afterItem(char);
    return;
  }
  throw new Error('havn\'t handled "' +char + '" in number yet, index ' + this.place);
};
Parser.prototype.quoted = function(char) {
  if (char === '"') {
    this.state = AFTERQUOTE;
    return;
  }
  this.word += char;
  return;
};
Parser.prototype.keyword = function(char) {
  if (keyword.test(char)) {
    this.word += char;
    return;
  }
  if (char === '[') {
    var newObjects = [];
    newObjects.push(this.word);
    this.level++;
    if (this.root === null) {
      this.root = newObjects;
    } else {
      this.currentObject.push(newObjects);
    }
    this.stack.push(this.currentObject);
    this.currentObject = newObjects;
    this.state = NEUTRAL;
    return;
  }
  if (endThings.test(char)) {
    this.afterItem(char);
    return;
  }
  throw new Error('havn\'t handled "' +char + '" in keyword yet, index ' + this.place);
};
Parser.prototype.neutral = function(char) {
  if (latin.test(char)) {
    this.word = char;
    this.state = KEYWORD;
    return;
  }
  if (char === '"') {
    this.word = '';
    this.state = QUOTED;
    return;
  }
  if (digets.test(char)) {
    this.word = char;
    this.state = NUMBER;
    return;
  }
  if (endThings.test(char)) {
    this.afterItem(char);
    return;
  }
  throw new Error('havn\'t handled "' +char + '" in neutral yet, index ' + this.place);
};
Parser.prototype.output = function() {
  while (this.place < this.text.length) {
    this.readCharicter();
  }
  if (this.state === ENDED) {
    return this.root;
  }
  throw new Error('unable to parse string "' +this.text + '". State is ' + this.state);
};

function parseString(txt) {
  var parser = new Parser(txt);
  return parser.output();
}

function mapit(obj, key, value) {
  if (Array.isArray(key)) {
    value.unshift(key);
    key = null;
  }
  var thing = key ? {} : obj;

  var out = value.reduce(function(newObj, item) {
    sExpr(item, newObj);
    return newObj
  }, thing);
  if (key) {
    obj[key] = out;
  }
}

function sExpr(v, obj) {
  if (!Array.isArray(v)) {
    obj[v] = true;
    return;
  }
  var key = v.shift();
  if (key === 'PARAMETER') {
    key = v.shift();
  }
  if (v.length === 1) {
    if (Array.isArray(v[0])) {
      obj[key] = {};
      sExpr(v[0], obj[key]);
      return;
    }
    obj[key] = v[0];
    return;
  }
  if (!v.length) {
    obj[key] = true;
    return;
  }
  if (key === 'TOWGS84') {
    obj[key] = v;
    return;
  }
  if (key === 'AXIS') {
    if (!(key in obj)) {
      obj[key] = [];
    }
    obj[key].push(v);
    return;
  }
  if (!Array.isArray(key)) {
    obj[key] = {};
  }

  var i;
  switch (key) {
    case 'UNIT':
    case 'PRIMEM':
    case 'VERT_DATUM':
      obj[key] = {
        name: v[0].toLowerCase(),
        convert: v[1]
      };
      if (v.length === 3) {
        sExpr(v[2], obj[key]);
      }
      return;
    case 'SPHEROID':
    case 'ELLIPSOID':
      obj[key] = {
        name: v[0],
        a: v[1],
        rf: v[2]
      };
      if (v.length === 4) {
        sExpr(v[3], obj[key]);
      }
      return;
    case 'PROJECTEDCRS':
    case 'PROJCRS':
    case 'GEOGCS':
    case 'GEOCCS':
    case 'PROJCS':
    case 'LOCAL_CS':
    case 'GEODCRS':
    case 'GEODETICCRS':
    case 'GEODETICDATUM':
    case 'EDATUM':
    case 'ENGINEERINGDATUM':
    case 'VERT_CS':
    case 'VERTCRS':
    case 'VERTICALCRS':
    case 'COMPD_CS':
    case 'COMPOUNDCRS':
    case 'ENGINEERINGCRS':
    case 'ENGCRS':
    case 'FITTED_CS':
    case 'LOCAL_DATUM':
    case 'DATUM':
      v[0] = ['name', v[0]];
      mapit(obj, key, v);
      return;
    default:
      i = -1;
      while (++i < v.length) {
        if (!Array.isArray(v[i])) {
          return sExpr(v, obj[key]);
        }
      }
      return mapit(obj, key, v);
  }
}

var D2R = 0.01745329251994329577;



function rename(obj, params) {
  var outName = params[0];
  var inName = params[1];
  if (!(outName in obj) && (inName in obj)) {
    obj[outName] = obj[inName];
    if (params.length === 3) {
      obj[outName] = params[2](obj[outName]);
    }
  }
}

function d2r(input) {
  return input * D2R;
}

function cleanWKT(wkt) {
  if (wkt.type === 'GEOGCS') {
    wkt.projName = 'longlat';
  } else if (wkt.type === 'LOCAL_CS') {
    wkt.projName = 'identity';
    wkt.local = true;
  } else {
    if (typeof wkt.PROJECTION === 'object') {
      wkt.projName = Object.keys(wkt.PROJECTION)[0];
    } else {
      wkt.projName = wkt.PROJECTION;
    }
  }
  if (wkt.AXIS) {
    var axisOrder = '';
    for (var i = 0, ii = wkt.AXIS.length; i < ii; ++i) {
      var axis = [wkt.AXIS[i][0].toLowerCase(), wkt.AXIS[i][1].toLowerCase()];
      if (axis[0].indexOf('north') !== -1 || ((axis[0] === 'y' || axis[0] === 'lat') && axis[1] === 'north')) {
        axisOrder += 'n';
      } else if (axis[0].indexOf('south') !== -1 || ((axis[0] === 'y' || axis[0] === 'lat') && axis[1] === 'south')) {
        axisOrder += 's';
      } else if (axis[0].indexOf('east') !== -1 || ((axis[0] === 'x' || axis[0] === 'lon') && axis[1] === 'east')) {
        axisOrder += 'e';
      } else if (axis[0].indexOf('west') !== -1 || ((axis[0] === 'x' || axis[0] === 'lon') && axis[1] === 'west')) {
        axisOrder += 'w';
      }
    }
    if (axisOrder.length === 2) {
      axisOrder += 'u';
    }
    if (axisOrder.length === 3) {
      wkt.axis = axisOrder;
    }
  }
  if (wkt.UNIT) {
    wkt.units = wkt.UNIT.name.toLowerCase();
    if (wkt.units === 'metre') {
      wkt.units = 'meter';
    }
    if (wkt.UNIT.convert) {
      if (wkt.type === 'GEOGCS') {
        if (wkt.DATUM && wkt.DATUM.SPHEROID) {
          wkt.to_meter = wkt.UNIT.convert*wkt.DATUM.SPHEROID.a;
        }
      } else {
        wkt.to_meter = wkt.UNIT.convert;
      }
    }
  }
  var geogcs = wkt.GEOGCS;
  if (wkt.type === 'GEOGCS') {
    geogcs = wkt;
  }
  if (geogcs) {
    //if(wkt.GEOGCS.PRIMEM&&wkt.GEOGCS.PRIMEM.convert){
    //  wkt.from_greenwich=wkt.GEOGCS.PRIMEM.convert*D2R;
    //}
    if (geogcs.DATUM) {
      wkt.datumCode = geogcs.DATUM.name.toLowerCase();
    } else {
      wkt.datumCode = geogcs.name.toLowerCase();
    }
    if (wkt.datumCode.slice(0, 2) === 'd_') {
      wkt.datumCode = wkt.datumCode.slice(2);
    }
    if (wkt.datumCode === 'new_zealand_geodetic_datum_1949' || wkt.datumCode === 'new_zealand_1949') {
      wkt.datumCode = 'nzgd49';
    }
    if (wkt.datumCode === 'wgs_1984' || wkt.datumCode === 'world_geodetic_system_1984') {
      if (wkt.PROJECTION === 'Mercator_Auxiliary_Sphere') {
        wkt.sphere = true;
      }
      wkt.datumCode = 'wgs84';
    }
    if (wkt.datumCode.slice(-6) === '_ferro') {
      wkt.datumCode = wkt.datumCode.slice(0, - 6);
    }
    if (wkt.datumCode.slice(-8) === '_jakarta') {
      wkt.datumCode = wkt.datumCode.slice(0, - 8);
    }
    if (~wkt.datumCode.indexOf('belge')) {
      wkt.datumCode = 'rnb72';
    }
    if (geogcs.DATUM && geogcs.DATUM.SPHEROID) {
      wkt.ellps = geogcs.DATUM.SPHEROID.name.replace('_19', '').replace(/[Cc]larke\_18/, 'clrk');
      if (wkt.ellps.toLowerCase().slice(0, 13) === 'international') {
        wkt.ellps = 'intl';
      }

      wkt.a = geogcs.DATUM.SPHEROID.a;
      wkt.rf = parseFloat(geogcs.DATUM.SPHEROID.rf, 10);
    }

    if (geogcs.DATUM && geogcs.DATUM.TOWGS84) {
      wkt.datum_params = geogcs.DATUM.TOWGS84;
    }
    if (~wkt.datumCode.indexOf('osgb_1936')) {
      wkt.datumCode = 'osgb36';
    }
    if (~wkt.datumCode.indexOf('osni_1952')) {
      wkt.datumCode = 'osni52';
    }
    if (~wkt.datumCode.indexOf('tm65')
      || ~wkt.datumCode.indexOf('geodetic_datum_of_1965')) {
      wkt.datumCode = 'ire65';
    }
    if (wkt.datumCode === 'ch1903+') {
      wkt.datumCode = 'ch1903';
    }
    if (~wkt.datumCode.indexOf('israel')) {
      wkt.datumCode = 'isr93';
    }
  }
  if (wkt.b && !isFinite(wkt.b)) {
    wkt.b = wkt.a;
  }

  function toMeter(input) {
    var ratio = wkt.to_meter || 1;
    return input * ratio;
  }
  var renamer = function(a) {
    return rename(wkt, a);
  };
  var list = [
    ['standard_parallel_1', 'Standard_Parallel_1'],
    ['standard_parallel_1', 'Latitude of 1st standard parallel'],
    ['standard_parallel_2', 'Standard_Parallel_2'],
    ['standard_parallel_2', 'Latitude of 2nd standard parallel'],
    ['false_easting', 'False_Easting'],
    ['false_easting', 'False easting'],
    ['false-easting', 'Easting at false origin'],
    ['false_northing', 'False_Northing'],
    ['false_northing', 'False northing'],
    ['false_northing', 'Northing at false origin'],
    ['central_meridian', 'Central_Meridian'],
    ['central_meridian', 'Longitude of natural origin'],
    ['central_meridian', 'Longitude of false origin'],
    ['latitude_of_origin', 'Latitude_Of_Origin'],
    ['latitude_of_origin', 'Central_Parallel'],
    ['latitude_of_origin', 'Latitude of natural origin'],
    ['latitude_of_origin', 'Latitude of false origin'],
    ['scale_factor', 'Scale_Factor'],
    ['k0', 'scale_factor'],
    ['latitude_of_center', 'Latitude_Of_Center'],
    ['latitude_of_center', 'Latitude_of_center'],
    ['lat0', 'latitude_of_center', d2r],
    ['longitude_of_center', 'Longitude_Of_Center'],
    ['longitude_of_center', 'Longitude_of_center'],
    ['longc', 'longitude_of_center', d2r],
    ['x0', 'false_easting', toMeter],
    ['y0', 'false_northing', toMeter],
    ['long0', 'central_meridian', d2r],
    ['lat0', 'latitude_of_origin', d2r],
    ['lat0', 'standard_parallel_1', d2r],
    ['lat1', 'standard_parallel_1', d2r],
    ['lat2', 'standard_parallel_2', d2r],
    ['azimuth', 'Azimuth'],
    ['alpha', 'azimuth', d2r],
    ['srsCode', 'name']
  ];
  list.forEach(renamer);
  if (!wkt.long0 && wkt.longc && (wkt.projName === 'Albers_Conic_Equal_Area' || wkt.projName === 'Lambert_Azimuthal_Equal_Area')) {
    wkt.long0 = wkt.longc;
  }
  if (!wkt.lat_ts && wkt.lat1 && (wkt.projName === 'Stereographic_South_Pole' || wkt.projName === 'Polar Stereographic (variant B)')) {
    wkt.lat0 = d2r(wkt.lat1 > 0 ? 90 : -90);
    wkt.lat_ts = wkt.lat1;
  }
}
function wkt(wkt) {
  var lisp = parseString(wkt);
  var type = lisp.shift();
  var name = lisp.shift();
  lisp.unshift(['name', name]);
  lisp.unshift(['type', type]);
  var obj = {};
  sExpr(lisp, obj);
  cleanWKT(obj);
  return obj;
}

function defs(name) {
  /*global console*/
  var that = this;
  if (arguments.length === 2) {
    var def = arguments[1];
    if (typeof def === 'string') {
      if (def.charAt(0) === '+') {
        defs[name] = projStr(arguments[1]);
      }
      else {
        defs[name] = wkt(arguments[1]);
      }
    } else {
      defs[name] = def;
    }
  }
  else if (arguments.length === 1) {
    if (Array.isArray(name)) {
      return name.map(function(v) {
        if (Array.isArray(v)) {
          defs.apply(that, v);
        }
        else {
          defs(v);
        }
      });
    }
    else if (typeof name === 'string') {
      if (name in defs) {
        return defs[name];
      }
    }
    else if ('EPSG' in name) {
      defs['EPSG:' + name.EPSG] = name;
    }
    else if ('ESRI' in name) {
      defs['ESRI:' + name.ESRI] = name;
    }
    else if ('IAU2000' in name) {
      defs['IAU2000:' + name.IAU2000] = name;
    }
    else {
      console.log(name);
    }
    return;
  }


}
globals(defs);

function testObj(code){
  return typeof code === 'string';
}
function testDef(code){
  return code in defs;
}
var codeWords = ['PROJECTEDCRS', 'PROJCRS', 'GEOGCS','GEOCCS','PROJCS','LOCAL_CS', 'GEODCRS', 'GEODETICCRS', 'GEODETICDATUM', 'ENGCRS', 'ENGINEERINGCRS'];
function testWKT(code){
  return codeWords.some(function (word) {
    return code.indexOf(word) > -1;
  });
}
var codes = ['3857', '900913', '3785', '102113'];
function checkMercator(item) {
  var auth = match(item, 'authority');
  if (!auth) {
    return;
  }
  var code = match(auth, 'epsg');
  return code && codes.indexOf(code) > -1;
}
function checkProjStr(item) {
  var ext = match(item, 'extension');
  if (!ext) {
    return;
  }
  return match(ext, 'proj4');
}
function testProj(code){
  return code[0] === '+';
}
function parse(code){
  if (testObj(code)) {
    //check to see if this is a WKT string
    if (testDef(code)) {
      return defs[code];
    }
    if (testWKT(code)) {
      var out = wkt(code);
      // test of spetial case, due to this being a very common and often malformed
      if (checkMercator(out)) {
        return defs['EPSG:3857'];
      }
      var maybeProjStr = checkProjStr(out);
      if (maybeProjStr) {
        return projStr(maybeProjStr);
      }
      return out;
    }
    if (testProj(code)) {
      return projStr(code);
    }
  }else {
    return code;
  }
}

function extend(destination, source) {
  destination = destination || {};
  var value, property;
  if (!source) {
    return destination;
  }
  for (property in source) {
    value = source[property];
    if (value !== undefined) {
      destination[property] = value;
    }
  }
  return destination;
}

function msfnz(eccent, sinphi, cosphi) {
  var con = eccent * sinphi;
  return cosphi / (Math.sqrt(1 - con * con));
}

function sign(x) {
  return x<0 ? -1 : 1;
}

function adjust_lon(x) {
  return (Math.abs(x) <= SPI) ? x : (x - (sign(x) * TWO_PI));
}

function tsfnz(eccent, phi, sinphi) {
  var con = eccent * sinphi;
  var com = 0.5 * eccent;
  con = Math.pow(((1 - con) / (1 + con)), com);
  return (Math.tan(0.5 * (HALF_PI - phi)) / con);
}

function phi2z(eccent, ts) {
  var eccnth = 0.5 * eccent;
  var con, dphi;
  var phi = HALF_PI - 2 * Math.atan(ts);
  for (var i = 0; i <= 15; i++) {
    con = eccent * Math.sin(phi);
    dphi = HALF_PI - 2 * Math.atan(ts * (Math.pow(((1 - con) / (1 + con)), eccnth))) - phi;
    phi += dphi;
    if (Math.abs(dphi) <= 0.0000000001) {
      return phi;
    }
  }
  //console.log("phi2z has NoConvergence");
  return -9999;
}

function init$v() {
  var con = this.b / this.a;
  this.es = 1 - con * con;
  if(!('x0' in this)){
    this.x0 = 0;
  }
  if(!('y0' in this)){
    this.y0 = 0;
  }
  this.e = Math.sqrt(this.es);
  if (this.lat_ts) {
    if (this.sphere) {
      this.k0 = Math.cos(this.lat_ts);
    }
    else {
      this.k0 = msfnz(this.e, Math.sin(this.lat_ts), Math.cos(this.lat_ts));
    }
  }
  else {
    if (!this.k0) {
      if (this.k) {
        this.k0 = this.k;
      }
      else {
        this.k0 = 1;
      }
    }
  }
}

/* Mercator forward equations--mapping lat,long to x,y
  --------------------------------------------------*/

function forward$u(p) {
  var lon = p.x;
  var lat = p.y;
  // convert to radians
  if (lat * R2D > 90 && lat * R2D < -90 && lon * R2D > 180 && lon * R2D < -180) {
    return null;
  }

  var x, y;
  if (Math.abs(Math.abs(lat) - HALF_PI) <= EPSLN) {
    return null;
  }
  else {
    if (this.sphere) {
      x = this.x0 + this.a * this.k0 * adjust_lon(lon - this.long0);
      y = this.y0 + this.a * this.k0 * Math.log(Math.tan(FORTPI + 0.5 * lat));
    }
    else {
      var sinphi = Math.sin(lat);
      var ts = tsfnz(this.e, lat, sinphi);
      x = this.x0 + this.a * this.k0 * adjust_lon(lon - this.long0);
      y = this.y0 - this.a * this.k0 * Math.log(ts);
    }
    p.x = x;
    p.y = y;
    return p;
  }
}

/* Mercator inverse equations--mapping x,y to lat/long
  --------------------------------------------------*/
function inverse$u(p) {

  var x = p.x - this.x0;
  var y = p.y - this.y0;
  var lon, lat;

  if (this.sphere) {
    lat = HALF_PI - 2 * Math.atan(Math.exp(-y / (this.a * this.k0)));
  }
  else {
    var ts = Math.exp(-y / (this.a * this.k0));
    lat = phi2z(this.e, ts);
    if (lat === -9999) {
      return null;
    }
  }
  lon = adjust_lon(this.long0 + x / (this.a * this.k0));

  p.x = lon;
  p.y = lat;
  return p;
}

var names$w = ["Mercator", "Popular Visualisation Pseudo Mercator", "Mercator_1SP", "Mercator_Auxiliary_Sphere", "merc"];
var merc = {
  init: init$v,
  forward: forward$u,
  inverse: inverse$u,
  names: names$w
};

function init$u() {
  //no-op for longlat
}

function identity(pt) {
  return pt;
}
var names$v = ["longlat", "identity"];
var longlat = {
  init: init$u,
  forward: identity,
  inverse: identity,
  names: names$v
};

var projs = [merc, longlat];
var names$u = {};
var projStore = [];

function add(proj, i) {
  var len = projStore.length;
  if (!proj.names) {
    console.log(i);
    return true;
  }
  projStore[len] = proj;
  proj.names.forEach(function(n) {
    names$u[n.toLowerCase()] = len;
  });
  return this;
}

function get(name) {
  if (!name) {
    return false;
  }
  var n = name.toLowerCase();
  if (typeof names$u[n] !== 'undefined' && projStore[names$u[n]]) {
    return projStore[names$u[n]];
  }
}

function start() {
  projs.forEach(add);
}
var projections = {
  start: start,
  add: add,
  get: get
};

var exports$1 = {};
exports$1.MERIT = {
  a: 6378137.0,
  rf: 298.257,
  ellipseName: "MERIT 1983"
};

exports$1.SGS85 = {
  a: 6378136.0,
  rf: 298.257,
  ellipseName: "Soviet Geodetic System 85"
};

exports$1.GRS80 = {
  a: 6378137.0,
  rf: 298.257222101,
  ellipseName: "GRS 1980(IUGG, 1980)"
};

exports$1.IAU76 = {
  a: 6378140.0,
  rf: 298.257,
  ellipseName: "IAU 1976"
};

exports$1.airy = {
  a: 6377563.396,
  b: 6356256.910,
  ellipseName: "Airy 1830"
};

exports$1.APL4 = {
  a: 6378137,
  rf: 298.25,
  ellipseName: "Appl. Physics. 1965"
};

exports$1.NWL9D = {
  a: 6378145.0,
  rf: 298.25,
  ellipseName: "Naval Weapons Lab., 1965"
};

exports$1.mod_airy = {
  a: 6377340.189,
  b: 6356034.446,
  ellipseName: "Modified Airy"
};

exports$1.andrae = {
  a: 6377104.43,
  rf: 300.0,
  ellipseName: "Andrae 1876 (Den., Iclnd.)"
};

exports$1.aust_SA = {
  a: 6378160.0,
  rf: 298.25,
  ellipseName: "Australian Natl & S. Amer. 1969"
};

exports$1.GRS67 = {
  a: 6378160.0,
  rf: 298.2471674270,
  ellipseName: "GRS 67(IUGG 1967)"
};

exports$1.bessel = {
  a: 6377397.155,
  rf: 299.1528128,
  ellipseName: "Bessel 1841"
};

exports$1.bess_nam = {
  a: 6377483.865,
  rf: 299.1528128,
  ellipseName: "Bessel 1841 (Namibia)"
};

exports$1.clrk66 = {
  a: 6378206.4,
  b: 6356583.8,
  ellipseName: "Clarke 1866"
};

exports$1.clrk80 = {
  a: 6378249.145,
  rf: 293.4663,
  ellipseName: "Clarke 1880 mod."
};

exports$1.clrk58 = {
  a: 6378293.645208759,
  rf: 294.2606763692654,
  ellipseName: "Clarke 1858"
};

exports$1.CPM = {
  a: 6375738.7,
  rf: 334.29,
  ellipseName: "Comm. des Poids et Mesures 1799"
};

exports$1.delmbr = {
  a: 6376428.0,
  rf: 311.5,
  ellipseName: "Delambre 1810 (Belgium)"
};

exports$1.engelis = {
  a: 6378136.05,
  rf: 298.2566,
  ellipseName: "Engelis 1985"
};

exports$1.evrst30 = {
  a: 6377276.345,
  rf: 300.8017,
  ellipseName: "Everest 1830"
};

exports$1.evrst48 = {
  a: 6377304.063,
  rf: 300.8017,
  ellipseName: "Everest 1948"
};

exports$1.evrst56 = {
  a: 6377301.243,
  rf: 300.8017,
  ellipseName: "Everest 1956"
};

exports$1.evrst69 = {
  a: 6377295.664,
  rf: 300.8017,
  ellipseName: "Everest 1969"
};

exports$1.evrstSS = {
  a: 6377298.556,
  rf: 300.8017,
  ellipseName: "Everest (Sabah & Sarawak)"
};

exports$1.fschr60 = {
  a: 6378166.0,
  rf: 298.3,
  ellipseName: "Fischer (Mercury Datum) 1960"
};

exports$1.fschr60m = {
  a: 6378155.0,
  rf: 298.3,
  ellipseName: "Fischer 1960"
};

exports$1.fschr68 = {
  a: 6378150.0,
  rf: 298.3,
  ellipseName: "Fischer 1968"
};

exports$1.helmert = {
  a: 6378200.0,
  rf: 298.3,
  ellipseName: "Helmert 1906"
};

exports$1.hough = {
  a: 6378270.0,
  rf: 297.0,
  ellipseName: "Hough"
};

exports$1.intl = {
  a: 6378388.0,
  rf: 297.0,
  ellipseName: "International 1909 (Hayford)"
};

exports$1.kaula = {
  a: 6378163.0,
  rf: 298.24,
  ellipseName: "Kaula 1961"
};

exports$1.lerch = {
  a: 6378139.0,
  rf: 298.257,
  ellipseName: "Lerch 1979"
};

exports$1.mprts = {
  a: 6397300.0,
  rf: 191.0,
  ellipseName: "Maupertius 1738"
};

exports$1.new_intl = {
  a: 6378157.5,
  b: 6356772.2,
  ellipseName: "New International 1967"
};

exports$1.plessis = {
  a: 6376523.0,
  rf: 6355863.0,
  ellipseName: "Plessis 1817 (France)"
};

exports$1.krass = {
  a: 6378245.0,
  rf: 298.3,
  ellipseName: "Krassovsky, 1942"
};

exports$1.SEasia = {
  a: 6378155.0,
  b: 6356773.3205,
  ellipseName: "Southeast Asia"
};

exports$1.walbeck = {
  a: 6376896.0,
  b: 6355834.8467,
  ellipseName: "Walbeck"
};

exports$1.WGS60 = {
  a: 6378165.0,
  rf: 298.3,
  ellipseName: "WGS 60"
};

exports$1.WGS66 = {
  a: 6378145.0,
  rf: 298.25,
  ellipseName: "WGS 66"
};

exports$1.WGS7 = {
  a: 6378135.0,
  rf: 298.26,
  ellipseName: "WGS 72"
};

var WGS84 = exports$1.WGS84 = {
  a: 6378137.0,
  rf: 298.257223563,
  ellipseName: "WGS 84"
};

exports$1.sphere = {
  a: 6370997.0,
  b: 6370997.0,
  ellipseName: "Normal Sphere (r=6370997)"
};

function eccentricity(a, b, rf, R_A) {
  var a2 = a * a; // used in geocentric
  var b2 = b * b; // used in geocentric
  var es = (a2 - b2) / a2; // e ^ 2
  var e = 0;
  if (R_A) {
    a *= 1 - es * (SIXTH + es * (RA4 + es * RA6));
    a2 = a * a;
    es = 0;
  } else {
    e = Math.sqrt(es); // eccentricity
  }
  var ep2 = (a2 - b2) / b2; // used in geocentric
  return {
    es: es,
    e: e,
    ep2: ep2
  };
}
function sphere(a, b, rf, ellps, sphere) {
  if (!a) { // do we have an ellipsoid?
    var ellipse = match(exports$1, ellps);
    if (!ellipse) {
      ellipse = WGS84;
    }
    a = ellipse.a;
    b = ellipse.b;
    rf = ellipse.rf;
  }

  if (rf && !b) {
    b = (1.0 - 1.0 / rf) * a;
  }
  if (rf === 0 || Math.abs(a - b) < EPSLN) {
    sphere = true;
    b = a;
  }
  return {
    a: a,
    b: b,
    rf: rf,
    sphere: sphere
  };
}

var exports = {};
exports.wgs84 = {
  towgs84: "0,0,0",
  ellipse: "WGS84",
  datumName: "WGS84"
};

exports.ch1903 = {
  towgs84: "674.374,15.056,405.346",
  ellipse: "bessel",
  datumName: "swiss"
};

exports.ggrs87 = {
  towgs84: "-199.87,74.79,246.62",
  ellipse: "GRS80",
  datumName: "Greek_Geodetic_Reference_System_1987"
};

exports.nad83 = {
  towgs84: "0,0,0",
  ellipse: "GRS80",
  datumName: "North_American_Datum_1983"
};

exports.nad27 = {
  nadgrids: "@conus,@alaska,@ntv2_0.gsb,@ntv1_can.dat",
  ellipse: "clrk66",
  datumName: "North_American_Datum_1927"
};

exports.potsdam = {
  towgs84: "598.1,73.7,418.2,0.202,0.045,-2.455,6.7",
  ellipse: "bessel",
  datumName: "Potsdam Rauenberg 1950 DHDN"
};

exports.carthage = {
  towgs84: "-263.0,6.0,431.0",
  ellipse: "clark80",
  datumName: "Carthage 1934 Tunisia"
};

exports.hermannskogel = {
  towgs84: "577.326,90.129,463.919,5.137,1.474,5.297,2.4232",
  ellipse: "bessel",
  datumName: "Hermannskogel"
};

exports.osni52 = {
  towgs84: "482.530,-130.596,564.557,-1.042,-0.214,-0.631,8.15",
  ellipse: "airy",
  datumName: "Irish National"
};

exports.ire65 = {
  towgs84: "482.530,-130.596,564.557,-1.042,-0.214,-0.631,8.15",
  ellipse: "mod_airy",
  datumName: "Ireland 1965"
};

exports.rassadiran = {
  towgs84: "-133.63,-157.5,-158.62",
  ellipse: "intl",
  datumName: "Rassadiran"
};

exports.nzgd49 = {
  towgs84: "59.47,-5.04,187.44,0.47,-0.1,1.024,-4.5993",
  ellipse: "intl",
  datumName: "New Zealand Geodetic Datum 1949"
};

exports.osgb36 = {
  towgs84: "446.448,-125.157,542.060,0.1502,0.2470,0.8421,-20.4894",
  ellipse: "airy",
  datumName: "Airy 1830"
};

exports.s_jtsk = {
  towgs84: "589,76,480",
  ellipse: 'bessel',
  datumName: 'S-JTSK (Ferro)'
};

exports.beduaram = {
  towgs84: '-106,-87,188',
  ellipse: 'clrk80',
  datumName: 'Beduaram'
};

exports.gunung_segara = {
  towgs84: '-403,684,41',
  ellipse: 'bessel',
  datumName: 'Gunung Segara Jakarta'
};

exports.rnb72 = {
  towgs84: "106.869,-52.2978,103.724,-0.33657,0.456955,-1.84218,1",
  ellipse: "intl",
  datumName: "Reseau National Belge 1972"
};

function datum(datumCode, datum_params, a, b, es, ep2, nadgrids) {
  var out = {};

  if (datumCode === undefined || datumCode === 'none') {
    out.datum_type = PJD_NODATUM;
  } else {
    out.datum_type = PJD_WGS84;
  }

  if (datum_params) {
    out.datum_params = datum_params.map(parseFloat);
    if (out.datum_params[0] !== 0 || out.datum_params[1] !== 0 || out.datum_params[2] !== 0) {
      out.datum_type = PJD_3PARAM;
    }
    if (out.datum_params.length > 3) {
      if (out.datum_params[3] !== 0 || out.datum_params[4] !== 0 || out.datum_params[5] !== 0 || out.datum_params[6] !== 0) {
        out.datum_type = PJD_7PARAM;
        out.datum_params[3] *= SEC_TO_RAD;
        out.datum_params[4] *= SEC_TO_RAD;
        out.datum_params[5] *= SEC_TO_RAD;
        out.datum_params[6] = (out.datum_params[6] / 1000000.0) + 1.0;
      }
    }
  }

  if (nadgrids) {
    out.datum_type = PJD_GRIDSHIFT;
    out.grids = nadgrids;
  }
  out.a = a; //datum object also uses these values
  out.b = b;
  out.es = es;
  out.ep2 = ep2;
  return out;
}

/**
 * Resources for details of NTv2 file formats:
 * - https://web.archive.org/web/20140127204822if_/http://www.mgs.gov.on.ca:80/stdprodconsume/groups/content/@mgs/@iandit/documents/resourcelist/stel02_047447.pdf
 * - http://mimaka.com/help/gs/html/004_NTV2%20Data%20Format.htm
 */

var loadedNadgrids = {};

/**
 * Load a binary NTv2 file (.gsb) to a key that can be used in a proj string like +nadgrids=<key>. Pass the NTv2 file
 * as an ArrayBuffer.
 */
function nadgrid(key, data) {
  var view = new DataView(data);
  var isLittleEndian = detectLittleEndian(view);
  var header = readHeader(view, isLittleEndian);
  if (header.nSubgrids > 1) {
    console.log('Only single NTv2 subgrids are currently supported, subsequent sub grids are ignored');
  }
  var subgrids = readSubgrids(view, header, isLittleEndian);
  var nadgrid = {header: header, subgrids: subgrids};
  loadedNadgrids[key] = nadgrid;
  return nadgrid;
}

/**
 * Given a proj4 value for nadgrids, return an array of loaded grids
 */
function getNadgrids(nadgrids) {
  // Format details: http://proj.maptools.org/gen_parms.html
  if (nadgrids === undefined) { return null; }
  var grids = nadgrids.split(',');
  return grids.map(parseNadgridString);
}

function parseNadgridString(value) {
  if (value.length === 0) {
    return null;
  }
  var optional = value[0] === '@';
  if (optional) {
    value = value.slice(1);
  }
  if (value === 'null') {
    return {name: 'null', mandatory: !optional, grid: null, isNull: true};
  }
  return {
    name: value,
    mandatory: !optional,
    grid: loadedNadgrids[value] || null,
    isNull: false
  };
}

function secondsToRadians(seconds) {
  return (seconds / 3600) * Math.PI / 180;
}

function detectLittleEndian(view) {
  var nFields = view.getInt32(8, false);
  if (nFields === 11) {
    return false;
  }
  nFields = view.getInt32(8, true);
  if (nFields !== 11) {
    console.warn('Failed to detect nadgrid endian-ness, defaulting to little-endian');
  }
  return true;
}

function readHeader(view, isLittleEndian) {
  return {
    nFields: view.getInt32(8, isLittleEndian),
    nSubgridFields: view.getInt32(24, isLittleEndian),
    nSubgrids: view.getInt32(40, isLittleEndian),
    shiftType: decodeString(view, 56, 56 + 8).trim(),
    fromSemiMajorAxis: view.getFloat64(120, isLittleEndian),
    fromSemiMinorAxis: view.getFloat64(136, isLittleEndian),
    toSemiMajorAxis: view.getFloat64(152, isLittleEndian),
    toSemiMinorAxis: view.getFloat64(168, isLittleEndian),
  };
}

function decodeString(view, start, end) {
  return String.fromCharCode.apply(null, new Uint8Array(view.buffer.slice(start, end)));
}

function readSubgrids(view, header, isLittleEndian) {
  var gridOffset = 176;
  var grids = [];
  for (var i = 0; i < header.nSubgrids; i++) {
    var subHeader = readGridHeader(view, gridOffset, isLittleEndian);
    var nodes = readGridNodes(view, gridOffset, subHeader, isLittleEndian);
    var lngColumnCount = Math.round(
      1 + (subHeader.upperLongitude - subHeader.lowerLongitude) / subHeader.longitudeInterval);
    var latColumnCount = Math.round(
      1 + (subHeader.upperLatitude - subHeader.lowerLatitude) / subHeader.latitudeInterval);
    // Proj4 operates on radians whereas the coordinates are in seconds in the grid
    grids.push({
      ll: [secondsToRadians(subHeader.lowerLongitude), secondsToRadians(subHeader.lowerLatitude)],
      del: [secondsToRadians(subHeader.longitudeInterval), secondsToRadians(subHeader.latitudeInterval)],
      lim: [lngColumnCount, latColumnCount],
      count: subHeader.gridNodeCount,
      cvs: mapNodes(nodes)
    });
  }
  return grids;
}

function mapNodes(nodes) {
  return nodes.map(function (r) {return [secondsToRadians(r.longitudeShift), secondsToRadians(r.latitudeShift)];});
}

function readGridHeader(view, offset, isLittleEndian) {
  return {
    name: decodeString(view, offset + 8, offset + 16).trim(),
    parent: decodeString(view, offset + 24, offset + 24 + 8).trim(),
    lowerLatitude: view.getFloat64(offset + 72, isLittleEndian),
    upperLatitude: view.getFloat64(offset + 88, isLittleEndian),
    lowerLongitude: view.getFloat64(offset + 104, isLittleEndian),
    upperLongitude: view.getFloat64(offset + 120, isLittleEndian),
    latitudeInterval: view.getFloat64(offset + 136, isLittleEndian),
    longitudeInterval: view.getFloat64(offset + 152, isLittleEndian),
    gridNodeCount: view.getInt32(offset + 168, isLittleEndian)
  };
}

function readGridNodes(view, offset, gridHeader, isLittleEndian) {
  var nodesOffset = offset + 176;
  var gridRecordLength = 16;
  var gridShiftRecords = [];
  for (var i = 0; i < gridHeader.gridNodeCount; i++) {
    var record = {
      latitudeShift: view.getFloat32(nodesOffset + i * gridRecordLength, isLittleEndian),
      longitudeShift: view.getFloat32(nodesOffset + i * gridRecordLength + 4, isLittleEndian),
      latitudeAccuracy: view.getFloat32(nodesOffset + i * gridRecordLength + 8, isLittleEndian),
      longitudeAccuracy: view.getFloat32(nodesOffset + i * gridRecordLength + 12, isLittleEndian),
    };
    gridShiftRecords.push(record);
  }
  return gridShiftRecords;
}

function Projection(srsCode,callback) {
  if (!(this instanceof Projection)) {
    return new Projection(srsCode);
  }
  callback = callback || function(error){
    if(error){
      throw error;
    }
  };
  var json = parse(srsCode);
  if(typeof json !== 'object'){
    callback(srsCode);
    return;
  }
  var ourProj = Projection.projections.get(json.projName);
  if(!ourProj){
    callback(srsCode);
    return;
  }
  if (json.datumCode && json.datumCode !== 'none') {
    var datumDef = match(exports, json.datumCode);
    if (datumDef) {
      json.datum_params = json.datum_params || (datumDef.towgs84 ? datumDef.towgs84.split(',') : null);
      json.ellps = datumDef.ellipse;
      json.datumName = datumDef.datumName ? datumDef.datumName : json.datumCode;
    }
  }
  json.k0 = json.k0 || 1.0;
  json.axis = json.axis || 'enu';
  json.ellps = json.ellps || 'wgs84';
  json.lat1 = json.lat1 || json.lat0; // Lambert_Conformal_Conic_1SP, for example, needs this

  var sphere_ = sphere(json.a, json.b, json.rf, json.ellps, json.sphere);
  var ecc = eccentricity(sphere_.a, sphere_.b, sphere_.rf, json.R_A);
  var nadgrids = getNadgrids(json.nadgrids);
  var datumObj = json.datum || datum(json.datumCode, json.datum_params, sphere_.a, sphere_.b, ecc.es, ecc.ep2,
    nadgrids);

  extend(this, json); // transfer everything over from the projection because we don't know what we'll need
  extend(this, ourProj); // transfer all the methods from the projection

  // copy the 4 things over we calculated in deriveConstants.sphere
  this.a = sphere_.a;
  this.b = sphere_.b;
  this.rf = sphere_.rf;
  this.sphere = sphere_.sphere;

  // copy the 3 things we calculated in deriveConstants.eccentricity
  this.es = ecc.es;
  this.e = ecc.e;
  this.ep2 = ecc.ep2;

  // add in the datum object
  this.datum = datumObj;

  // init the projection
  this.init();

  // legecy callback from back in the day when it went to spatialreference.org
  callback(null, this);

}
Projection.projections = projections;
Projection.projections.start();

function compareDatums(source, dest) {
  if (source.datum_type !== dest.datum_type) {
    return false; // false, datums are not equal
  } else if (source.a !== dest.a || Math.abs(source.es - dest.es) > 0.000000000050) {
    // the tolerance for es is to ensure that GRS80 and WGS84
    // are considered identical
    return false;
  } else if (source.datum_type === PJD_3PARAM) {
    return (source.datum_params[0] === dest.datum_params[0] && source.datum_params[1] === dest.datum_params[1] && source.datum_params[2] === dest.datum_params[2]);
  } else if (source.datum_type === PJD_7PARAM) {
    return (source.datum_params[0] === dest.datum_params[0] && source.datum_params[1] === dest.datum_params[1] && source.datum_params[2] === dest.datum_params[2] && source.datum_params[3] === dest.datum_params[3] && source.datum_params[4] === dest.datum_params[4] && source.datum_params[5] === dest.datum_params[5] && source.datum_params[6] === dest.datum_params[6]);
  } else {
    return true; // datums are equal
  }
} // cs_compare_datums()

/*
 * The function Convert_Geodetic_To_Geocentric converts geodetic coordinates
 * (latitude, longitude, and height) to geocentric coordinates (X, Y, Z),
 * according to the current ellipsoid parameters.
 *
 *    Latitude  : Geodetic latitude in radians                     (input)
 *    Longitude : Geodetic longitude in radians                    (input)
 *    Height    : Geodetic height, in meters                       (input)
 *    X         : Calculated Geocentric X coordinate, in meters    (output)
 *    Y         : Calculated Geocentric Y coordinate, in meters    (output)
 *    Z         : Calculated Geocentric Z coordinate, in meters    (output)
 *
 */
function geodeticToGeocentric(p, es, a) {
  var Longitude = p.x;
  var Latitude = p.y;
  var Height = p.z ? p.z : 0; //Z value not always supplied

  var Rn; /*  Earth radius at location  */
  var Sin_Lat; /*  Math.sin(Latitude)  */
  var Sin2_Lat; /*  Square of Math.sin(Latitude)  */
  var Cos_Lat; /*  Math.cos(Latitude)  */

  /*
   ** Don't blow up if Latitude is just a little out of the value
   ** range as it may just be a rounding issue.  Also removed longitude
   ** test, it should be wrapped by Math.cos() and Math.sin().  NFW for PROJ.4, Sep/2001.
   */
  if (Latitude < -HALF_PI && Latitude > -1.001 * HALF_PI) {
    Latitude = -HALF_PI;
  } else if (Latitude > HALF_PI && Latitude < 1.001 * HALF_PI) {
    Latitude = HALF_PI;
  } else if (Latitude < -HALF_PI) {
    /* Latitude out of range */
    //..reportError('geocent:lat out of range:' + Latitude);
    return { x: -Infinity, y: -Infinity, z: p.z };
  } else if (Latitude > HALF_PI) {
    /* Latitude out of range */
    return { x: Infinity, y: Infinity, z: p.z };
  }

  if (Longitude > Math.PI) {
    Longitude -= (2 * Math.PI);
  }
  Sin_Lat = Math.sin(Latitude);
  Cos_Lat = Math.cos(Latitude);
  Sin2_Lat = Sin_Lat * Sin_Lat;
  Rn = a / (Math.sqrt(1.0e0 - es * Sin2_Lat));
  return {
    x: (Rn + Height) * Cos_Lat * Math.cos(Longitude),
    y: (Rn + Height) * Cos_Lat * Math.sin(Longitude),
    z: ((Rn * (1 - es)) + Height) * Sin_Lat
  };
} // cs_geodetic_to_geocentric()

function geocentricToGeodetic(p, es, a, b) {
  /* local defintions and variables */
  /* end-criterium of loop, accuracy of sin(Latitude) */
  var genau = 1e-12;
  var genau2 = (genau * genau);
  var maxiter = 30;

  var P; /* distance between semi-minor axis and location */
  var RR; /* distance between center and location */
  var CT; /* sin of geocentric latitude */
  var ST; /* cos of geocentric latitude */
  var RX;
  var RK;
  var RN; /* Earth radius at location */
  var CPHI0; /* cos of start or old geodetic latitude in iterations */
  var SPHI0; /* sin of start or old geodetic latitude in iterations */
  var CPHI; /* cos of searched geodetic latitude */
  var SPHI; /* sin of searched geodetic latitude */
  var SDPHI; /* end-criterium: addition-theorem of sin(Latitude(iter)-Latitude(iter-1)) */
  var iter; /* # of continous iteration, max. 30 is always enough (s.a.) */

  var X = p.x;
  var Y = p.y;
  var Z = p.z ? p.z : 0.0; //Z value not always supplied
  var Longitude;
  var Latitude;
  var Height;

  P = Math.sqrt(X * X + Y * Y);
  RR = Math.sqrt(X * X + Y * Y + Z * Z);

  /*      special cases for latitude and longitude */
  if (P / a < genau) {

    /*  special case, if P=0. (X=0., Y=0.) */
    Longitude = 0.0;

    /*  if (X,Y,Z)=(0.,0.,0.) then Height becomes semi-minor axis
     *  of ellipsoid (=center of mass), Latitude becomes PI/2 */
    if (RR / a < genau) {
      Latitude = HALF_PI;
      Height = -b;
      return {
        x: p.x,
        y: p.y,
        z: p.z
      };
    }
  } else {
    /*  ellipsoidal (geodetic) longitude
     *  interval: -PI < Longitude <= +PI */
    Longitude = Math.atan2(Y, X);
  }

  /* --------------------------------------------------------------
   * Following iterative algorithm was developped by
   * "Institut for Erdmessung", University of Hannover, July 1988.
   * Internet: www.ife.uni-hannover.de
   * Iterative computation of CPHI,SPHI and Height.
   * Iteration of CPHI and SPHI to 10**-12 radian resp.
   * 2*10**-7 arcsec.
   * --------------------------------------------------------------
   */
  CT = Z / RR;
  ST = P / RR;
  RX = 1.0 / Math.sqrt(1.0 - es * (2.0 - es) * ST * ST);
  CPHI0 = ST * (1.0 - es) * RX;
  SPHI0 = CT * RX;
  iter = 0;

  /* loop to find sin(Latitude) resp. Latitude
   * until |sin(Latitude(iter)-Latitude(iter-1))| < genau */
  do {
    iter++;
    RN = a / Math.sqrt(1.0 - es * SPHI0 * SPHI0);

    /*  ellipsoidal (geodetic) height */
    Height = P * CPHI0 + Z * SPHI0 - RN * (1.0 - es * SPHI0 * SPHI0);

    RK = es * RN / (RN + Height);
    RX = 1.0 / Math.sqrt(1.0 - RK * (2.0 - RK) * ST * ST);
    CPHI = ST * (1.0 - RK) * RX;
    SPHI = CT * RX;
    SDPHI = SPHI * CPHI0 - CPHI * SPHI0;
    CPHI0 = CPHI;
    SPHI0 = SPHI;
  }
  while (SDPHI * SDPHI > genau2 && iter < maxiter);

  /*      ellipsoidal (geodetic) latitude */
  Latitude = Math.atan(SPHI / Math.abs(CPHI));
  return {
    x: Longitude,
    y: Latitude,
    z: Height
  };
} // cs_geocentric_to_geodetic()

/****************************************************************/
// pj_geocentic_to_wgs84( p )
//  p = point to transform in geocentric coordinates (x,y,z)


/** point object, nothing fancy, just allows values to be
    passed back and forth by reference rather than by value.
    Other point classes may be used as long as they have
    x and y properties, which will get modified in the transform method.
*/
function geocentricToWgs84(p, datum_type, datum_params) {

  if (datum_type === PJD_3PARAM) {
    // if( x[io] === HUGE_VAL )
    //    continue;
    return {
      x: p.x + datum_params[0],
      y: p.y + datum_params[1],
      z: p.z + datum_params[2],
    };
  } else if (datum_type === PJD_7PARAM) {
    var Dx_BF = datum_params[0];
    var Dy_BF = datum_params[1];
    var Dz_BF = datum_params[2];
    var Rx_BF = datum_params[3];
    var Ry_BF = datum_params[4];
    var Rz_BF = datum_params[5];
    var M_BF = datum_params[6];
    // if( x[io] === HUGE_VAL )
    //    continue;
    return {
      x: M_BF * (p.x - Rz_BF * p.y + Ry_BF * p.z) + Dx_BF,
      y: M_BF * (Rz_BF * p.x + p.y - Rx_BF * p.z) + Dy_BF,
      z: M_BF * (-Ry_BF * p.x + Rx_BF * p.y + p.z) + Dz_BF
    };
  }
} // cs_geocentric_to_wgs84

/****************************************************************/
// pj_geocentic_from_wgs84()
//  coordinate system definition,
//  point to transform in geocentric coordinates (x,y,z)
function geocentricFromWgs84(p, datum_type, datum_params) {

  if (datum_type === PJD_3PARAM) {
    //if( x[io] === HUGE_VAL )
    //    continue;
    return {
      x: p.x - datum_params[0],
      y: p.y - datum_params[1],
      z: p.z - datum_params[2],
    };

  } else if (datum_type === PJD_7PARAM) {
    var Dx_BF = datum_params[0];
    var Dy_BF = datum_params[1];
    var Dz_BF = datum_params[2];
    var Rx_BF = datum_params[3];
    var Ry_BF = datum_params[4];
    var Rz_BF = datum_params[5];
    var M_BF = datum_params[6];
    var x_tmp = (p.x - Dx_BF) / M_BF;
    var y_tmp = (p.y - Dy_BF) / M_BF;
    var z_tmp = (p.z - Dz_BF) / M_BF;
    //if( x[io] === HUGE_VAL )
    //    continue;

    return {
      x: x_tmp + Rz_BF * y_tmp - Ry_BF * z_tmp,
      y: -Rz_BF * x_tmp + y_tmp + Rx_BF * z_tmp,
      z: Ry_BF * x_tmp - Rx_BF * y_tmp + z_tmp
    };
  } //cs_geocentric_from_wgs84()
}

function checkParams(type) {
  return (type === PJD_3PARAM || type === PJD_7PARAM);
}

function datum_transform(source, dest, point) {
  // Short cut if the datums are identical.
  if (compareDatums(source, dest)) {
    return point; // in this case, zero is sucess,
    // whereas cs_compare_datums returns 1 to indicate TRUE
    // confusing, should fix this
  }

  // Explicitly skip datum transform by setting 'datum=none' as parameter for either source or dest
  if (source.datum_type === PJD_NODATUM || dest.datum_type === PJD_NODATUM) {
    return point;
  }

  // If this datum requires grid shifts, then apply it to geodetic coordinates.
  var source_a = source.a;
  var source_es = source.es;
  if (source.datum_type === PJD_GRIDSHIFT) {
    var gridShiftCode = applyGridShift(source, false, point);
    if (gridShiftCode !== 0) {
      return undefined;
    }
    source_a = SRS_WGS84_SEMIMAJOR;
    source_es = SRS_WGS84_ESQUARED;
  }

  var dest_a = dest.a;
  var dest_b = dest.b;
  var dest_es = dest.es;
  if (dest.datum_type === PJD_GRIDSHIFT) {
    dest_a = SRS_WGS84_SEMIMAJOR;
    dest_b = SRS_WGS84_SEMIMINOR;
    dest_es = SRS_WGS84_ESQUARED;
  }

  // Do we need to go through geocentric coordinates?
  if (source_es === dest_es && source_a === dest_a && !checkParams(source.datum_type) &&  !checkParams(dest.datum_type)) {
    return point;
  }

  // Convert to geocentric coordinates.
  point = geodeticToGeocentric(point, source_es, source_a);
  // Convert between datums
  if (checkParams(source.datum_type)) {
    point = geocentricToWgs84(point, source.datum_type, source.datum_params);
  }
  if (checkParams(dest.datum_type)) {
    point = geocentricFromWgs84(point, dest.datum_type, dest.datum_params);
  }
  point = geocentricToGeodetic(point, dest_es, dest_a, dest_b);

  if (dest.datum_type === PJD_GRIDSHIFT) {
    var destGridShiftResult = applyGridShift(dest, true, point);
    if (destGridShiftResult !== 0) {
      return undefined;
    }
  }

  return point;
}

function applyGridShift(source, inverse, point) {
  if (source.grids === null || source.grids.length === 0) {
    console.log('Grid shift grids not found');
    return -1;
  }
  var input = {x: -point.x, y: point.y};
  var output = {x: Number.NaN, y: Number.NaN};
  var attemptedGrids = [];
  for (var i = 0; i < source.grids.length; i++) {
    var grid = source.grids[i];
    attemptedGrids.push(grid.name);
    if (grid.isNull) {
      output = input;
      break;
    }
    grid.mandatory;
    if (grid.grid === null) {
      if (grid.mandatory) {
        console.log("Unable to find mandatory grid '" + grid.name + "'");
        return -1;
      }
      continue;
    }
    var subgrid = grid.grid.subgrids[0];
    // skip tables that don't match our point at all
    var epsilon = (Math.abs(subgrid.del[1]) + Math.abs(subgrid.del[0])) / 10000.0;
    var minX = subgrid.ll[0] - epsilon;
    var minY = subgrid.ll[1] - epsilon;
    var maxX = subgrid.ll[0] + (subgrid.lim[0] - 1) * subgrid.del[0] + epsilon;
    var maxY = subgrid.ll[1] + (subgrid.lim[1] - 1) * subgrid.del[1] + epsilon;
    if (minY > input.y || minX > input.x || maxY < input.y || maxX < input.x ) {
      continue;
    }
    output = applySubgridShift(input, inverse, subgrid);
    if (!isNaN(output.x)) {
      break;
    }
  }
  if (isNaN(output.x)) {
    console.log("Failed to find a grid shift table for location '"+
      -input.x * R2D + " " + input.y * R2D + " tried: '" + attemptedGrids + "'");
    return -1;
  }
  point.x = -output.x;
  point.y = output.y;
  return 0;
}

function applySubgridShift(pin, inverse, ct) {
  var val = {x: Number.NaN, y: Number.NaN};
  if (isNaN(pin.x)) { return val; }
  var tb = {x: pin.x, y: pin.y};
  tb.x -= ct.ll[0];
  tb.y -= ct.ll[1];
  tb.x = adjust_lon(tb.x - Math.PI) + Math.PI;
  var t = nadInterpolate(tb, ct);
  if (inverse) {
    if (isNaN(t.x)) {
      return val;
    }
    t.x = tb.x - t.x;
    t.y = tb.y - t.y;
    var i = 9, tol = 1e-12;
    var dif, del;
    do {
      del = nadInterpolate(t, ct);
      if (isNaN(del.x)) {
        console.log("Inverse grid shift iteration failed, presumably at grid edge.  Using first approximation.");
        break;
      }
      dif = {x: tb.x - (del.x + t.x), y: tb.y - (del.y + t.y)};
      t.x += dif.x;
      t.y += dif.y;
    } while (i-- && Math.abs(dif.x) > tol && Math.abs(dif.y) > tol);
    if (i < 0) {
      console.log("Inverse grid shift iterator failed to converge.");
      return val;
    }
    val.x = adjust_lon(t.x + ct.ll[0]);
    val.y = t.y + ct.ll[1];
  } else {
    if (!isNaN(t.x)) {
      val.x = pin.x + t.x;
      val.y = pin.y + t.y;
    }
  }
  return val;
}

function nadInterpolate(pin, ct) {
  var t = {x: pin.x / ct.del[0], y: pin.y / ct.del[1]};
  var indx = {x: Math.floor(t.x), y: Math.floor(t.y)};
  var frct = {x: t.x - 1.0 * indx.x, y: t.y - 1.0 * indx.y};
  var val= {x: Number.NaN, y: Number.NaN};
  var inx;
  if (indx.x < 0 || indx.x >= ct.lim[0]) {
    return val;
  }
  if (indx.y < 0 || indx.y >= ct.lim[1]) {
    return val;
  }
  inx = (indx.y * ct.lim[0]) + indx.x;
  var f00 = {x: ct.cvs[inx][0], y: ct.cvs[inx][1]};
  inx++;
  var f10= {x: ct.cvs[inx][0], y: ct.cvs[inx][1]};
  inx += ct.lim[0];
  var f11 = {x: ct.cvs[inx][0], y: ct.cvs[inx][1]};
  inx--;
  var f01 = {x: ct.cvs[inx][0], y: ct.cvs[inx][1]};
  var m11 = frct.x * frct.y, m10 = frct.x * (1.0 - frct.y),
    m00 = (1.0 - frct.x) * (1.0 - frct.y), m01 = (1.0 - frct.x) * frct.y;
  val.x = (m00 * f00.x + m10 * f10.x + m01 * f01.x + m11 * f11.x);
  val.y = (m00 * f00.y + m10 * f10.y + m01 * f01.y + m11 * f11.y);
  return val;
}

function adjust_axis(crs, denorm, point) {
  var xin = point.x,
    yin = point.y,
    zin = point.z || 0.0;
  var v, t, i;
  var out = {};
  for (i = 0; i < 3; i++) {
    if (denorm && i === 2 && point.z === undefined) {
      continue;
    }
    if (i === 0) {
      v = xin;
      if ("ew".indexOf(crs.axis[i]) !== -1) {
        t = 'x';
      } else {
        t = 'y';
      }

    }
    else if (i === 1) {
      v = yin;
      if ("ns".indexOf(crs.axis[i]) !== -1) {
        t = 'y';
      } else {
        t = 'x';
      }
    }
    else {
      v = zin;
      t = 'z';
    }
    switch (crs.axis[i]) {
    case 'e':
      out[t] = v;
      break;
    case 'w':
      out[t] = -v;
      break;
    case 'n':
      out[t] = v;
      break;
    case 's':
      out[t] = -v;
      break;
    case 'u':
      if (point[t] !== undefined) {
        out.z = v;
      }
      break;
    case 'd':
      if (point[t] !== undefined) {
        out.z = -v;
      }
      break;
    default:
      //console.log("ERROR: unknow axis ("+crs.axis[i]+") - check definition of "+crs.projName);
      return null;
    }
  }
  return out;
}

function common (array){
  var out = {
    x: array[0],
    y: array[1]
  };
  if (array.length>2) {
    out.z = array[2];
  }
  if (array.length>3) {
    out.m = array[3];
  }
  return out;
}

function checkSanity (point) {
  checkCoord(point.x);
  checkCoord(point.y);
}
function checkCoord(num) {
  if (typeof Number.isFinite === 'function') {
    if (Number.isFinite(num)) {
      return;
    }
    throw new TypeError('coordinates must be finite numbers');
  }
  if (typeof num !== 'number' || num !== num || !isFinite(num)) {
    throw new TypeError('coordinates must be finite numbers');
  }
}

function checkNotWGS(source, dest) {
  return ((source.datum.datum_type === PJD_3PARAM || source.datum.datum_type === PJD_7PARAM) && dest.datumCode !== 'WGS84') || ((dest.datum.datum_type === PJD_3PARAM || dest.datum.datum_type === PJD_7PARAM) && source.datumCode !== 'WGS84');
}

function transform(source, dest, point, enforceAxis) {
  var wgs84;
  if (Array.isArray(point)) {
    point = common(point);
  }
  checkSanity(point);
  // Workaround for datum shifts towgs84, if either source or destination projection is not wgs84
  if (source.datum && dest.datum && checkNotWGS(source, dest)) {
    wgs84 = new Projection('WGS84');
    point = transform(source, wgs84, point, enforceAxis);
    source = wgs84;
  }
  // DGR, 2010/11/12
  if (enforceAxis && source.axis !== 'enu') {
    point = adjust_axis(source, false, point);
  }
  // Transform source points to long/lat, if they aren't already.
  if (source.projName === 'longlat') {
    point = {
      x: point.x * D2R$1,
      y: point.y * D2R$1,
      z: point.z || 0
    };
  } else {
    if (source.to_meter) {
      point = {
        x: point.x * source.to_meter,
        y: point.y * source.to_meter,
        z: point.z || 0
      };
    }
    point = source.inverse(point); // Convert Cartesian to longlat
    if (!point) {
      return;
    }
  }
  // Adjust for the prime meridian if necessary
  if (source.from_greenwich) {
    point.x += source.from_greenwich;
  }

  // Convert datums if needed, and if possible.
  point = datum_transform(source.datum, dest.datum, point);
  if (!point) {
    return;
  }

  // Adjust for the prime meridian if necessary
  if (dest.from_greenwich) {
    point = {
      x: point.x - dest.from_greenwich,
      y: point.y,
      z: point.z || 0
    };
  }

  if (dest.projName === 'longlat') {
    // convert radians to decimal degrees
    point = {
      x: point.x * R2D,
      y: point.y * R2D,
      z: point.z || 0
    };
  } else { // else project
    point = dest.forward(point);
    if (dest.to_meter) {
      point = {
        x: point.x / dest.to_meter,
        y: point.y / dest.to_meter,
        z: point.z || 0
      };
    }
  }

  // DGR, 2010/11/12
  if (enforceAxis && dest.axis !== 'enu') {
    return adjust_axis(dest, true, point);
  }

  return point;
}

var wgs84 = Projection('WGS84');

function transformer(from, to, coords, enforceAxis) {
  var transformedArray, out, keys;
  if (Array.isArray(coords)) {
    transformedArray = transform(from, to, coords, enforceAxis) || {x: NaN, y: NaN};
    if (coords.length > 2) {
      if ((typeof from.name !== 'undefined' && from.name === 'geocent') || (typeof to.name !== 'undefined' && to.name === 'geocent')) {
        if (typeof transformedArray.z === 'number') {
          return [transformedArray.x, transformedArray.y, transformedArray.z].concat(coords.splice(3));
        } else {
          return [transformedArray.x, transformedArray.y, coords[2]].concat(coords.splice(3));
        }
      } else {
        return [transformedArray.x, transformedArray.y].concat(coords.splice(2));
      }
    } else {
      return [transformedArray.x, transformedArray.y];
    }
  } else {
    out = transform(from, to, coords, enforceAxis);
    keys = Object.keys(coords);
    if (keys.length === 2) {
      return out;
    }
    keys.forEach(function (key) {
      if ((typeof from.name !== 'undefined' && from.name === 'geocent') || (typeof to.name !== 'undefined' && to.name === 'geocent')) {
        if (key === 'x' || key === 'y' || key === 'z') {
          return;
        }
      } else {
        if (key === 'x' || key === 'y') {
          return;
        }
      }
      out[key] = coords[key];
    });
    return out;
  }
}

function checkProj(item) {
  if (item instanceof Projection) {
    return item;
  }
  if (item.oProj) {
    return item.oProj;
  }
  return Projection(item);
}

function proj4(fromProj, toProj, coord) {
  fromProj = checkProj(fromProj);
  var single = false;
  var obj;
  if (typeof toProj === 'undefined') {
    toProj = fromProj;
    fromProj = wgs84;
    single = true;
  } else if (typeof toProj.x !== 'undefined' || Array.isArray(toProj)) {
    coord = toProj;
    toProj = fromProj;
    fromProj = wgs84;
    single = true;
  }
  toProj = checkProj(toProj);
  if (coord) {
    return transformer(fromProj, toProj, coord);
  } else {
    obj = {
      forward: function (coords, enforceAxis) {
        return transformer(fromProj, toProj, coords, enforceAxis);
      },
      inverse: function (coords, enforceAxis) {
        return transformer(toProj, fromProj, coords, enforceAxis);
      }
    };
    if (single) {
      obj.oProj = toProj;
    }
    return obj;
  }
}

/**
 * UTM zones are grouped, and assigned to one of a group of 6
 * sets.
 *
 * {int} @private
 */
var NUM_100K_SETS = 6;

/**
 * The column letters (for easting) of the lower left value, per
 * set.
 *
 * {string} @private
 */
var SET_ORIGIN_COLUMN_LETTERS = 'AJSAJS';

/**
 * The row letters (for northing) of the lower left value, per
 * set.
 *
 * {string} @private
 */
var SET_ORIGIN_ROW_LETTERS = 'AFAFAF';

var A = 65; // A
var I = 73; // I
var O = 79; // O
var V = 86; // V
var Z = 90; // Z
var mgrs = {
  forward: forward$t,
  inverse: inverse$t,
  toPoint: toPoint
};
/**
 * Conversion of lat/lon to MGRS.
 *
 * @param {object} ll Object literal with lat and lon properties on a
 *     WGS84 ellipsoid.
 * @param {int} accuracy Accuracy in digits (5 for 1 m, 4 for 10 m, 3 for
 *      100 m, 2 for 1000 m or 1 for 10000 m). Optional, default is 5.
 * @return {string} the MGRS string for the given location and accuracy.
 */
function forward$t(ll, accuracy) {
  accuracy = accuracy || 5; // default accuracy 1m
  return encode(LLtoUTM({
    lat: ll[1],
    lon: ll[0]
  }), accuracy);
}
/**
 * Conversion of MGRS to lat/lon.
 *
 * @param {string} mgrs MGRS string.
 * @return {array} An array with left (longitude), bottom (latitude), right
 *     (longitude) and top (latitude) values in WGS84, representing the
 *     bounding box for the provided MGRS reference.
 */
function inverse$t(mgrs) {
  var bbox = UTMtoLL(decode(mgrs.toUpperCase()));
  if (bbox.lat && bbox.lon) {
    return [bbox.lon, bbox.lat, bbox.lon, bbox.lat];
  }
  return [bbox.left, bbox.bottom, bbox.right, bbox.top];
}
function toPoint(mgrs) {
  var bbox = UTMtoLL(decode(mgrs.toUpperCase()));
  if (bbox.lat && bbox.lon) {
    return [bbox.lon, bbox.lat];
  }
  return [(bbox.left + bbox.right) / 2, (bbox.top + bbox.bottom) / 2];
}/**
 * Conversion from degrees to radians.
 *
 * @private
 * @param {number} deg the angle in degrees.
 * @return {number} the angle in radians.
 */
function degToRad(deg) {
  return (deg * (Math.PI / 180.0));
}

/**
 * Conversion from radians to degrees.
 *
 * @private
 * @param {number} rad the angle in radians.
 * @return {number} the angle in degrees.
 */
function radToDeg(rad) {
  return (180.0 * (rad / Math.PI));
}

/**
 * Converts a set of Longitude and Latitude co-ordinates to UTM
 * using the WGS84 ellipsoid.
 *
 * @private
 * @param {object} ll Object literal with lat and lon properties
 *     representing the WGS84 coordinate to be converted.
 * @return {object} Object literal containing the UTM value with easting,
 *     northing, zoneNumber and zoneLetter properties, and an optional
 *     accuracy property in digits. Returns null if the conversion failed.
 */
function LLtoUTM(ll) {
  var Lat = ll.lat;
  var Long = ll.lon;
  var a = 6378137.0; //ellip.radius;
  var eccSquared = 0.00669438; //ellip.eccsq;
  var k0 = 0.9996;
  var LongOrigin;
  var eccPrimeSquared;
  var N, T, C, A, M;
  var LatRad = degToRad(Lat);
  var LongRad = degToRad(Long);
  var LongOriginRad;
  var ZoneNumber;
  // (int)
  ZoneNumber = Math.floor((Long + 180) / 6) + 1;

  //Make sure the longitude 180.00 is in Zone 60
  if (Long === 180) {
    ZoneNumber = 60;
  }

  // Special zone for Norway
  if (Lat >= 56.0 && Lat < 64.0 && Long >= 3.0 && Long < 12.0) {
    ZoneNumber = 32;
  }

  // Special zones for Svalbard
  if (Lat >= 72.0 && Lat < 84.0) {
    if (Long >= 0.0 && Long < 9.0) {
      ZoneNumber = 31;
    }
    else if (Long >= 9.0 && Long < 21.0) {
      ZoneNumber = 33;
    }
    else if (Long >= 21.0 && Long < 33.0) {
      ZoneNumber = 35;
    }
    else if (Long >= 33.0 && Long < 42.0) {
      ZoneNumber = 37;
    }
  }

  LongOrigin = (ZoneNumber - 1) * 6 - 180 + 3; //+3 puts origin
  // in middle of
  // zone
  LongOriginRad = degToRad(LongOrigin);

  eccPrimeSquared = (eccSquared) / (1 - eccSquared);

  N = a / Math.sqrt(1 - eccSquared * Math.sin(LatRad) * Math.sin(LatRad));
  T = Math.tan(LatRad) * Math.tan(LatRad);
  C = eccPrimeSquared * Math.cos(LatRad) * Math.cos(LatRad);
  A = Math.cos(LatRad) * (LongRad - LongOriginRad);

  M = a * ((1 - eccSquared / 4 - 3 * eccSquared * eccSquared / 64 - 5 * eccSquared * eccSquared * eccSquared / 256) * LatRad - (3 * eccSquared / 8 + 3 * eccSquared * eccSquared / 32 + 45 * eccSquared * eccSquared * eccSquared / 1024) * Math.sin(2 * LatRad) + (15 * eccSquared * eccSquared / 256 + 45 * eccSquared * eccSquared * eccSquared / 1024) * Math.sin(4 * LatRad) - (35 * eccSquared * eccSquared * eccSquared / 3072) * Math.sin(6 * LatRad));

  var UTMEasting = (k0 * N * (A + (1 - T + C) * A * A * A / 6.0 + (5 - 18 * T + T * T + 72 * C - 58 * eccPrimeSquared) * A * A * A * A * A / 120.0) + 500000.0);

  var UTMNorthing = (k0 * (M + N * Math.tan(LatRad) * (A * A / 2 + (5 - T + 9 * C + 4 * C * C) * A * A * A * A / 24.0 + (61 - 58 * T + T * T + 600 * C - 330 * eccPrimeSquared) * A * A * A * A * A * A / 720.0)));
  if (Lat < 0.0) {
    UTMNorthing += 10000000.0; //10000000 meter offset for
    // southern hemisphere
  }

  return {
    northing: Math.round(UTMNorthing),
    easting: Math.round(UTMEasting),
    zoneNumber: ZoneNumber,
    zoneLetter: getLetterDesignator(Lat)
  };
}

/**
 * Converts UTM coords to lat/long, using the WGS84 ellipsoid. This is a convenience
 * class where the Zone can be specified as a single string eg."60N" which
 * is then broken down into the ZoneNumber and ZoneLetter.
 *
 * @private
 * @param {object} utm An object literal with northing, easting, zoneNumber
 *     and zoneLetter properties. If an optional accuracy property is
 *     provided (in meters), a bounding box will be returned instead of
 *     latitude and longitude.
 * @return {object} An object literal containing either lat and lon values
 *     (if no accuracy was provided), or top, right, bottom and left values
 *     for the bounding box calculated according to the provided accuracy.
 *     Returns null if the conversion failed.
 */
function UTMtoLL(utm) {

  var UTMNorthing = utm.northing;
  var UTMEasting = utm.easting;
  var zoneLetter = utm.zoneLetter;
  var zoneNumber = utm.zoneNumber;
  // check the ZoneNummber is valid
  if (zoneNumber < 0 || zoneNumber > 60) {
    return null;
  }

  var k0 = 0.9996;
  var a = 6378137.0; //ellip.radius;
  var eccSquared = 0.00669438; //ellip.eccsq;
  var eccPrimeSquared;
  var e1 = (1 - Math.sqrt(1 - eccSquared)) / (1 + Math.sqrt(1 - eccSquared));
  var N1, T1, C1, R1, D, M;
  var LongOrigin;
  var mu, phi1Rad;

  // remove 500,000 meter offset for longitude
  var x = UTMEasting - 500000.0;
  var y = UTMNorthing;

  // We must know somehow if we are in the Northern or Southern
  // hemisphere, this is the only time we use the letter So even
  // if the Zone letter isn't exactly correct it should indicate
  // the hemisphere correctly
  if (zoneLetter < 'N') {
    y -= 10000000.0; // remove 10,000,000 meter offset used
    // for southern hemisphere
  }

  // There are 60 zones with zone 1 being at West -180 to -174
  LongOrigin = (zoneNumber - 1) * 6 - 180 + 3; // +3 puts origin
  // in middle of
  // zone

  eccPrimeSquared = (eccSquared) / (1 - eccSquared);

  M = y / k0;
  mu = M / (a * (1 - eccSquared / 4 - 3 * eccSquared * eccSquared / 64 - 5 * eccSquared * eccSquared * eccSquared / 256));

  phi1Rad = mu + (3 * e1 / 2 - 27 * e1 * e1 * e1 / 32) * Math.sin(2 * mu) + (21 * e1 * e1 / 16 - 55 * e1 * e1 * e1 * e1 / 32) * Math.sin(4 * mu) + (151 * e1 * e1 * e1 / 96) * Math.sin(6 * mu);
  // double phi1 = ProjMath.radToDeg(phi1Rad);

  N1 = a / Math.sqrt(1 - eccSquared * Math.sin(phi1Rad) * Math.sin(phi1Rad));
  T1 = Math.tan(phi1Rad) * Math.tan(phi1Rad);
  C1 = eccPrimeSquared * Math.cos(phi1Rad) * Math.cos(phi1Rad);
  R1 = a * (1 - eccSquared) / Math.pow(1 - eccSquared * Math.sin(phi1Rad) * Math.sin(phi1Rad), 1.5);
  D = x / (N1 * k0);

  var lat = phi1Rad - (N1 * Math.tan(phi1Rad) / R1) * (D * D / 2 - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * eccPrimeSquared) * D * D * D * D / 24 + (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * eccPrimeSquared - 3 * C1 * C1) * D * D * D * D * D * D / 720);
  lat = radToDeg(lat);

  var lon = (D - (1 + 2 * T1 + C1) * D * D * D / 6 + (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * eccPrimeSquared + 24 * T1 * T1) * D * D * D * D * D / 120) / Math.cos(phi1Rad);
  lon = LongOrigin + radToDeg(lon);

  var result;
  if (utm.accuracy) {
    var topRight = UTMtoLL({
      northing: utm.northing + utm.accuracy,
      easting: utm.easting + utm.accuracy,
      zoneLetter: utm.zoneLetter,
      zoneNumber: utm.zoneNumber
    });
    result = {
      top: topRight.lat,
      right: topRight.lon,
      bottom: lat,
      left: lon
    };
  }
  else {
    result = {
      lat: lat,
      lon: lon
    };
  }
  return result;
}

/**
 * Calculates the MGRS letter designator for the given latitude.
 *
 * @private
 * @param {number} lat The latitude in WGS84 to get the letter designator
 *     for.
 * @return {char} The letter designator.
 */
function getLetterDesignator(lat) {
  //This is here as an error flag to show that the Latitude is
  //outside MGRS limits
  var LetterDesignator = 'Z';

  if ((84 >= lat) && (lat >= 72)) {
    LetterDesignator = 'X';
  }
  else if ((72 > lat) && (lat >= 64)) {
    LetterDesignator = 'W';
  }
  else if ((64 > lat) && (lat >= 56)) {
    LetterDesignator = 'V';
  }
  else if ((56 > lat) && (lat >= 48)) {
    LetterDesignator = 'U';
  }
  else if ((48 > lat) && (lat >= 40)) {
    LetterDesignator = 'T';
  }
  else if ((40 > lat) && (lat >= 32)) {
    LetterDesignator = 'S';
  }
  else if ((32 > lat) && (lat >= 24)) {
    LetterDesignator = 'R';
  }
  else if ((24 > lat) && (lat >= 16)) {
    LetterDesignator = 'Q';
  }
  else if ((16 > lat) && (lat >= 8)) {
    LetterDesignator = 'P';
  }
  else if ((8 > lat) && (lat >= 0)) {
    LetterDesignator = 'N';
  }
  else if ((0 > lat) && (lat >= -8)) {
    LetterDesignator = 'M';
  }
  else if ((-8 > lat) && (lat >= -16)) {
    LetterDesignator = 'L';
  }
  else if ((-16 > lat) && (lat >= -24)) {
    LetterDesignator = 'K';
  }
  else if ((-24 > lat) && (lat >= -32)) {
    LetterDesignator = 'J';
  }
  else if ((-32 > lat) && (lat >= -40)) {
    LetterDesignator = 'H';
  }
  else if ((-40 > lat) && (lat >= -48)) {
    LetterDesignator = 'G';
  }
  else if ((-48 > lat) && (lat >= -56)) {
    LetterDesignator = 'F';
  }
  else if ((-56 > lat) && (lat >= -64)) {
    LetterDesignator = 'E';
  }
  else if ((-64 > lat) && (lat >= -72)) {
    LetterDesignator = 'D';
  }
  else if ((-72 > lat) && (lat >= -80)) {
    LetterDesignator = 'C';
  }
  return LetterDesignator;
}

/**
 * Encodes a UTM location as MGRS string.
 *
 * @private
 * @param {object} utm An object literal with easting, northing,
 *     zoneLetter, zoneNumber
 * @param {number} accuracy Accuracy in digits (1-5).
 * @return {string} MGRS string for the given UTM location.
 */
function encode(utm, accuracy) {
  // prepend with leading zeroes
  var seasting = "00000" + utm.easting,
    snorthing = "00000" + utm.northing;

  return utm.zoneNumber + utm.zoneLetter + get100kID(utm.easting, utm.northing, utm.zoneNumber) + seasting.substr(seasting.length - 5, accuracy) + snorthing.substr(snorthing.length - 5, accuracy);
}

/**
 * Get the two letter 100k designator for a given UTM easting,
 * northing and zone number value.
 *
 * @private
 * @param {number} easting
 * @param {number} northing
 * @param {number} zoneNumber
 * @return the two letter 100k designator for the given UTM location.
 */
function get100kID(easting, northing, zoneNumber) {
  var setParm = get100kSetForZone(zoneNumber);
  var setColumn = Math.floor(easting / 100000);
  var setRow = Math.floor(northing / 100000) % 20;
  return getLetter100kID(setColumn, setRow, setParm);
}

/**
 * Given a UTM zone number, figure out the MGRS 100K set it is in.
 *
 * @private
 * @param {number} i An UTM zone number.
 * @return {number} the 100k set the UTM zone is in.
 */
function get100kSetForZone(i) {
  var setParm = i % NUM_100K_SETS;
  if (setParm === 0) {
    setParm = NUM_100K_SETS;
  }

  return setParm;
}

/**
 * Get the two-letter MGRS 100k designator given information
 * translated from the UTM northing, easting and zone number.
 *
 * @private
 * @param {number} column the column index as it relates to the MGRS
 *        100k set spreadsheet, created from the UTM easting.
 *        Values are 1-8.
 * @param {number} row the row index as it relates to the MGRS 100k set
 *        spreadsheet, created from the UTM northing value. Values
 *        are from 0-19.
 * @param {number} parm the set block, as it relates to the MGRS 100k set
 *        spreadsheet, created from the UTM zone. Values are from
 *        1-60.
 * @return two letter MGRS 100k code.
 */
function getLetter100kID(column, row, parm) {
  // colOrigin and rowOrigin are the letters at the origin of the set
  var index = parm - 1;
  var colOrigin = SET_ORIGIN_COLUMN_LETTERS.charCodeAt(index);
  var rowOrigin = SET_ORIGIN_ROW_LETTERS.charCodeAt(index);

  // colInt and rowInt are the letters to build to return
  var colInt = colOrigin + column - 1;
  var rowInt = rowOrigin + row;
  var rollover = false;

  if (colInt > Z) {
    colInt = colInt - Z + A - 1;
    rollover = true;
  }

  if (colInt === I || (colOrigin < I && colInt > I) || ((colInt > I || colOrigin < I) && rollover)) {
    colInt++;
  }

  if (colInt === O || (colOrigin < O && colInt > O) || ((colInt > O || colOrigin < O) && rollover)) {
    colInt++;

    if (colInt === I) {
      colInt++;
    }
  }

  if (colInt > Z) {
    colInt = colInt - Z + A - 1;
  }

  if (rowInt > V) {
    rowInt = rowInt - V + A - 1;
    rollover = true;
  }
  else {
    rollover = false;
  }

  if (((rowInt === I) || ((rowOrigin < I) && (rowInt > I))) || (((rowInt > I) || (rowOrigin < I)) && rollover)) {
    rowInt++;
  }

  if (((rowInt === O) || ((rowOrigin < O) && (rowInt > O))) || (((rowInt > O) || (rowOrigin < O)) && rollover)) {
    rowInt++;

    if (rowInt === I) {
      rowInt++;
    }
  }

  if (rowInt > V) {
    rowInt = rowInt - V + A - 1;
  }

  var twoLetter = String.fromCharCode(colInt) + String.fromCharCode(rowInt);
  return twoLetter;
}

/**
 * Decode the UTM parameters from a MGRS string.
 *
 * @private
 * @param {string} mgrsString an UPPERCASE coordinate string is expected.
 * @return {object} An object literal with easting, northing, zoneLetter,
 *     zoneNumber and accuracy (in meters) properties.
 */
function decode(mgrsString) {

  if (mgrsString && mgrsString.length === 0) {
    throw ("MGRSPoint coverting from nothing");
  }

  var length = mgrsString.length;

  var hunK = null;
  var sb = "";
  var testChar;
  var i = 0;

  // get Zone number
  while (!(/[A-Z]/).test(testChar = mgrsString.charAt(i))) {
    if (i >= 2) {
      throw ("MGRSPoint bad conversion from: " + mgrsString);
    }
    sb += testChar;
    i++;
  }

  var zoneNumber = parseInt(sb, 10);

  if (i === 0 || i + 3 > length) {
    // A good MGRS string has to be 4-5 digits long,
    // ##AAA/#AAA at least.
    throw ("MGRSPoint bad conversion from: " + mgrsString);
  }

  var zoneLetter = mgrsString.charAt(i++);

  // Should we check the zone letter here? Why not.
  if (zoneLetter <= 'A' || zoneLetter === 'B' || zoneLetter === 'Y' || zoneLetter >= 'Z' || zoneLetter === 'I' || zoneLetter === 'O') {
    throw ("MGRSPoint zone letter " + zoneLetter + " not handled: " + mgrsString);
  }

  hunK = mgrsString.substring(i, i += 2);

  var set = get100kSetForZone(zoneNumber);

  var east100k = getEastingFromChar(hunK.charAt(0), set);
  var north100k = getNorthingFromChar(hunK.charAt(1), set);

  // We have a bug where the northing may be 2000000 too low.
  // How
  // do we know when to roll over?

  while (north100k < getMinNorthing(zoneLetter)) {
    north100k += 2000000;
  }

  // calculate the char index for easting/northing separator
  var remainder = length - i;

  if (remainder % 2 !== 0) {
    throw ("MGRSPoint has to have an even number \nof digits after the zone letter and two 100km letters - front \nhalf for easting meters, second half for \nnorthing meters" + mgrsString);
  }

  var sep = remainder / 2;

  var sepEasting = 0.0;
  var sepNorthing = 0.0;
  var accuracyBonus, sepEastingString, sepNorthingString, easting, northing;
  if (sep > 0) {
    accuracyBonus = 100000.0 / Math.pow(10, sep);
    sepEastingString = mgrsString.substring(i, i + sep);
    sepEasting = parseFloat(sepEastingString) * accuracyBonus;
    sepNorthingString = mgrsString.substring(i + sep);
    sepNorthing = parseFloat(sepNorthingString) * accuracyBonus;
  }

  easting = sepEasting + east100k;
  northing = sepNorthing + north100k;

  return {
    easting: easting,
    northing: northing,
    zoneLetter: zoneLetter,
    zoneNumber: zoneNumber,
    accuracy: accuracyBonus
  };
}

/**
 * Given the first letter from a two-letter MGRS 100k zone, and given the
 * MGRS table set for the zone number, figure out the easting value that
 * should be added to the other, secondary easting value.
 *
 * @private
 * @param {char} e The first letter from a two-letter MGRS 100´k zone.
 * @param {number} set The MGRS table set for the zone number.
 * @return {number} The easting value for the given letter and set.
 */
function getEastingFromChar(e, set) {
  // colOrigin is the letter at the origin of the set for the
  // column
  var curCol = SET_ORIGIN_COLUMN_LETTERS.charCodeAt(set - 1);
  var eastingValue = 100000.0;
  var rewindMarker = false;

  while (curCol !== e.charCodeAt(0)) {
    curCol++;
    if (curCol === I) {
      curCol++;
    }
    if (curCol === O) {
      curCol++;
    }
    if (curCol > Z) {
      if (rewindMarker) {
        throw ("Bad character: " + e);
      }
      curCol = A;
      rewindMarker = true;
    }
    eastingValue += 100000.0;
  }

  return eastingValue;
}

/**
 * Given the second letter from a two-letter MGRS 100k zone, and given the
 * MGRS table set for the zone number, figure out the northing value that
 * should be added to the other, secondary northing value. You have to
 * remember that Northings are determined from the equator, and the vertical
 * cycle of letters mean a 2000000 additional northing meters. This happens
 * approx. every 18 degrees of latitude. This method does *NOT* count any
 * additional northings. You have to figure out how many 2000000 meters need
 * to be added for the zone letter of the MGRS coordinate.
 *
 * @private
 * @param {char} n Second letter of the MGRS 100k zone
 * @param {number} set The MGRS table set number, which is dependent on the
 *     UTM zone number.
 * @return {number} The northing value for the given letter and set.
 */
function getNorthingFromChar(n, set) {

  if (n > 'V') {
    throw ("MGRSPoint given invalid Northing " + n);
  }

  // rowOrigin is the letter at the origin of the set for the
  // column
  var curRow = SET_ORIGIN_ROW_LETTERS.charCodeAt(set - 1);
  var northingValue = 0.0;
  var rewindMarker = false;

  while (curRow !== n.charCodeAt(0)) {
    curRow++;
    if (curRow === I) {
      curRow++;
    }
    if (curRow === O) {
      curRow++;
    }
    // fixing a bug making whole application hang in this loop
    // when 'n' is a wrong character
    if (curRow > V) {
      if (rewindMarker) { // making sure that this loop ends
        throw ("Bad character: " + n);
      }
      curRow = A;
      rewindMarker = true;
    }
    northingValue += 100000.0;
  }

  return northingValue;
}

/**
 * The function getMinNorthing returns the minimum northing value of a MGRS
 * zone.
 *
 * Ported from Geotrans' c Lattitude_Band_Value structure table.
 *
 * @private
 * @param {char} zoneLetter The MGRS zone to get the min northing for.
 * @return {number}
 */
function getMinNorthing(zoneLetter) {
  var northing;
  switch (zoneLetter) {
  case 'C':
    northing = 1100000.0;
    break;
  case 'D':
    northing = 2000000.0;
    break;
  case 'E':
    northing = 2800000.0;
    break;
  case 'F':
    northing = 3700000.0;
    break;
  case 'G':
    northing = 4600000.0;
    break;
  case 'H':
    northing = 5500000.0;
    break;
  case 'J':
    northing = 6400000.0;
    break;
  case 'K':
    northing = 7300000.0;
    break;
  case 'L':
    northing = 8200000.0;
    break;
  case 'M':
    northing = 9100000.0;
    break;
  case 'N':
    northing = 0.0;
    break;
  case 'P':
    northing = 800000.0;
    break;
  case 'Q':
    northing = 1700000.0;
    break;
  case 'R':
    northing = 2600000.0;
    break;
  case 'S':
    northing = 3500000.0;
    break;
  case 'T':
    northing = 4400000.0;
    break;
  case 'U':
    northing = 5300000.0;
    break;
  case 'V':
    northing = 6200000.0;
    break;
  case 'W':
    northing = 7000000.0;
    break;
  case 'X':
    northing = 7900000.0;
    break;
  default:
    northing = -1.0;
  }
  if (northing >= 0.0) {
    return northing;
  }
  else {
    throw ("Invalid zone letter: " + zoneLetter);
  }

}

function Point(x, y, z) {
  if (!(this instanceof Point)) {
    return new Point(x, y, z);
  }
  if (Array.isArray(x)) {
    this.x = x[0];
    this.y = x[1];
    this.z = x[2] || 0.0;
  } else if(typeof x === 'object') {
    this.x = x.x;
    this.y = x.y;
    this.z = x.z || 0.0;
  } else if (typeof x === 'string' && typeof y === 'undefined') {
    var coords = x.split(',');
    this.x = parseFloat(coords[0], 10);
    this.y = parseFloat(coords[1], 10);
    this.z = parseFloat(coords[2], 10) || 0.0;
  } else {
    this.x = x;
    this.y = y;
    this.z = z || 0.0;
  }
  console.warn('proj4.Point will be removed in version 3, use proj4.toPoint');
}

Point.fromMGRS = function(mgrsStr) {
  return new Point(toPoint(mgrsStr));
};
Point.prototype.toMGRS = function(accuracy) {
  return forward$t([this.x, this.y], accuracy);
};

var C00 = 1;
var C02 = 0.25;
var C04 = 0.046875;
var C06 = 0.01953125;
var C08 = 0.01068115234375;
var C22 = 0.75;
var C44 = 0.46875;
var C46 = 0.01302083333333333333;
var C48 = 0.00712076822916666666;
var C66 = 0.36458333333333333333;
var C68 = 0.00569661458333333333;
var C88 = 0.3076171875;

function pj_enfn(es) {
  var en = [];
  en[0] = C00 - es * (C02 + es * (C04 + es * (C06 + es * C08)));
  en[1] = es * (C22 - es * (C04 + es * (C06 + es * C08)));
  var t = es * es;
  en[2] = t * (C44 - es * (C46 + es * C48));
  t *= es;
  en[3] = t * (C66 - es * C68);
  en[4] = t * es * C88;
  return en;
}

function pj_mlfn(phi, sphi, cphi, en) {
  cphi *= sphi;
  sphi *= sphi;
  return (en[0] * phi - cphi * (en[1] + sphi * (en[2] + sphi * (en[3] + sphi * en[4]))));
}

var MAX_ITER$3 = 20;

function pj_inv_mlfn(arg, es, en) {
  var k = 1 / (1 - es);
  var phi = arg;
  for (var i = MAX_ITER$3; i; --i) { /* rarely goes over 2 iterations */
    var s = Math.sin(phi);
    var t = 1 - es * s * s;
    //t = this.pj_mlfn(phi, s, Math.cos(phi), en) - arg;
    //phi -= t * (t * Math.sqrt(t)) * k;
    t = (pj_mlfn(phi, s, Math.cos(phi), en) - arg) * (t * Math.sqrt(t)) * k;
    phi -= t;
    if (Math.abs(t) < EPSLN) {
      return phi;
    }
  }
  //..reportError("cass:pj_inv_mlfn: Convergence error");
  return phi;
}

// Heavily based on this tmerc projection implementation

function init$t() {
  this.x0 = this.x0 !== undefined ? this.x0 : 0;
  this.y0 = this.y0 !== undefined ? this.y0 : 0;
  this.long0 = this.long0 !== undefined ? this.long0 : 0;
  this.lat0 = this.lat0 !== undefined ? this.lat0 : 0;

  if (this.es) {
    this.en = pj_enfn(this.es);
    this.ml0 = pj_mlfn(this.lat0, Math.sin(this.lat0), Math.cos(this.lat0), this.en);
  }
}

/**
    Transverse Mercator Forward  - long/lat to x/y
    long/lat in radians
  */
function forward$s(p) {
  var lon = p.x;
  var lat = p.y;

  var delta_lon = adjust_lon(lon - this.long0);
  var con;
  var x, y;
  var sin_phi = Math.sin(lat);
  var cos_phi = Math.cos(lat);

  if (!this.es) {
    var b = cos_phi * Math.sin(delta_lon);

    if ((Math.abs(Math.abs(b) - 1)) < EPSLN) {
      return (93);
    }
    else {
      x = 0.5 * this.a * this.k0 * Math.log((1 + b) / (1 - b)) + this.x0;
      y = cos_phi * Math.cos(delta_lon) / Math.sqrt(1 - Math.pow(b, 2));
      b = Math.abs(y);

      if (b >= 1) {
        if ((b - 1) > EPSLN) {
          return (93);
        }
        else {
          y = 0;
        }
      }
      else {
        y = Math.acos(y);
      }

      if (lat < 0) {
        y = -y;
      }

      y = this.a * this.k0 * (y - this.lat0) + this.y0;
    }
  }
  else {
    var al = cos_phi * delta_lon;
    var als = Math.pow(al, 2);
    var c = this.ep2 * Math.pow(cos_phi, 2);
    var cs = Math.pow(c, 2);
    var tq = Math.abs(cos_phi) > EPSLN ? Math.tan(lat) : 0;
    var t = Math.pow(tq, 2);
    var ts = Math.pow(t, 2);
    con = 1 - this.es * Math.pow(sin_phi, 2);
    al = al / Math.sqrt(con);
    var ml = pj_mlfn(lat, sin_phi, cos_phi, this.en);

    x = this.a * (this.k0 * al * (1 +
      als / 6 * (1 - t + c +
      als / 20 * (5 - 18 * t + ts + 14 * c - 58 * t * c +
      als / 42 * (61 + 179 * ts - ts * t - 479 * t))))) +
      this.x0;

    y = this.a * (this.k0 * (ml - this.ml0 +
      sin_phi * delta_lon * al / 2 * (1 +
      als / 12 * (5 - t + 9 * c + 4 * cs +
      als / 30 * (61 + ts - 58 * t + 270 * c - 330 * t * c +
      als / 56 * (1385 + 543 * ts - ts * t - 3111 * t)))))) +
      this.y0;
  }

  p.x = x;
  p.y = y;

  return p;
}

/**
    Transverse Mercator Inverse  -  x/y to long/lat
  */
function inverse$s(p) {
  var con, phi;
  var lat, lon;
  var x = (p.x - this.x0) * (1 / this.a);
  var y = (p.y - this.y0) * (1 / this.a);

  if (!this.es) {
    var f = Math.exp(x / this.k0);
    var g = 0.5 * (f - 1 / f);
    var temp = this.lat0 + y / this.k0;
    var h = Math.cos(temp);
    con = Math.sqrt((1 - Math.pow(h, 2)) / (1 + Math.pow(g, 2)));
    lat = Math.asin(con);

    if (y < 0) {
      lat = -lat;
    }

    if ((g === 0) && (h === 0)) {
      lon = 0;
    }
    else {
      lon = adjust_lon(Math.atan2(g, h) + this.long0);
    }
  }
  else { // ellipsoidal form
    con = this.ml0 + y / this.k0;
    phi = pj_inv_mlfn(con, this.es, this.en);

    if (Math.abs(phi) < HALF_PI) {
      var sin_phi = Math.sin(phi);
      var cos_phi = Math.cos(phi);
      var tan_phi = Math.abs(cos_phi) > EPSLN ? Math.tan(phi) : 0;
      var c = this.ep2 * Math.pow(cos_phi, 2);
      var cs = Math.pow(c, 2);
      var t = Math.pow(tan_phi, 2);
      var ts = Math.pow(t, 2);
      con = 1 - this.es * Math.pow(sin_phi, 2);
      var d = x * Math.sqrt(con) / this.k0;
      var ds = Math.pow(d, 2);
      con = con * tan_phi;

      lat = phi - (con * ds / (1 - this.es)) * 0.5 * (1 -
        ds / 12 * (5 + 3 * t - 9 * c * t + c - 4 * cs -
        ds / 30 * (61 + 90 * t - 252 * c * t + 45 * ts + 46 * c -
        ds / 56 * (1385 + 3633 * t + 4095 * ts + 1574 * ts * t))));

      lon = adjust_lon(this.long0 + (d * (1 -
        ds / 6 * (1 + 2 * t + c -
        ds / 20 * (5 + 28 * t + 24 * ts + 8 * c * t + 6 * c -
        ds / 42 * (61 + 662 * t + 1320 * ts + 720 * ts * t)))) / cos_phi));
    }
    else {
      lat = HALF_PI * sign(y);
      lon = 0;
    }
  }

  p.x = lon;
  p.y = lat;

  return p;
}

var names$t = ["Fast_Transverse_Mercator", "Fast Transverse Mercator"];
var tmerc = {
  init: init$t,
  forward: forward$s,
  inverse: inverse$s,
  names: names$t
};

function sinh(x) {
  var r = Math.exp(x);
  r = (r - 1 / r) / 2;
  return r;
}

function hypot(x, y) {
  x = Math.abs(x);
  y = Math.abs(y);
  var a = Math.max(x, y);
  var b = Math.min(x, y) / (a ? a : 1);

  return a * Math.sqrt(1 + Math.pow(b, 2));
}

function log1py(x) {
  var y = 1 + x;
  var z = y - 1;

  return z === 0 ? x : x * Math.log(y) / z;
}

function asinhy(x) {
  var y = Math.abs(x);
  y = log1py(y * (1 + y / (hypot(1, y) + 1)));

  return x < 0 ? -y : y;
}

function gatg(pp, B) {
  var cos_2B = 2 * Math.cos(2 * B);
  var i = pp.length - 1;
  var h1 = pp[i];
  var h2 = 0;
  var h;

  while (--i >= 0) {
    h = -h2 + cos_2B * h1 + pp[i];
    h2 = h1;
    h1 = h;
  }

  return (B + h * Math.sin(2 * B));
}

function clens(pp, arg_r) {
  var r = 2 * Math.cos(arg_r);
  var i = pp.length - 1;
  var hr1 = pp[i];
  var hr2 = 0;
  var hr;

  while (--i >= 0) {
    hr = -hr2 + r * hr1 + pp[i];
    hr2 = hr1;
    hr1 = hr;
  }

  return Math.sin(arg_r) * hr;
}

function cosh(x) {
  var r = Math.exp(x);
  r = (r + 1 / r) / 2;
  return r;
}

function clens_cmplx(pp, arg_r, arg_i) {
  var sin_arg_r = Math.sin(arg_r);
  var cos_arg_r = Math.cos(arg_r);
  var sinh_arg_i = sinh(arg_i);
  var cosh_arg_i = cosh(arg_i);
  var r = 2 * cos_arg_r * cosh_arg_i;
  var i = -2 * sin_arg_r * sinh_arg_i;
  var j = pp.length - 1;
  var hr = pp[j];
  var hi1 = 0;
  var hr1 = 0;
  var hi = 0;
  var hr2;
  var hi2;

  while (--j >= 0) {
    hr2 = hr1;
    hi2 = hi1;
    hr1 = hr;
    hi1 = hi;
    hr = -hr2 + r * hr1 - i * hi1 + pp[j];
    hi = -hi2 + i * hr1 + r * hi1;
  }

  r = sin_arg_r * cosh_arg_i;
  i = cos_arg_r * sinh_arg_i;

  return [r * hr - i * hi, r * hi + i * hr];
}

// Heavily based on this etmerc projection implementation

function init$s() {
  if (!this.approx && (isNaN(this.es) || this.es <= 0)) {
    throw new Error('Incorrect elliptical usage. Try using the +approx option in the proj string, or PROJECTION["Fast_Transverse_Mercator"] in the WKT.');
  }
  if (this.approx) {
    // When '+approx' is set, use tmerc instead
    tmerc.init.apply(this);
    this.forward = tmerc.forward;
    this.inverse = tmerc.inverse;
  }

  this.x0 = this.x0 !== undefined ? this.x0 : 0;
  this.y0 = this.y0 !== undefined ? this.y0 : 0;
  this.long0 = this.long0 !== undefined ? this.long0 : 0;
  this.lat0 = this.lat0 !== undefined ? this.lat0 : 0;

  this.cgb = [];
  this.cbg = [];
  this.utg = [];
  this.gtu = [];

  var f = this.es / (1 + Math.sqrt(1 - this.es));
  var n = f / (2 - f);
  var np = n;

  this.cgb[0] = n * (2 + n * (-2 / 3 + n * (-2 + n * (116 / 45 + n * (26 / 45 + n * (-2854 / 675 ))))));
  this.cbg[0] = n * (-2 + n * ( 2 / 3 + n * ( 4 / 3 + n * (-82 / 45 + n * (32 / 45 + n * (4642 / 4725))))));

  np = np * n;
  this.cgb[1] = np * (7 / 3 + n * (-8 / 5 + n * (-227 / 45 + n * (2704 / 315 + n * (2323 / 945)))));
  this.cbg[1] = np * (5 / 3 + n * (-16 / 15 + n * ( -13 / 9 + n * (904 / 315 + n * (-1522 / 945)))));

  np = np * n;
  this.cgb[2] = np * (56 / 15 + n * (-136 / 35 + n * (-1262 / 105 + n * (73814 / 2835))));
  this.cbg[2] = np * (-26 / 15 + n * (34 / 21 + n * (8 / 5 + n * (-12686 / 2835))));

  np = np * n;
  this.cgb[3] = np * (4279 / 630 + n * (-332 / 35 + n * (-399572 / 14175)));
  this.cbg[3] = np * (1237 / 630 + n * (-12 / 5 + n * ( -24832 / 14175)));

  np = np * n;
  this.cgb[4] = np * (4174 / 315 + n * (-144838 / 6237));
  this.cbg[4] = np * (-734 / 315 + n * (109598 / 31185));

  np = np * n;
  this.cgb[5] = np * (601676 / 22275);
  this.cbg[5] = np * (444337 / 155925);

  np = Math.pow(n, 2);
  this.Qn = this.k0 / (1 + n) * (1 + np * (1 / 4 + np * (1 / 64 + np / 256)));

  this.utg[0] = n * (-0.5 + n * ( 2 / 3 + n * (-37 / 96 + n * ( 1 / 360 + n * (81 / 512 + n * (-96199 / 604800))))));
  this.gtu[0] = n * (0.5 + n * (-2 / 3 + n * (5 / 16 + n * (41 / 180 + n * (-127 / 288 + n * (7891 / 37800))))));

  this.utg[1] = np * (-1 / 48 + n * (-1 / 15 + n * (437 / 1440 + n * (-46 / 105 + n * (1118711 / 3870720)))));
  this.gtu[1] = np * (13 / 48 + n * (-3 / 5 + n * (557 / 1440 + n * (281 / 630 + n * (-1983433 / 1935360)))));

  np = np * n;
  this.utg[2] = np * (-17 / 480 + n * (37 / 840 + n * (209 / 4480 + n * (-5569 / 90720 ))));
  this.gtu[2] = np * (61 / 240 + n * (-103 / 140 + n * (15061 / 26880 + n * (167603 / 181440))));

  np = np * n;
  this.utg[3] = np * (-4397 / 161280 + n * (11 / 504 + n * (830251 / 7257600)));
  this.gtu[3] = np * (49561 / 161280 + n * (-179 / 168 + n * (6601661 / 7257600)));

  np = np * n;
  this.utg[4] = np * (-4583 / 161280 + n * (108847 / 3991680));
  this.gtu[4] = np * (34729 / 80640 + n * (-3418889 / 1995840));

  np = np * n;
  this.utg[5] = np * (-20648693 / 638668800);
  this.gtu[5] = np * (212378941 / 319334400);

  var Z = gatg(this.cbg, this.lat0);
  this.Zb = -this.Qn * (Z + clens(this.gtu, 2 * Z));
}

function forward$r(p) {
  var Ce = adjust_lon(p.x - this.long0);
  var Cn = p.y;

  Cn = gatg(this.cbg, Cn);
  var sin_Cn = Math.sin(Cn);
  var cos_Cn = Math.cos(Cn);
  var sin_Ce = Math.sin(Ce);
  var cos_Ce = Math.cos(Ce);

  Cn = Math.atan2(sin_Cn, cos_Ce * cos_Cn);
  Ce = Math.atan2(sin_Ce * cos_Cn, hypot(sin_Cn, cos_Cn * cos_Ce));
  Ce = asinhy(Math.tan(Ce));

  var tmp = clens_cmplx(this.gtu, 2 * Cn, 2 * Ce);

  Cn = Cn + tmp[0];
  Ce = Ce + tmp[1];

  var x;
  var y;

  if (Math.abs(Ce) <= 2.623395162778) {
    x = this.a * (this.Qn * Ce) + this.x0;
    y = this.a * (this.Qn * Cn + this.Zb) + this.y0;
  }
  else {
    x = Infinity;
    y = Infinity;
  }

  p.x = x;
  p.y = y;

  return p;
}

function inverse$r(p) {
  var Ce = (p.x - this.x0) * (1 / this.a);
  var Cn = (p.y - this.y0) * (1 / this.a);

  Cn = (Cn - this.Zb) / this.Qn;
  Ce = Ce / this.Qn;

  var lon;
  var lat;

  if (Math.abs(Ce) <= 2.623395162778) {
    var tmp = clens_cmplx(this.utg, 2 * Cn, 2 * Ce);

    Cn = Cn + tmp[0];
    Ce = Ce + tmp[1];
    Ce = Math.atan(sinh(Ce));

    var sin_Cn = Math.sin(Cn);
    var cos_Cn = Math.cos(Cn);
    var sin_Ce = Math.sin(Ce);
    var cos_Ce = Math.cos(Ce);

    Cn = Math.atan2(sin_Cn * cos_Ce, hypot(sin_Ce, cos_Ce * cos_Cn));
    Ce = Math.atan2(sin_Ce, cos_Ce * cos_Cn);

    lon = adjust_lon(Ce + this.long0);
    lat = gatg(this.cgb, Cn);
  }
  else {
    lon = Infinity;
    lat = Infinity;
  }

  p.x = lon;
  p.y = lat;

  return p;
}

var names$s = ["Extended_Transverse_Mercator", "Extended Transverse Mercator", "etmerc", "Transverse_Mercator", "Transverse Mercator", "tmerc"];
var etmerc = {
  init: init$s,
  forward: forward$r,
  inverse: inverse$r,
  names: names$s
};

function adjust_zone(zone, lon) {
  if (zone === undefined) {
    zone = Math.floor((adjust_lon(lon) + Math.PI) * 30 / Math.PI) + 1;

    if (zone < 0) {
      return 0;
    } else if (zone > 60) {
      return 60;
    }
  }
  return zone;
}

var dependsOn = 'etmerc';


function init$r() {
  var zone = adjust_zone(this.zone, this.long0);
  if (zone === undefined) {
    throw new Error('unknown utm zone');
  }
  this.lat0 = 0;
  this.long0 =  ((6 * Math.abs(zone)) - 183) * D2R$1;
  this.x0 = 500000;
  this.y0 = this.utmSouth ? 10000000 : 0;
  this.k0 = 0.9996;

  etmerc.init.apply(this);
  this.forward = etmerc.forward;
  this.inverse = etmerc.inverse;
}

var names$r = ["Universal Transverse Mercator System", "utm"];
var utm = {
  init: init$r,
  names: names$r,
  dependsOn: dependsOn
};

function srat(esinp, exp) {
  return (Math.pow((1 - esinp) / (1 + esinp), exp));
}

var MAX_ITER$2 = 20;

function init$q() {
  var sphi = Math.sin(this.lat0);
  var cphi = Math.cos(this.lat0);
  cphi *= cphi;
  this.rc = Math.sqrt(1 - this.es) / (1 - this.es * sphi * sphi);
  this.C = Math.sqrt(1 + this.es * cphi * cphi / (1 - this.es));
  this.phic0 = Math.asin(sphi / this.C);
  this.ratexp = 0.5 * this.C * this.e;
  this.K = Math.tan(0.5 * this.phic0 + FORTPI) / (Math.pow(Math.tan(0.5 * this.lat0 + FORTPI), this.C) * srat(this.e * sphi, this.ratexp));
}

function forward$q(p) {
  var lon = p.x;
  var lat = p.y;

  p.y = 2 * Math.atan(this.K * Math.pow(Math.tan(0.5 * lat + FORTPI), this.C) * srat(this.e * Math.sin(lat), this.ratexp)) - HALF_PI;
  p.x = this.C * lon;
  return p;
}

function inverse$q(p) {
  var DEL_TOL = 1e-14;
  var lon = p.x / this.C;
  var lat = p.y;
  var num = Math.pow(Math.tan(0.5 * lat + FORTPI) / this.K, 1 / this.C);
  for (var i = MAX_ITER$2; i > 0; --i) {
    lat = 2 * Math.atan(num * srat(this.e * Math.sin(p.y), - 0.5 * this.e)) - HALF_PI;
    if (Math.abs(lat - p.y) < DEL_TOL) {
      break;
    }
    p.y = lat;
  }
  /* convergence failed */
  if (!i) {
    return null;
  }
  p.x = lon;
  p.y = lat;
  return p;
}

var names$q = ["gauss"];
var gauss = {
  init: init$q,
  forward: forward$q,
  inverse: inverse$q,
  names: names$q
};

function init$p() {
  gauss.init.apply(this);
  if (!this.rc) {
    return;
  }
  this.sinc0 = Math.sin(this.phic0);
  this.cosc0 = Math.cos(this.phic0);
  this.R2 = 2 * this.rc;
  if (!this.title) {
    this.title = "Oblique Stereographic Alternative";
  }
}

function forward$p(p) {
  var sinc, cosc, cosl, k;
  p.x = adjust_lon(p.x - this.long0);
  gauss.forward.apply(this, [p]);
  sinc = Math.sin(p.y);
  cosc = Math.cos(p.y);
  cosl = Math.cos(p.x);
  k = this.k0 * this.R2 / (1 + this.sinc0 * sinc + this.cosc0 * cosc * cosl);
  p.x = k * cosc * Math.sin(p.x);
  p.y = k * (this.cosc0 * sinc - this.sinc0 * cosc * cosl);
  p.x = this.a * p.x + this.x0;
  p.y = this.a * p.y + this.y0;
  return p;
}

function inverse$p(p) {
  var sinc, cosc, lon, lat, rho;
  p.x = (p.x - this.x0) / this.a;
  p.y = (p.y - this.y0) / this.a;

  p.x /= this.k0;
  p.y /= this.k0;
  if ((rho = Math.sqrt(p.x * p.x + p.y * p.y))) {
    var c = 2 * Math.atan2(rho, this.R2);
    sinc = Math.sin(c);
    cosc = Math.cos(c);
    lat = Math.asin(cosc * this.sinc0 + p.y * sinc * this.cosc0 / rho);
    lon = Math.atan2(p.x * sinc, rho * this.cosc0 * cosc - p.y * this.sinc0 * sinc);
  }
  else {
    lat = this.phic0;
    lon = 0;
  }

  p.x = lon;
  p.y = lat;
  gauss.inverse.apply(this, [p]);
  p.x = adjust_lon(p.x + this.long0);
  return p;
}

var names$p = ["Stereographic_North_Pole", "Oblique_Stereographic", "Polar_Stereographic", "sterea","Oblique Stereographic Alternative","Double_Stereographic"];
var sterea = {
  init: init$p,
  forward: forward$p,
  inverse: inverse$p,
  names: names$p
};

function ssfn_(phit, sinphi, eccen) {
  sinphi *= eccen;
  return (Math.tan(0.5 * (HALF_PI + phit)) * Math.pow((1 - sinphi) / (1 + sinphi), 0.5 * eccen));
}

function init$o() {
  this.coslat0 = Math.cos(this.lat0);
  this.sinlat0 = Math.sin(this.lat0);
  if (this.sphere) {
    if (this.k0 === 1 && !isNaN(this.lat_ts) && Math.abs(this.coslat0) <= EPSLN) {
      this.k0 = 0.5 * (1 + sign(this.lat0) * Math.sin(this.lat_ts));
    }
  }
  else {
    if (Math.abs(this.coslat0) <= EPSLN) {
      if (this.lat0 > 0) {
        //North pole
        //trace('stere:north pole');
        this.con = 1;
      }
      else {
        //South pole
        //trace('stere:south pole');
        this.con = -1;
      }
    }
    this.cons = Math.sqrt(Math.pow(1 + this.e, 1 + this.e) * Math.pow(1 - this.e, 1 - this.e));
    if (this.k0 === 1 && !isNaN(this.lat_ts) && Math.abs(this.coslat0) <= EPSLN) {
      this.k0 = 0.5 * this.cons * msfnz(this.e, Math.sin(this.lat_ts), Math.cos(this.lat_ts)) / tsfnz(this.e, this.con * this.lat_ts, this.con * Math.sin(this.lat_ts));
    }
    this.ms1 = msfnz(this.e, this.sinlat0, this.coslat0);
    this.X0 = 2 * Math.atan(this.ssfn_(this.lat0, this.sinlat0, this.e)) - HALF_PI;
    this.cosX0 = Math.cos(this.X0);
    this.sinX0 = Math.sin(this.X0);
  }
}

// Stereographic forward equations--mapping lat,long to x,y
function forward$o(p) {
  var lon = p.x;
  var lat = p.y;
  var sinlat = Math.sin(lat);
  var coslat = Math.cos(lat);
  var A, X, sinX, cosX, ts, rh;
  var dlon = adjust_lon(lon - this.long0);

  if (Math.abs(Math.abs(lon - this.long0) - Math.PI) <= EPSLN && Math.abs(lat + this.lat0) <= EPSLN) {
    //case of the origine point
    //trace('stere:this is the origin point');
    p.x = NaN;
    p.y = NaN;
    return p;
  }
  if (this.sphere) {
    //trace('stere:sphere case');
    A = 2 * this.k0 / (1 + this.sinlat0 * sinlat + this.coslat0 * coslat * Math.cos(dlon));
    p.x = this.a * A * coslat * Math.sin(dlon) + this.x0;
    p.y = this.a * A * (this.coslat0 * sinlat - this.sinlat0 * coslat * Math.cos(dlon)) + this.y0;
    return p;
  }
  else {
    X = 2 * Math.atan(this.ssfn_(lat, sinlat, this.e)) - HALF_PI;
    cosX = Math.cos(X);
    sinX = Math.sin(X);
    if (Math.abs(this.coslat0) <= EPSLN) {
      ts = tsfnz(this.e, lat * this.con, this.con * sinlat);
      rh = 2 * this.a * this.k0 * ts / this.cons;
      p.x = this.x0 + rh * Math.sin(lon - this.long0);
      p.y = this.y0 - this.con * rh * Math.cos(lon - this.long0);
      //trace(p.toString());
      return p;
    }
    else if (Math.abs(this.sinlat0) < EPSLN) {
      //Eq
      //trace('stere:equateur');
      A = 2 * this.a * this.k0 / (1 + cosX * Math.cos(dlon));
      p.y = A * sinX;
    }
    else {
      //other case
      //trace('stere:normal case');
      A = 2 * this.a * this.k0 * this.ms1 / (this.cosX0 * (1 + this.sinX0 * sinX + this.cosX0 * cosX * Math.cos(dlon)));
      p.y = A * (this.cosX0 * sinX - this.sinX0 * cosX * Math.cos(dlon)) + this.y0;
    }
    p.x = A * cosX * Math.sin(dlon) + this.x0;
  }
  //trace(p.toString());
  return p;
}

//* Stereographic inverse equations--mapping x,y to lat/long
function inverse$o(p) {
  p.x -= this.x0;
  p.y -= this.y0;
  var lon, lat, ts, ce, Chi;
  var rh = Math.sqrt(p.x * p.x + p.y * p.y);
  if (this.sphere) {
    var c = 2 * Math.atan(rh / (2 * this.a * this.k0));
    lon = this.long0;
    lat = this.lat0;
    if (rh <= EPSLN) {
      p.x = lon;
      p.y = lat;
      return p;
    }
    lat = Math.asin(Math.cos(c) * this.sinlat0 + p.y * Math.sin(c) * this.coslat0 / rh);
    if (Math.abs(this.coslat0) < EPSLN) {
      if (this.lat0 > 0) {
        lon = adjust_lon(this.long0 + Math.atan2(p.x, - 1 * p.y));
      }
      else {
        lon = adjust_lon(this.long0 + Math.atan2(p.x, p.y));
      }
    }
    else {
      lon = adjust_lon(this.long0 + Math.atan2(p.x * Math.sin(c), rh * this.coslat0 * Math.cos(c) - p.y * this.sinlat0 * Math.sin(c)));
    }
    p.x = lon;
    p.y = lat;
    return p;
  }
  else {
    if (Math.abs(this.coslat0) <= EPSLN) {
      if (rh <= EPSLN) {
        lat = this.lat0;
        lon = this.long0;
        p.x = lon;
        p.y = lat;
        //trace(p.toString());
        return p;
      }
      p.x *= this.con;
      p.y *= this.con;
      ts = rh * this.cons / (2 * this.a * this.k0);
      lat = this.con * phi2z(this.e, ts);
      lon = this.con * adjust_lon(this.con * this.long0 + Math.atan2(p.x, - 1 * p.y));
    }
    else {
      ce = 2 * Math.atan(rh * this.cosX0 / (2 * this.a * this.k0 * this.ms1));
      lon = this.long0;
      if (rh <= EPSLN) {
        Chi = this.X0;
      }
      else {
        Chi = Math.asin(Math.cos(ce) * this.sinX0 + p.y * Math.sin(ce) * this.cosX0 / rh);
        lon = adjust_lon(this.long0 + Math.atan2(p.x * Math.sin(ce), rh * this.cosX0 * Math.cos(ce) - p.y * this.sinX0 * Math.sin(ce)));
      }
      lat = -1 * phi2z(this.e, Math.tan(0.5 * (HALF_PI + Chi)));
    }
  }
  p.x = lon;
  p.y = lat;

  //trace(p.toString());
  return p;

}

var names$o = ["stere", "Stereographic_South_Pole", "Polar Stereographic (variant B)"];
var stere = {
  init: init$o,
  forward: forward$o,
  inverse: inverse$o,
  names: names$o,
  ssfn_: ssfn_
};

/*
  references:
    Formules et constantes pour le Calcul pour la
    projection cylindrique conforme à axe oblique et pour la transformation entre
    des systèmes de référence.
    http://www.swisstopo.admin.ch/internet/swisstopo/fr/home/topics/survey/sys/refsys/switzerland.parsysrelated1.31216.downloadList.77004.DownloadFile.tmp/swissprojectionfr.pdf
  */

function init$n() {
  var phy0 = this.lat0;
  this.lambda0 = this.long0;
  var sinPhy0 = Math.sin(phy0);
  var semiMajorAxis = this.a;
  var invF = this.rf;
  var flattening = 1 / invF;
  var e2 = 2 * flattening - Math.pow(flattening, 2);
  var e = this.e = Math.sqrt(e2);
  this.R = this.k0 * semiMajorAxis * Math.sqrt(1 - e2) / (1 - e2 * Math.pow(sinPhy0, 2));
  this.alpha = Math.sqrt(1 + e2 / (1 - e2) * Math.pow(Math.cos(phy0), 4));
  this.b0 = Math.asin(sinPhy0 / this.alpha);
  var k1 = Math.log(Math.tan(Math.PI / 4 + this.b0 / 2));
  var k2 = Math.log(Math.tan(Math.PI / 4 + phy0 / 2));
  var k3 = Math.log((1 + e * sinPhy0) / (1 - e * sinPhy0));
  this.K = k1 - this.alpha * k2 + this.alpha * e / 2 * k3;
}

function forward$n(p) {
  var Sa1 = Math.log(Math.tan(Math.PI / 4 - p.y / 2));
  var Sa2 = this.e / 2 * Math.log((1 + this.e * Math.sin(p.y)) / (1 - this.e * Math.sin(p.y)));
  var S = -this.alpha * (Sa1 + Sa2) + this.K;

  // spheric latitude
  var b = 2 * (Math.atan(Math.exp(S)) - Math.PI / 4);

  // spheric longitude
  var I = this.alpha * (p.x - this.lambda0);

  // psoeudo equatorial rotation
  var rotI = Math.atan(Math.sin(I) / (Math.sin(this.b0) * Math.tan(b) + Math.cos(this.b0) * Math.cos(I)));

  var rotB = Math.asin(Math.cos(this.b0) * Math.sin(b) - Math.sin(this.b0) * Math.cos(b) * Math.cos(I));

  p.y = this.R / 2 * Math.log((1 + Math.sin(rotB)) / (1 - Math.sin(rotB))) + this.y0;
  p.x = this.R * rotI + this.x0;
  return p;
}

function inverse$n(p) {
  var Y = p.x - this.x0;
  var X = p.y - this.y0;

  var rotI = Y / this.R;
  var rotB = 2 * (Math.atan(Math.exp(X / this.R)) - Math.PI / 4);

  var b = Math.asin(Math.cos(this.b0) * Math.sin(rotB) + Math.sin(this.b0) * Math.cos(rotB) * Math.cos(rotI));
  var I = Math.atan(Math.sin(rotI) / (Math.cos(this.b0) * Math.cos(rotI) - Math.sin(this.b0) * Math.tan(rotB)));

  var lambda = this.lambda0 + I / this.alpha;

  var S = 0;
  var phy = b;
  var prevPhy = -1000;
  var iteration = 0;
  while (Math.abs(phy - prevPhy) > 0.0000001) {
    if (++iteration > 20) {
      //...reportError("omercFwdInfinity");
      return;
    }
    //S = Math.log(Math.tan(Math.PI / 4 + phy / 2));
    S = 1 / this.alpha * (Math.log(Math.tan(Math.PI / 4 + b / 2)) - this.K) + this.e * Math.log(Math.tan(Math.PI / 4 + Math.asin(this.e * Math.sin(phy)) / 2));
    prevPhy = phy;
    phy = 2 * Math.atan(Math.exp(S)) - Math.PI / 2;
  }

  p.x = lambda;
  p.y = phy;
  return p;
}

var names$n = ["somerc"];
var somerc = {
  init: init$n,
  forward: forward$n,
  inverse: inverse$n,
  names: names$n
};

var TOL = 1e-7;

function isTypeA(P) {
  var typeAProjections = ['Hotine_Oblique_Mercator','Hotine_Oblique_Mercator_Azimuth_Natural_Origin'];
  var projectionName = typeof P.PROJECTION === "object" ? Object.keys(P.PROJECTION)[0] : P.PROJECTION;
  
  return 'no_uoff' in P || 'no_off' in P || typeAProjections.indexOf(projectionName) !== -1;
}


/* Initialize the Oblique Mercator  projection
    ------------------------------------------*/
function init$m() {  
  var con, com, cosph0, D, F, H, L, sinph0, p, J, gamma = 0,
    gamma0, lamc = 0, lam1 = 0, lam2 = 0, phi1 = 0, phi2 = 0, alpha_c = 0;
  
  // only Type A uses the no_off or no_uoff property
  // https://github.com/OSGeo/proj.4/issues/104
  this.no_off = isTypeA(this);
  this.no_rot = 'no_rot' in this;
  
  var alp = false;
  if ("alpha" in this) {
    alp = true;
  }

  var gam = false;
  if ("rectified_grid_angle" in this) {
    gam = true;
  }

  if (alp) {
    alpha_c = this.alpha;
  }
  
  if (gam) {
    gamma = (this.rectified_grid_angle * D2R$1);
  }
  
  if (alp || gam) {
    lamc = this.longc;
  } else {
    lam1 = this.long1;
    phi1 = this.lat1;
    lam2 = this.long2;
    phi2 = this.lat2;
    
    if (Math.abs(phi1 - phi2) <= TOL || (con = Math.abs(phi1)) <= TOL ||
        Math.abs(con - HALF_PI) <= TOL || Math.abs(Math.abs(this.lat0) - HALF_PI) <= TOL ||
        Math.abs(Math.abs(phi2) - HALF_PI) <= TOL) {
      throw new Error();
    }
  }
  
  var one_es = 1.0 - this.es;
  com = Math.sqrt(one_es);
  
  if (Math.abs(this.lat0) > EPSLN) {
    sinph0 = Math.sin(this.lat0);
    cosph0 = Math.cos(this.lat0);
    con = 1 - this.es * sinph0 * sinph0;
    this.B = cosph0 * cosph0;
    this.B = Math.sqrt(1 + this.es * this.B * this.B / one_es);
    this.A = this.B * this.k0 * com / con;
    D = this.B * com / (cosph0 * Math.sqrt(con));
    F = D * D -1;
    
    if (F <= 0) {
      F = 0;
    } else {
      F = Math.sqrt(F);
      if (this.lat0 < 0) {
        F = -F;
      }
    }
    
    this.E = F += D;
    this.E *= Math.pow(tsfnz(this.e, this.lat0, sinph0), this.B);
  } else {
    this.B = 1 / com;
    this.A = this.k0;
    this.E = D = F = 1;
  }
  
  if (alp || gam) {
    if (alp) {
      gamma0 = Math.asin(Math.sin(alpha_c) / D);
      if (!gam) {
        gamma = alpha_c;
      }
    } else {
      gamma0 = gamma;
      alpha_c = Math.asin(D * Math.sin(gamma0));
    }
    this.lam0 = lamc - Math.asin(0.5 * (F - 1 / F) * Math.tan(gamma0)) / this.B;
  } else {
    H = Math.pow(tsfnz(this.e, phi1, Math.sin(phi1)), this.B);
    L = Math.pow(tsfnz(this.e, phi2, Math.sin(phi2)), this.B);
    F = this.E / H;
    p = (L - H) / (L + H);
    J = this.E * this.E;
    J = (J - L * H) / (J + L * H);
    con = lam1 - lam2;
    
    if (con < -Math.pi) {
      lam2 -=TWO_PI;
    } else if (con > Math.pi) {
      lam2 += TWO_PI;
    }
    
    this.lam0 = adjust_lon(0.5 * (lam1 + lam2) - Math.atan(J * Math.tan(0.5 * this.B * (lam1 - lam2)) / p) / this.B);
    gamma0 = Math.atan(2 * Math.sin(this.B * adjust_lon(lam1 - this.lam0)) / (F - 1 / F));
    gamma = alpha_c = Math.asin(D * Math.sin(gamma0));
  }
  
  this.singam = Math.sin(gamma0);
  this.cosgam = Math.cos(gamma0);
  this.sinrot = Math.sin(gamma);
  this.cosrot = Math.cos(gamma);
  
  this.rB = 1 / this.B;
  this.ArB = this.A * this.rB;
  this.BrA = 1 / this.ArB;
  this.A * this.B;
  
  if (this.no_off) {
    this.u_0 = 0;
  } else {
    this.u_0 = Math.abs(this.ArB * Math.atan(Math.sqrt(D * D - 1) / Math.cos(alpha_c)));
    
    if (this.lat0 < 0) {
      this.u_0 = - this.u_0;
    }  
  }
    
  F = 0.5 * gamma0;
  this.v_pole_n = this.ArB * Math.log(Math.tan(FORTPI - F));
  this.v_pole_s = this.ArB * Math.log(Math.tan(FORTPI + F));
}


/* Oblique Mercator forward equations--mapping lat,long to x,y
    ----------------------------------------------------------*/
function forward$m(p) {
  var coords = {};
  var S, T, U, V, W, temp, u, v;
  p.x = p.x - this.lam0;
  
  if (Math.abs(Math.abs(p.y) - HALF_PI) > EPSLN) {
    W = this.E / Math.pow(tsfnz(this.e, p.y, Math.sin(p.y)), this.B);
    
    temp = 1 / W;
    S = 0.5 * (W - temp);
    T = 0.5 * (W + temp);
    V = Math.sin(this.B * p.x);
    U = (S * this.singam - V * this.cosgam) / T;
        
    if (Math.abs(Math.abs(U) - 1.0) < EPSLN) {
      throw new Error();
    }
    
    v = 0.5 * this.ArB * Math.log((1 - U)/(1 + U));
    temp = Math.cos(this.B * p.x);
    
    if (Math.abs(temp) < TOL) {
      u = this.A * p.x;
    } else {
      u = this.ArB * Math.atan2((S * this.cosgam + V * this.singam), temp);
    }    
  } else {
    v = p.y > 0 ? this.v_pole_n : this.v_pole_s;
    u = this.ArB * p.y;
  }
     
  if (this.no_rot) {
    coords.x = u;
    coords.y = v;
  } else {
    u -= this.u_0;
    coords.x = v * this.cosrot + u * this.sinrot;
    coords.y = u * this.cosrot - v * this.sinrot;
  }
  
  coords.x = (this.a * coords.x + this.x0);
  coords.y = (this.a * coords.y + this.y0);
  
  return coords;
}

function inverse$m(p) {
  var u, v, Qp, Sp, Tp, Vp, Up;
  var coords = {};
  
  p.x = (p.x - this.x0) * (1.0 / this.a);
  p.y = (p.y - this.y0) * (1.0 / this.a);

  if (this.no_rot) {
    v = p.y;
    u = p.x;
  } else {
    v = p.x * this.cosrot - p.y * this.sinrot;
    u = p.y * this.cosrot + p.x * this.sinrot + this.u_0;
  }
  
  Qp = Math.exp(-this.BrA * v);
  Sp = 0.5 * (Qp - 1 / Qp);
  Tp = 0.5 * (Qp + 1 / Qp);
  Vp = Math.sin(this.BrA * u);
  Up = (Vp * this.cosgam + Sp * this.singam) / Tp;
  
  if (Math.abs(Math.abs(Up) - 1) < EPSLN) {
    coords.x = 0;
    coords.y = Up < 0 ? -HALF_PI : HALF_PI;
  } else {
    coords.y = this.E / Math.sqrt((1 + Up) / (1 - Up));
    coords.y = phi2z(this.e, Math.pow(coords.y, 1 / this.B));
    
    if (coords.y === Infinity) {
      throw new Error();
    }
        
    coords.x = -this.rB * Math.atan2((Sp * this.cosgam - Vp * this.singam), Math.cos(this.BrA * u));
  }
  
  coords.x += this.lam0;
  
  return coords;
}

var names$m = ["Hotine_Oblique_Mercator", "Hotine Oblique Mercator", "Hotine_Oblique_Mercator_Azimuth_Natural_Origin", "Hotine_Oblique_Mercator_Two_Point_Natural_Origin", "Hotine_Oblique_Mercator_Azimuth_Center", "Oblique_Mercator", "omerc"];
var omerc = {
  init: init$m,
  forward: forward$m,
  inverse: inverse$m,
  names: names$m
};

function init$l() {
  
  //double lat0;                    /* the reference latitude               */
  //double long0;                   /* the reference longitude              */
  //double lat1;                    /* first standard parallel              */
  //double lat2;                    /* second standard parallel             */
  //double r_maj;                   /* major axis                           */
  //double r_min;                   /* minor axis                           */
  //double false_east;              /* x offset in meters                   */
  //double false_north;             /* y offset in meters                   */
  
  //the above value can be set with proj4.defs
  //example: proj4.defs("EPSG:2154","+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");

  if (!this.lat2) {
    this.lat2 = this.lat1;
  } //if lat2 is not defined
  if (!this.k0) {
    this.k0 = 1;
  }
  this.x0 = this.x0 || 0;
  this.y0 = this.y0 || 0;
  // Standard Parallels cannot be equal and on opposite sides of the equator
  if (Math.abs(this.lat1 + this.lat2) < EPSLN) {
    return;
  }

  var temp = this.b / this.a;
  this.e = Math.sqrt(1 - temp * temp);

  var sin1 = Math.sin(this.lat1);
  var cos1 = Math.cos(this.lat1);
  var ms1 = msfnz(this.e, sin1, cos1);
  var ts1 = tsfnz(this.e, this.lat1, sin1);

  var sin2 = Math.sin(this.lat2);
  var cos2 = Math.cos(this.lat2);
  var ms2 = msfnz(this.e, sin2, cos2);
  var ts2 = tsfnz(this.e, this.lat2, sin2);

  var ts0 = tsfnz(this.e, this.lat0, Math.sin(this.lat0));

  if (Math.abs(this.lat1 - this.lat2) > EPSLN) {
    this.ns = Math.log(ms1 / ms2) / Math.log(ts1 / ts2);
  }
  else {
    this.ns = sin1;
  }
  if (isNaN(this.ns)) {
    this.ns = sin1;
  }
  this.f0 = ms1 / (this.ns * Math.pow(ts1, this.ns));
  this.rh = this.a * this.f0 * Math.pow(ts0, this.ns);
  if (!this.title) {
    this.title = "Lambert Conformal Conic";
  }
}

// Lambert Conformal conic forward equations--mapping lat,long to x,y
// -----------------------------------------------------------------
function forward$l(p) {

  var lon = p.x;
  var lat = p.y;

  // singular cases :
  if (Math.abs(2 * Math.abs(lat) - Math.PI) <= EPSLN) {
    lat = sign(lat) * (HALF_PI - 2 * EPSLN);
  }

  var con = Math.abs(Math.abs(lat) - HALF_PI);
  var ts, rh1;
  if (con > EPSLN) {
    ts = tsfnz(this.e, lat, Math.sin(lat));
    rh1 = this.a * this.f0 * Math.pow(ts, this.ns);
  }
  else {
    con = lat * this.ns;
    if (con <= 0) {
      return null;
    }
    rh1 = 0;
  }
  var theta = this.ns * adjust_lon(lon - this.long0);
  p.x = this.k0 * (rh1 * Math.sin(theta)) + this.x0;
  p.y = this.k0 * (this.rh - rh1 * Math.cos(theta)) + this.y0;

  return p;
}

// Lambert Conformal Conic inverse equations--mapping x,y to lat/long
// -----------------------------------------------------------------
function inverse$l(p) {

  var rh1, con, ts;
  var lat, lon;
  var x = (p.x - this.x0) / this.k0;
  var y = (this.rh - (p.y - this.y0) / this.k0);
  if (this.ns > 0) {
    rh1 = Math.sqrt(x * x + y * y);
    con = 1;
  }
  else {
    rh1 = -Math.sqrt(x * x + y * y);
    con = -1;
  }
  var theta = 0;
  if (rh1 !== 0) {
    theta = Math.atan2((con * x), (con * y));
  }
  if ((rh1 !== 0) || (this.ns > 0)) {
    con = 1 / this.ns;
    ts = Math.pow((rh1 / (this.a * this.f0)), con);
    lat = phi2z(this.e, ts);
    if (lat === -9999) {
      return null;
    }
  }
  else {
    lat = -HALF_PI;
  }
  lon = adjust_lon(theta / this.ns + this.long0);

  p.x = lon;
  p.y = lat;
  return p;
}

var names$l = [
  "Lambert Tangential Conformal Conic Projection",
  "Lambert_Conformal_Conic",
  "Lambert_Conformal_Conic_1SP",
  "Lambert_Conformal_Conic_2SP",
  "lcc",
  "Lambert Conic Conformal (1SP)",
  "Lambert Conic Conformal (2SP)"
];

var lcc = {
  init: init$l,
  forward: forward$l,
  inverse: inverse$l,
  names: names$l
};

function init$k() {
  this.a = 6377397.155;
  this.es = 0.006674372230614;
  this.e = Math.sqrt(this.es);
  if (!this.lat0) {
    this.lat0 = 0.863937979737193;
  }
  if (!this.long0) {
    this.long0 = 0.7417649320975901 - 0.308341501185665;
  }
  /* if scale not set default to 0.9999 */
  if (!this.k0) {
    this.k0 = 0.9999;
  }
  this.s45 = 0.785398163397448; /* 45 */
  this.s90 = 2 * this.s45;
  this.fi0 = this.lat0;
  this.e2 = this.es;
  this.e = Math.sqrt(this.e2);
  this.alfa = Math.sqrt(1 + (this.e2 * Math.pow(Math.cos(this.fi0), 4)) / (1 - this.e2));
  this.uq = 1.04216856380474;
  this.u0 = Math.asin(Math.sin(this.fi0) / this.alfa);
  this.g = Math.pow((1 + this.e * Math.sin(this.fi0)) / (1 - this.e * Math.sin(this.fi0)), this.alfa * this.e / 2);
  this.k = Math.tan(this.u0 / 2 + this.s45) / Math.pow(Math.tan(this.fi0 / 2 + this.s45), this.alfa) * this.g;
  this.k1 = this.k0;
  this.n0 = this.a * Math.sqrt(1 - this.e2) / (1 - this.e2 * Math.pow(Math.sin(this.fi0), 2));
  this.s0 = 1.37008346281555;
  this.n = Math.sin(this.s0);
  this.ro0 = this.k1 * this.n0 / Math.tan(this.s0);
  this.ad = this.s90 - this.uq;
}

/* ellipsoid */
/* calculate xy from lat/lon */
/* Constants, identical to inverse transform function */
function forward$k(p) {
  var gfi, u, deltav, s, d, eps, ro;
  var lon = p.x;
  var lat = p.y;
  var delta_lon = adjust_lon(lon - this.long0);
  /* Transformation */
  gfi = Math.pow(((1 + this.e * Math.sin(lat)) / (1 - this.e * Math.sin(lat))), (this.alfa * this.e / 2));
  u = 2 * (Math.atan(this.k * Math.pow(Math.tan(lat / 2 + this.s45), this.alfa) / gfi) - this.s45);
  deltav = -delta_lon * this.alfa;
  s = Math.asin(Math.cos(this.ad) * Math.sin(u) + Math.sin(this.ad) * Math.cos(u) * Math.cos(deltav));
  d = Math.asin(Math.cos(u) * Math.sin(deltav) / Math.cos(s));
  eps = this.n * d;
  ro = this.ro0 * Math.pow(Math.tan(this.s0 / 2 + this.s45), this.n) / Math.pow(Math.tan(s / 2 + this.s45), this.n);
  p.y = ro * Math.cos(eps) / 1;
  p.x = ro * Math.sin(eps) / 1;

  if (!this.czech) {
    p.y *= -1;
    p.x *= -1;
  }
  return (p);
}

/* calculate lat/lon from xy */
function inverse$k(p) {
  var u, deltav, s, d, eps, ro, fi1;
  var ok;

  /* Transformation */
  /* revert y, x*/
  var tmp = p.x;
  p.x = p.y;
  p.y = tmp;
  if (!this.czech) {
    p.y *= -1;
    p.x *= -1;
  }
  ro = Math.sqrt(p.x * p.x + p.y * p.y);
  eps = Math.atan2(p.y, p.x);
  d = eps / Math.sin(this.s0);
  s = 2 * (Math.atan(Math.pow(this.ro0 / ro, 1 / this.n) * Math.tan(this.s0 / 2 + this.s45)) - this.s45);
  u = Math.asin(Math.cos(this.ad) * Math.sin(s) - Math.sin(this.ad) * Math.cos(s) * Math.cos(d));
  deltav = Math.asin(Math.cos(s) * Math.sin(d) / Math.cos(u));
  p.x = this.long0 - deltav / this.alfa;
  fi1 = u;
  ok = 0;
  var iter = 0;
  do {
    p.y = 2 * (Math.atan(Math.pow(this.k, - 1 / this.alfa) * Math.pow(Math.tan(u / 2 + this.s45), 1 / this.alfa) * Math.pow((1 + this.e * Math.sin(fi1)) / (1 - this.e * Math.sin(fi1)), this.e / 2)) - this.s45);
    if (Math.abs(fi1 - p.y) < 0.0000000001) {
      ok = 1;
    }
    fi1 = p.y;
    iter += 1;
  } while (ok === 0 && iter < 15);
  if (iter >= 15) {
    return null;
  }

  return (p);
}

var names$k = ["Krovak", "krovak"];
var krovak = {
  init: init$k,
  forward: forward$k,
  inverse: inverse$k,
  names: names$k
};

function mlfn(e0, e1, e2, e3, phi) {
  return (e0 * phi - e1 * Math.sin(2 * phi) + e2 * Math.sin(4 * phi) - e3 * Math.sin(6 * phi));
}

function e0fn(x) {
  return (1 - 0.25 * x * (1 + x / 16 * (3 + 1.25 * x)));
}

function e1fn(x) {
  return (0.375 * x * (1 + 0.25 * x * (1 + 0.46875 * x)));
}

function e2fn(x) {
  return (0.05859375 * x * x * (1 + 0.75 * x));
}

function e3fn(x) {
  return (x * x * x * (35 / 3072));
}

function gN(a, e, sinphi) {
  var temp = e * sinphi;
  return a / Math.sqrt(1 - temp * temp);
}

function adjust_lat(x) {
  return (Math.abs(x) < HALF_PI) ? x : (x - (sign(x) * Math.PI));
}

function imlfn(ml, e0, e1, e2, e3) {
  var phi;
  var dphi;

  phi = ml / e0;
  for (var i = 0; i < 15; i++) {
    dphi = (ml - (e0 * phi - e1 * Math.sin(2 * phi) + e2 * Math.sin(4 * phi) - e3 * Math.sin(6 * phi))) / (e0 - 2 * e1 * Math.cos(2 * phi) + 4 * e2 * Math.cos(4 * phi) - 6 * e3 * Math.cos(6 * phi));
    phi += dphi;
    if (Math.abs(dphi) <= 0.0000000001) {
      return phi;
    }
  }

  //..reportError("IMLFN-CONV:Latitude failed to converge after 15 iterations");
  return NaN;
}

function init$j() {
  if (!this.sphere) {
    this.e0 = e0fn(this.es);
    this.e1 = e1fn(this.es);
    this.e2 = e2fn(this.es);
    this.e3 = e3fn(this.es);
    this.ml0 = this.a * mlfn(this.e0, this.e1, this.e2, this.e3, this.lat0);
  }
}

/* Cassini forward equations--mapping lat,long to x,y
  -----------------------------------------------------------------------*/
function forward$j(p) {

  /* Forward equations
      -----------------*/
  var x, y;
  var lam = p.x;
  var phi = p.y;
  lam = adjust_lon(lam - this.long0);

  if (this.sphere) {
    x = this.a * Math.asin(Math.cos(phi) * Math.sin(lam));
    y = this.a * (Math.atan2(Math.tan(phi), Math.cos(lam)) - this.lat0);
  }
  else {
    //ellipsoid
    var sinphi = Math.sin(phi);
    var cosphi = Math.cos(phi);
    var nl = gN(this.a, this.e, sinphi);
    var tl = Math.tan(phi) * Math.tan(phi);
    var al = lam * Math.cos(phi);
    var asq = al * al;
    var cl = this.es * cosphi * cosphi / (1 - this.es);
    var ml = this.a * mlfn(this.e0, this.e1, this.e2, this.e3, phi);

    x = nl * al * (1 - asq * tl * (1 / 6 - (8 - tl + 8 * cl) * asq / 120));
    y = ml - this.ml0 + nl * sinphi / cosphi * asq * (0.5 + (5 - tl + 6 * cl) * asq / 24);


  }

  p.x = x + this.x0;
  p.y = y + this.y0;
  return p;
}

/* Inverse equations
  -----------------*/
function inverse$j(p) {
  p.x -= this.x0;
  p.y -= this.y0;
  var x = p.x / this.a;
  var y = p.y / this.a;
  var phi, lam;

  if (this.sphere) {
    var dd = y + this.lat0;
    phi = Math.asin(Math.sin(dd) * Math.cos(x));
    lam = Math.atan2(Math.tan(x), Math.cos(dd));
  }
  else {
    /* ellipsoid */
    var ml1 = this.ml0 / this.a + y;
    var phi1 = imlfn(ml1, this.e0, this.e1, this.e2, this.e3);
    if (Math.abs(Math.abs(phi1) - HALF_PI) <= EPSLN) {
      p.x = this.long0;
      p.y = HALF_PI;
      if (y < 0) {
        p.y *= -1;
      }
      return p;
    }
    var nl1 = gN(this.a, this.e, Math.sin(phi1));

    var rl1 = nl1 * nl1 * nl1 / this.a / this.a * (1 - this.es);
    var tl1 = Math.pow(Math.tan(phi1), 2);
    var dl = x * this.a / nl1;
    var dsq = dl * dl;
    phi = phi1 - nl1 * Math.tan(phi1) / rl1 * dl * dl * (0.5 - (1 + 3 * tl1) * dl * dl / 24);
    lam = dl * (1 - dsq * (tl1 / 3 + (1 + 3 * tl1) * tl1 * dsq / 15)) / Math.cos(phi1);

  }

  p.x = adjust_lon(lam + this.long0);
  p.y = adjust_lat(phi);
  return p;

}

var names$j = ["Cassini", "Cassini_Soldner", "cass"];
var cass = {
  init: init$j,
  forward: forward$j,
  inverse: inverse$j,
  names: names$j
};

function qsfnz(eccent, sinphi) {
  var con;
  if (eccent > 1.0e-7) {
    con = eccent * sinphi;
    return ((1 - eccent * eccent) * (sinphi / (1 - con * con) - (0.5 / eccent) * Math.log((1 - con) / (1 + con))));
  }
  else {
    return (2 * sinphi);
  }
}

/*
  reference
    "New Equal-Area Map Projections for Noncircular Regions", John P. Snyder,
    The American Cartographer, Vol 15, No. 4, October 1988, pp. 341-355.
  */

var S_POLE = 1;

var N_POLE = 2;
var EQUIT = 3;
var OBLIQ = 4;

/* Initialize the Lambert Azimuthal Equal Area projection
  ------------------------------------------------------*/
function init$i() {
  var t = Math.abs(this.lat0);
  if (Math.abs(t - HALF_PI) < EPSLN) {
    this.mode = this.lat0 < 0 ? this.S_POLE : this.N_POLE;
  }
  else if (Math.abs(t) < EPSLN) {
    this.mode = this.EQUIT;
  }
  else {
    this.mode = this.OBLIQ;
  }
  if (this.es > 0) {
    var sinphi;

    this.qp = qsfnz(this.e, 1);
    this.mmf = 0.5 / (1 - this.es);
    this.apa = authset(this.es);
    switch (this.mode) {
    case this.N_POLE:
      this.dd = 1;
      break;
    case this.S_POLE:
      this.dd = 1;
      break;
    case this.EQUIT:
      this.rq = Math.sqrt(0.5 * this.qp);
      this.dd = 1 / this.rq;
      this.xmf = 1;
      this.ymf = 0.5 * this.qp;
      break;
    case this.OBLIQ:
      this.rq = Math.sqrt(0.5 * this.qp);
      sinphi = Math.sin(this.lat0);
      this.sinb1 = qsfnz(this.e, sinphi) / this.qp;
      this.cosb1 = Math.sqrt(1 - this.sinb1 * this.sinb1);
      this.dd = Math.cos(this.lat0) / (Math.sqrt(1 - this.es * sinphi * sinphi) * this.rq * this.cosb1);
      this.ymf = (this.xmf = this.rq) / this.dd;
      this.xmf *= this.dd;
      break;
    }
  }
  else {
    if (this.mode === this.OBLIQ) {
      this.sinph0 = Math.sin(this.lat0);
      this.cosph0 = Math.cos(this.lat0);
    }
  }
}

/* Lambert Azimuthal Equal Area forward equations--mapping lat,long to x,y
  -----------------------------------------------------------------------*/
function forward$i(p) {

  /* Forward equations
      -----------------*/
  var x, y, coslam, sinlam, sinphi, q, sinb, cosb, b, cosphi;
  var lam = p.x;
  var phi = p.y;

  lam = adjust_lon(lam - this.long0);
  if (this.sphere) {
    sinphi = Math.sin(phi);
    cosphi = Math.cos(phi);
    coslam = Math.cos(lam);
    if (this.mode === this.OBLIQ || this.mode === this.EQUIT) {
      y = (this.mode === this.EQUIT) ? 1 + cosphi * coslam : 1 + this.sinph0 * sinphi + this.cosph0 * cosphi * coslam;
      if (y <= EPSLN) {
        return null;
      }
      y = Math.sqrt(2 / y);
      x = y * cosphi * Math.sin(lam);
      y *= (this.mode === this.EQUIT) ? sinphi : this.cosph0 * sinphi - this.sinph0 * cosphi * coslam;
    }
    else if (this.mode === this.N_POLE || this.mode === this.S_POLE) {
      if (this.mode === this.N_POLE) {
        coslam = -coslam;
      }
      if (Math.abs(phi + this.lat0) < EPSLN) {
        return null;
      }
      y = FORTPI - phi * 0.5;
      y = 2 * ((this.mode === this.S_POLE) ? Math.cos(y) : Math.sin(y));
      x = y * Math.sin(lam);
      y *= coslam;
    }
  }
  else {
    sinb = 0;
    cosb = 0;
    b = 0;
    coslam = Math.cos(lam);
    sinlam = Math.sin(lam);
    sinphi = Math.sin(phi);
    q = qsfnz(this.e, sinphi);
    if (this.mode === this.OBLIQ || this.mode === this.EQUIT) {
      sinb = q / this.qp;
      cosb = Math.sqrt(1 - sinb * sinb);
    }
    switch (this.mode) {
    case this.OBLIQ:
      b = 1 + this.sinb1 * sinb + this.cosb1 * cosb * coslam;
      break;
    case this.EQUIT:
      b = 1 + cosb * coslam;
      break;
    case this.N_POLE:
      b = HALF_PI + phi;
      q = this.qp - q;
      break;
    case this.S_POLE:
      b = phi - HALF_PI;
      q = this.qp + q;
      break;
    }
    if (Math.abs(b) < EPSLN) {
      return null;
    }
    switch (this.mode) {
    case this.OBLIQ:
    case this.EQUIT:
      b = Math.sqrt(2 / b);
      if (this.mode === this.OBLIQ) {
        y = this.ymf * b * (this.cosb1 * sinb - this.sinb1 * cosb * coslam);
      }
      else {
        y = (b = Math.sqrt(2 / (1 + cosb * coslam))) * sinb * this.ymf;
      }
      x = this.xmf * b * cosb * sinlam;
      break;
    case this.N_POLE:
    case this.S_POLE:
      if (q >= 0) {
        x = (b = Math.sqrt(q)) * sinlam;
        y = coslam * ((this.mode === this.S_POLE) ? b : -b);
      }
      else {
        x = y = 0;
      }
      break;
    }
  }

  p.x = this.a * x + this.x0;
  p.y = this.a * y + this.y0;
  return p;
}

/* Inverse equations
  -----------------*/
function inverse$i(p) {
  p.x -= this.x0;
  p.y -= this.y0;
  var x = p.x / this.a;
  var y = p.y / this.a;
  var lam, phi, cCe, sCe, q, rho, ab;
  if (this.sphere) {
    var cosz = 0,
      rh, sinz = 0;

    rh = Math.sqrt(x * x + y * y);
    phi = rh * 0.5;
    if (phi > 1) {
      return null;
    }
    phi = 2 * Math.asin(phi);
    if (this.mode === this.OBLIQ || this.mode === this.EQUIT) {
      sinz = Math.sin(phi);
      cosz = Math.cos(phi);
    }
    switch (this.mode) {
    case this.EQUIT:
      phi = (Math.abs(rh) <= EPSLN) ? 0 : Math.asin(y * sinz / rh);
      x *= sinz;
      y = cosz * rh;
      break;
    case this.OBLIQ:
      phi = (Math.abs(rh) <= EPSLN) ? this.lat0 : Math.asin(cosz * this.sinph0 + y * sinz * this.cosph0 / rh);
      x *= sinz * this.cosph0;
      y = (cosz - Math.sin(phi) * this.sinph0) * rh;
      break;
    case this.N_POLE:
      y = -y;
      phi = HALF_PI - phi;
      break;
    case this.S_POLE:
      phi -= HALF_PI;
      break;
    }
    lam = (y === 0 && (this.mode === this.EQUIT || this.mode === this.OBLIQ)) ? 0 : Math.atan2(x, y);
  }
  else {
    ab = 0;
    if (this.mode === this.OBLIQ || this.mode === this.EQUIT) {
      x /= this.dd;
      y *= this.dd;
      rho = Math.sqrt(x * x + y * y);
      if (rho < EPSLN) {
        p.x = this.long0;
        p.y = this.lat0;
        return p;
      }
      sCe = 2 * Math.asin(0.5 * rho / this.rq);
      cCe = Math.cos(sCe);
      x *= (sCe = Math.sin(sCe));
      if (this.mode === this.OBLIQ) {
        ab = cCe * this.sinb1 + y * sCe * this.cosb1 / rho;
        q = this.qp * ab;
        y = rho * this.cosb1 * cCe - y * this.sinb1 * sCe;
      }
      else {
        ab = y * sCe / rho;
        q = this.qp * ab;
        y = rho * cCe;
      }
    }
    else if (this.mode === this.N_POLE || this.mode === this.S_POLE) {
      if (this.mode === this.N_POLE) {
        y = -y;
      }
      q = (x * x + y * y);
      if (!q) {
        p.x = this.long0;
        p.y = this.lat0;
        return p;
      }
      ab = 1 - q / this.qp;
      if (this.mode === this.S_POLE) {
        ab = -ab;
      }
    }
    lam = Math.atan2(x, y);
    phi = authlat(Math.asin(ab), this.apa);
  }

  p.x = adjust_lon(this.long0 + lam);
  p.y = phi;
  return p;
}

/* determine latitude from authalic latitude */
var P00 = 0.33333333333333333333;

var P01 = 0.17222222222222222222;
var P02 = 0.10257936507936507936;
var P10 = 0.06388888888888888888;
var P11 = 0.06640211640211640211;
var P20 = 0.01641501294219154443;

function authset(es) {
  var t;
  var APA = [];
  APA[0] = es * P00;
  t = es * es;
  APA[0] += t * P01;
  APA[1] = t * P10;
  t *= es;
  APA[0] += t * P02;
  APA[1] += t * P11;
  APA[2] = t * P20;
  return APA;
}

function authlat(beta, APA) {
  var t = beta + beta;
  return (beta + APA[0] * Math.sin(t) + APA[1] * Math.sin(t + t) + APA[2] * Math.sin(t + t + t));
}

var names$i = ["Lambert Azimuthal Equal Area", "Lambert_Azimuthal_Equal_Area", "laea"];
var laea = {
  init: init$i,
  forward: forward$i,
  inverse: inverse$i,
  names: names$i,
  S_POLE: S_POLE,
  N_POLE: N_POLE,
  EQUIT: EQUIT,
  OBLIQ: OBLIQ
};

function asinz(x) {
  if (Math.abs(x) > 1) {
    x = (x > 1) ? 1 : -1;
  }
  return Math.asin(x);
}

function init$h() {

  if (Math.abs(this.lat1 + this.lat2) < EPSLN) {
    return;
  }
  this.temp = this.b / this.a;
  this.es = 1 - Math.pow(this.temp, 2);
  this.e3 = Math.sqrt(this.es);

  this.sin_po = Math.sin(this.lat1);
  this.cos_po = Math.cos(this.lat1);
  this.t1 = this.sin_po;
  this.con = this.sin_po;
  this.ms1 = msfnz(this.e3, this.sin_po, this.cos_po);
  this.qs1 = qsfnz(this.e3, this.sin_po, this.cos_po);

  this.sin_po = Math.sin(this.lat2);
  this.cos_po = Math.cos(this.lat2);
  this.t2 = this.sin_po;
  this.ms2 = msfnz(this.e3, this.sin_po, this.cos_po);
  this.qs2 = qsfnz(this.e3, this.sin_po, this.cos_po);

  this.sin_po = Math.sin(this.lat0);
  this.cos_po = Math.cos(this.lat0);
  this.t3 = this.sin_po;
  this.qs0 = qsfnz(this.e3, this.sin_po, this.cos_po);

  if (Math.abs(this.lat1 - this.lat2) > EPSLN) {
    this.ns0 = (this.ms1 * this.ms1 - this.ms2 * this.ms2) / (this.qs2 - this.qs1);
  }
  else {
    this.ns0 = this.con;
  }
  this.c = this.ms1 * this.ms1 + this.ns0 * this.qs1;
  this.rh = this.a * Math.sqrt(this.c - this.ns0 * this.qs0) / this.ns0;
}

/* Albers Conical Equal Area forward equations--mapping lat,long to x,y
  -------------------------------------------------------------------*/
function forward$h(p) {

  var lon = p.x;
  var lat = p.y;

  this.sin_phi = Math.sin(lat);
  this.cos_phi = Math.cos(lat);

  var qs = qsfnz(this.e3, this.sin_phi, this.cos_phi);
  var rh1 = this.a * Math.sqrt(this.c - this.ns0 * qs) / this.ns0;
  var theta = this.ns0 * adjust_lon(lon - this.long0);
  var x = rh1 * Math.sin(theta) + this.x0;
  var y = this.rh - rh1 * Math.cos(theta) + this.y0;

  p.x = x;
  p.y = y;
  return p;
}

function inverse$h(p) {
  var rh1, qs, con, theta, lon, lat;

  p.x -= this.x0;
  p.y = this.rh - p.y + this.y0;
  if (this.ns0 >= 0) {
    rh1 = Math.sqrt(p.x * p.x + p.y * p.y);
    con = 1;
  }
  else {
    rh1 = -Math.sqrt(p.x * p.x + p.y * p.y);
    con = -1;
  }
  theta = 0;
  if (rh1 !== 0) {
    theta = Math.atan2(con * p.x, con * p.y);
  }
  con = rh1 * this.ns0 / this.a;
  if (this.sphere) {
    lat = Math.asin((this.c - con * con) / (2 * this.ns0));
  }
  else {
    qs = (this.c - con * con) / this.ns0;
    lat = this.phi1z(this.e3, qs);
  }

  lon = adjust_lon(theta / this.ns0 + this.long0);
  p.x = lon;
  p.y = lat;
  return p;
}

/* Function to compute phi1, the latitude for the inverse of the
   Albers Conical Equal-Area projection.
-------------------------------------------*/
function phi1z(eccent, qs) {
  var sinphi, cosphi, con, com, dphi;
  var phi = asinz(0.5 * qs);
  if (eccent < EPSLN) {
    return phi;
  }

  var eccnts = eccent * eccent;
  for (var i = 1; i <= 25; i++) {
    sinphi = Math.sin(phi);
    cosphi = Math.cos(phi);
    con = eccent * sinphi;
    com = 1 - con * con;
    dphi = 0.5 * com * com / cosphi * (qs / (1 - eccnts) - sinphi / com + 0.5 / eccent * Math.log((1 - con) / (1 + con)));
    phi = phi + dphi;
    if (Math.abs(dphi) <= 1e-7) {
      return phi;
    }
  }
  return null;
}

var names$h = ["Albers_Conic_Equal_Area", "Albers", "aea"];
var aea = {
  init: init$h,
  forward: forward$h,
  inverse: inverse$h,
  names: names$h,
  phi1z: phi1z
};

/*
  reference:
    Wolfram Mathworld "Gnomonic Projection"
    http://mathworld.wolfram.com/GnomonicProjection.html
    Accessed: 12th November 2009
  */
function init$g() {

  /* Place parameters in static storage for common use
      -------------------------------------------------*/
  this.sin_p14 = Math.sin(this.lat0);
  this.cos_p14 = Math.cos(this.lat0);
  // Approximation for projecting points to the horizon (infinity)
  this.infinity_dist = 1000 * this.a;
  this.rc = 1;
}

/* Gnomonic forward equations--mapping lat,long to x,y
    ---------------------------------------------------*/
function forward$g(p) {
  var sinphi, cosphi; /* sin and cos value        */
  var dlon; /* delta longitude value      */
  var coslon; /* cos of longitude        */
  var ksp; /* scale factor          */
  var g;
  var x, y;
  var lon = p.x;
  var lat = p.y;
  /* Forward equations
      -----------------*/
  dlon = adjust_lon(lon - this.long0);

  sinphi = Math.sin(lat);
  cosphi = Math.cos(lat);

  coslon = Math.cos(dlon);
  g = this.sin_p14 * sinphi + this.cos_p14 * cosphi * coslon;
  ksp = 1;
  if ((g > 0) || (Math.abs(g) <= EPSLN)) {
    x = this.x0 + this.a * ksp * cosphi * Math.sin(dlon) / g;
    y = this.y0 + this.a * ksp * (this.cos_p14 * sinphi - this.sin_p14 * cosphi * coslon) / g;
  }
  else {

    // Point is in the opposing hemisphere and is unprojectable
    // We still need to return a reasonable point, so we project
    // to infinity, on a bearing
    // equivalent to the northern hemisphere equivalent
    // This is a reasonable approximation for short shapes and lines that
    // straddle the horizon.

    x = this.x0 + this.infinity_dist * cosphi * Math.sin(dlon);
    y = this.y0 + this.infinity_dist * (this.cos_p14 * sinphi - this.sin_p14 * cosphi * coslon);

  }
  p.x = x;
  p.y = y;
  return p;
}

function inverse$g(p) {
  var rh; /* Rho */
  var sinc, cosc;
  var c;
  var lon, lat;

  /* Inverse equations
      -----------------*/
  p.x = (p.x - this.x0) / this.a;
  p.y = (p.y - this.y0) / this.a;

  p.x /= this.k0;
  p.y /= this.k0;

  if ((rh = Math.sqrt(p.x * p.x + p.y * p.y))) {
    c = Math.atan2(rh, this.rc);
    sinc = Math.sin(c);
    cosc = Math.cos(c);

    lat = asinz(cosc * this.sin_p14 + (p.y * sinc * this.cos_p14) / rh);
    lon = Math.atan2(p.x * sinc, rh * this.cos_p14 * cosc - p.y * this.sin_p14 * sinc);
    lon = adjust_lon(this.long0 + lon);
  }
  else {
    lat = this.phic0;
    lon = 0;
  }

  p.x = lon;
  p.y = lat;
  return p;
}

var names$g = ["gnom"];
var gnom = {
  init: init$g,
  forward: forward$g,
  inverse: inverse$g,
  names: names$g
};

function iqsfnz(eccent, q) {
  var temp = 1 - (1 - eccent * eccent) / (2 * eccent) * Math.log((1 - eccent) / (1 + eccent));
  if (Math.abs(Math.abs(q) - temp) < 1.0E-6) {
    if (q < 0) {
      return (-1 * HALF_PI);
    }
    else {
      return HALF_PI;
    }
  }
  //var phi = 0.5* q/(1-eccent*eccent);
  var phi = Math.asin(0.5 * q);
  var dphi;
  var sin_phi;
  var cos_phi;
  var con;
  for (var i = 0; i < 30; i++) {
    sin_phi = Math.sin(phi);
    cos_phi = Math.cos(phi);
    con = eccent * sin_phi;
    dphi = Math.pow(1 - con * con, 2) / (2 * cos_phi) * (q / (1 - eccent * eccent) - sin_phi / (1 - con * con) + 0.5 / eccent * Math.log((1 - con) / (1 + con)));
    phi += dphi;
    if (Math.abs(dphi) <= 0.0000000001) {
      return phi;
    }
  }

  //console.log("IQSFN-CONV:Latitude failed to converge after 30 iterations");
  return NaN;
}

/*
  reference:
    "Cartographic Projection Procedures for the UNIX Environment-
    A User's Manual" by Gerald I. Evenden,
    USGS Open File Report 90-284and Release 4 Interim Reports (2003)
*/
function init$f() {
  //no-op
  if (!this.sphere) {
    this.k0 = msfnz(this.e, Math.sin(this.lat_ts), Math.cos(this.lat_ts));
  }
}

/* Cylindrical Equal Area forward equations--mapping lat,long to x,y
    ------------------------------------------------------------*/
function forward$f(p) {
  var lon = p.x;
  var lat = p.y;
  var x, y;
  /* Forward equations
      -----------------*/
  var dlon = adjust_lon(lon - this.long0);
  if (this.sphere) {
    x = this.x0 + this.a * dlon * Math.cos(this.lat_ts);
    y = this.y0 + this.a * Math.sin(lat) / Math.cos(this.lat_ts);
  }
  else {
    var qs = qsfnz(this.e, Math.sin(lat));
    x = this.x0 + this.a * this.k0 * dlon;
    y = this.y0 + this.a * qs * 0.5 / this.k0;
  }

  p.x = x;
  p.y = y;
  return p;
}

/* Cylindrical Equal Area inverse equations--mapping x,y to lat/long
    ------------------------------------------------------------*/
function inverse$f(p) {
  p.x -= this.x0;
  p.y -= this.y0;
  var lon, lat;

  if (this.sphere) {
    lon = adjust_lon(this.long0 + (p.x / this.a) / Math.cos(this.lat_ts));
    lat = Math.asin((p.y / this.a) * Math.cos(this.lat_ts));
  }
  else {
    lat = iqsfnz(this.e, 2 * p.y * this.k0 / this.a);
    lon = adjust_lon(this.long0 + p.x / (this.a * this.k0));
  }

  p.x = lon;
  p.y = lat;
  return p;
}

var names$f = ["cea"];
var cea = {
  init: init$f,
  forward: forward$f,
  inverse: inverse$f,
  names: names$f
};

function init$e() {

  this.x0 = this.x0 || 0;
  this.y0 = this.y0 || 0;
  this.lat0 = this.lat0 || 0;
  this.long0 = this.long0 || 0;
  this.lat_ts = this.lat_ts || 0;
  this.title = this.title || "Equidistant Cylindrical (Plate Carre)";

  this.rc = Math.cos(this.lat_ts);
}

// forward equations--mapping lat,long to x,y
// -----------------------------------------------------------------
function forward$e(p) {

  var lon = p.x;
  var lat = p.y;

  var dlon = adjust_lon(lon - this.long0);
  var dlat = adjust_lat(lat - this.lat0);
  p.x = this.x0 + (this.a * dlon * this.rc);
  p.y = this.y0 + (this.a * dlat);
  return p;
}

// inverse equations--mapping x,y to lat/long
// -----------------------------------------------------------------
function inverse$e(p) {

  var x = p.x;
  var y = p.y;

  p.x = adjust_lon(this.long0 + ((x - this.x0) / (this.a * this.rc)));
  p.y = adjust_lat(this.lat0 + ((y - this.y0) / (this.a)));
  return p;
}

var names$e = ["Equirectangular", "Equidistant_Cylindrical", "eqc"];
var eqc = {
  init: init$e,
  forward: forward$e,
  inverse: inverse$e,
  names: names$e
};

var MAX_ITER$1 = 20;

function init$d() {
  /* Place parameters in static storage for common use
      -------------------------------------------------*/
  this.temp = this.b / this.a;
  this.es = 1 - Math.pow(this.temp, 2); // devait etre dans tmerc.js mais n y est pas donc je commente sinon retour de valeurs nulles
  this.e = Math.sqrt(this.es);
  this.e0 = e0fn(this.es);
  this.e1 = e1fn(this.es);
  this.e2 = e2fn(this.es);
  this.e3 = e3fn(this.es);
  this.ml0 = this.a * mlfn(this.e0, this.e1, this.e2, this.e3, this.lat0); //si que des zeros le calcul ne se fait pas
}

/* Polyconic forward equations--mapping lat,long to x,y
    ---------------------------------------------------*/
function forward$d(p) {
  var lon = p.x;
  var lat = p.y;
  var x, y, el;
  var dlon = adjust_lon(lon - this.long0);
  el = dlon * Math.sin(lat);
  if (this.sphere) {
    if (Math.abs(lat) <= EPSLN) {
      x = this.a * dlon;
      y = -1 * this.a * this.lat0;
    }
    else {
      x = this.a * Math.sin(el) / Math.tan(lat);
      y = this.a * (adjust_lat(lat - this.lat0) + (1 - Math.cos(el)) / Math.tan(lat));
    }
  }
  else {
    if (Math.abs(lat) <= EPSLN) {
      x = this.a * dlon;
      y = -1 * this.ml0;
    }
    else {
      var nl = gN(this.a, this.e, Math.sin(lat)) / Math.tan(lat);
      x = nl * Math.sin(el);
      y = this.a * mlfn(this.e0, this.e1, this.e2, this.e3, lat) - this.ml0 + nl * (1 - Math.cos(el));
    }

  }
  p.x = x + this.x0;
  p.y = y + this.y0;
  return p;
}

/* Inverse equations
  -----------------*/
function inverse$d(p) {
  var lon, lat, x, y, i;
  var al, bl;
  var phi, dphi;
  x = p.x - this.x0;
  y = p.y - this.y0;

  if (this.sphere) {
    if (Math.abs(y + this.a * this.lat0) <= EPSLN) {
      lon = adjust_lon(x / this.a + this.long0);
      lat = 0;
    }
    else {
      al = this.lat0 + y / this.a;
      bl = x * x / this.a / this.a + al * al;
      phi = al;
      var tanphi;
      for (i = MAX_ITER$1; i; --i) {
        tanphi = Math.tan(phi);
        dphi = -1 * (al * (phi * tanphi + 1) - phi - 0.5 * (phi * phi + bl) * tanphi) / ((phi - al) / tanphi - 1);
        phi += dphi;
        if (Math.abs(dphi) <= EPSLN) {
          lat = phi;
          break;
        }
      }
      lon = adjust_lon(this.long0 + (Math.asin(x * Math.tan(phi) / this.a)) / Math.sin(lat));
    }
  }
  else {
    if (Math.abs(y + this.ml0) <= EPSLN) {
      lat = 0;
      lon = adjust_lon(this.long0 + x / this.a);
    }
    else {

      al = (this.ml0 + y) / this.a;
      bl = x * x / this.a / this.a + al * al;
      phi = al;
      var cl, mln, mlnp, ma;
      var con;
      for (i = MAX_ITER$1; i; --i) {
        con = this.e * Math.sin(phi);
        cl = Math.sqrt(1 - con * con) * Math.tan(phi);
        mln = this.a * mlfn(this.e0, this.e1, this.e2, this.e3, phi);
        mlnp = this.e0 - 2 * this.e1 * Math.cos(2 * phi) + 4 * this.e2 * Math.cos(4 * phi) - 6 * this.e3 * Math.cos(6 * phi);
        ma = mln / this.a;
        dphi = (al * (cl * ma + 1) - ma - 0.5 * cl * (ma * ma + bl)) / (this.es * Math.sin(2 * phi) * (ma * ma + bl - 2 * al * ma) / (4 * cl) + (al - ma) * (cl * mlnp - 2 / Math.sin(2 * phi)) - mlnp);
        phi -= dphi;
        if (Math.abs(dphi) <= EPSLN) {
          lat = phi;
          break;
        }
      }

      //lat=phi4z(this.e,this.e0,this.e1,this.e2,this.e3,al,bl,0,0);
      cl = Math.sqrt(1 - this.es * Math.pow(Math.sin(lat), 2)) * Math.tan(lat);
      lon = adjust_lon(this.long0 + Math.asin(x * cl / this.a) / Math.sin(lat));
    }
  }

  p.x = lon;
  p.y = lat;
  return p;
}

var names$d = ["Polyconic", "poly"];
var poly = {
  init: init$d,
  forward: forward$d,
  inverse: inverse$d,
  names: names$d
};

function init$c() {
  this.A = [];
  this.A[1] = 0.6399175073;
  this.A[2] = -0.1358797613;
  this.A[3] = 0.063294409;
  this.A[4] = -0.02526853;
  this.A[5] = 0.0117879;
  this.A[6] = -0.0055161;
  this.A[7] = 0.0026906;
  this.A[8] = -0.001333;
  this.A[9] = 0.00067;
  this.A[10] = -0.00034;

  this.B_re = [];
  this.B_im = [];
  this.B_re[1] = 0.7557853228;
  this.B_im[1] = 0;
  this.B_re[2] = 0.249204646;
  this.B_im[2] = 0.003371507;
  this.B_re[3] = -0.001541739;
  this.B_im[3] = 0.041058560;
  this.B_re[4] = -0.10162907;
  this.B_im[4] = 0.01727609;
  this.B_re[5] = -0.26623489;
  this.B_im[5] = -0.36249218;
  this.B_re[6] = -0.6870983;
  this.B_im[6] = -1.1651967;

  this.C_re = [];
  this.C_im = [];
  this.C_re[1] = 1.3231270439;
  this.C_im[1] = 0;
  this.C_re[2] = -0.577245789;
  this.C_im[2] = -0.007809598;
  this.C_re[3] = 0.508307513;
  this.C_im[3] = -0.112208952;
  this.C_re[4] = -0.15094762;
  this.C_im[4] = 0.18200602;
  this.C_re[5] = 1.01418179;
  this.C_im[5] = 1.64497696;
  this.C_re[6] = 1.9660549;
  this.C_im[6] = 2.5127645;

  this.D = [];
  this.D[1] = 1.5627014243;
  this.D[2] = 0.5185406398;
  this.D[3] = -0.03333098;
  this.D[4] = -0.1052906;
  this.D[5] = -0.0368594;
  this.D[6] = 0.007317;
  this.D[7] = 0.01220;
  this.D[8] = 0.00394;
  this.D[9] = -0.0013;
}

/**
    New Zealand Map Grid Forward  - long/lat to x/y
    long/lat in radians
  */
function forward$c(p) {
  var n;
  var lon = p.x;
  var lat = p.y;

  var delta_lat = lat - this.lat0;
  var delta_lon = lon - this.long0;

  // 1. Calculate d_phi and d_psi    ...                          // and d_lambda
  // For this algorithm, delta_latitude is in seconds of arc x 10-5, so we need to scale to those units. Longitude is radians.
  var d_phi = delta_lat / SEC_TO_RAD * 1E-5;
  var d_lambda = delta_lon;
  var d_phi_n = 1; // d_phi^0

  var d_psi = 0;
  for (n = 1; n <= 10; n++) {
    d_phi_n = d_phi_n * d_phi;
    d_psi = d_psi + this.A[n] * d_phi_n;
  }

  // 2. Calculate theta
  var th_re = d_psi;
  var th_im = d_lambda;

  // 3. Calculate z
  var th_n_re = 1;
  var th_n_im = 0; // theta^0
  var th_n_re1;
  var th_n_im1;

  var z_re = 0;
  var z_im = 0;
  for (n = 1; n <= 6; n++) {
    th_n_re1 = th_n_re * th_re - th_n_im * th_im;
    th_n_im1 = th_n_im * th_re + th_n_re * th_im;
    th_n_re = th_n_re1;
    th_n_im = th_n_im1;
    z_re = z_re + this.B_re[n] * th_n_re - this.B_im[n] * th_n_im;
    z_im = z_im + this.B_im[n] * th_n_re + this.B_re[n] * th_n_im;
  }

  // 4. Calculate easting and northing
  p.x = (z_im * this.a) + this.x0;
  p.y = (z_re * this.a) + this.y0;

  return p;
}

/**
    New Zealand Map Grid Inverse  -  x/y to long/lat
  */
function inverse$c(p) {
  var n;
  var x = p.x;
  var y = p.y;

  var delta_x = x - this.x0;
  var delta_y = y - this.y0;

  // 1. Calculate z
  var z_re = delta_y / this.a;
  var z_im = delta_x / this.a;

  // 2a. Calculate theta - first approximation gives km accuracy
  var z_n_re = 1;
  var z_n_im = 0; // z^0
  var z_n_re1;
  var z_n_im1;

  var th_re = 0;
  var th_im = 0;
  for (n = 1; n <= 6; n++) {
    z_n_re1 = z_n_re * z_re - z_n_im * z_im;
    z_n_im1 = z_n_im * z_re + z_n_re * z_im;
    z_n_re = z_n_re1;
    z_n_im = z_n_im1;
    th_re = th_re + this.C_re[n] * z_n_re - this.C_im[n] * z_n_im;
    th_im = th_im + this.C_im[n] * z_n_re + this.C_re[n] * z_n_im;
  }

  // 2b. Iterate to refine the accuracy of the calculation
  //        0 iterations gives km accuracy
  //        1 iteration gives m accuracy -- good enough for most mapping applications
  //        2 iterations bives mm accuracy
  for (var i = 0; i < this.iterations; i++) {
    var th_n_re = th_re;
    var th_n_im = th_im;
    var th_n_re1;
    var th_n_im1;

    var num_re = z_re;
    var num_im = z_im;
    for (n = 2; n <= 6; n++) {
      th_n_re1 = th_n_re * th_re - th_n_im * th_im;
      th_n_im1 = th_n_im * th_re + th_n_re * th_im;
      th_n_re = th_n_re1;
      th_n_im = th_n_im1;
      num_re = num_re + (n - 1) * (this.B_re[n] * th_n_re - this.B_im[n] * th_n_im);
      num_im = num_im + (n - 1) * (this.B_im[n] * th_n_re + this.B_re[n] * th_n_im);
    }

    th_n_re = 1;
    th_n_im = 0;
    var den_re = this.B_re[1];
    var den_im = this.B_im[1];
    for (n = 2; n <= 6; n++) {
      th_n_re1 = th_n_re * th_re - th_n_im * th_im;
      th_n_im1 = th_n_im * th_re + th_n_re * th_im;
      th_n_re = th_n_re1;
      th_n_im = th_n_im1;
      den_re = den_re + n * (this.B_re[n] * th_n_re - this.B_im[n] * th_n_im);
      den_im = den_im + n * (this.B_im[n] * th_n_re + this.B_re[n] * th_n_im);
    }

    // Complex division
    var den2 = den_re * den_re + den_im * den_im;
    th_re = (num_re * den_re + num_im * den_im) / den2;
    th_im = (num_im * den_re - num_re * den_im) / den2;
  }

  // 3. Calculate d_phi              ...                                    // and d_lambda
  var d_psi = th_re;
  var d_lambda = th_im;
  var d_psi_n = 1; // d_psi^0

  var d_phi = 0;
  for (n = 1; n <= 9; n++) {
    d_psi_n = d_psi_n * d_psi;
    d_phi = d_phi + this.D[n] * d_psi_n;
  }

  // 4. Calculate latitude and longitude
  // d_phi is calcuated in second of arc * 10^-5, so we need to scale back to radians. d_lambda is in radians.
  var lat = this.lat0 + (d_phi * SEC_TO_RAD * 1E5);
  var lon = this.long0 + d_lambda;

  p.x = lon;
  p.y = lat;

  return p;
}

var names$c = ["New_Zealand_Map_Grid", "nzmg"];
var nzmg = {
  init: init$c,
  forward: forward$c,
  inverse: inverse$c,
  names: names$c
};

/*
  reference
    "New Equal-Area Map Projections for Noncircular Regions", John P. Snyder,
    The American Cartographer, Vol 15, No. 4, October 1988, pp. 341-355.
  */


/* Initialize the Miller Cylindrical projection
  -------------------------------------------*/
function init$b() {
  //no-op
}

/* Miller Cylindrical forward equations--mapping lat,long to x,y
    ------------------------------------------------------------*/
function forward$b(p) {
  var lon = p.x;
  var lat = p.y;
  /* Forward equations
      -----------------*/
  var dlon = adjust_lon(lon - this.long0);
  var x = this.x0 + this.a * dlon;
  var y = this.y0 + this.a * Math.log(Math.tan((Math.PI / 4) + (lat / 2.5))) * 1.25;

  p.x = x;
  p.y = y;
  return p;
}

/* Miller Cylindrical inverse equations--mapping x,y to lat/long
    ------------------------------------------------------------*/
function inverse$b(p) {
  p.x -= this.x0;
  p.y -= this.y0;

  var lon = adjust_lon(this.long0 + p.x / this.a);
  var lat = 2.5 * (Math.atan(Math.exp(0.8 * p.y / this.a)) - Math.PI / 4);

  p.x = lon;
  p.y = lat;
  return p;
}

var names$b = ["Miller_Cylindrical", "mill"];
var mill = {
  init: init$b,
  forward: forward$b,
  inverse: inverse$b,
  names: names$b
};

var MAX_ITER = 20;


function init$a() {
  /* Place parameters in static storage for common use
    -------------------------------------------------*/


  if (!this.sphere) {
    this.en = pj_enfn(this.es);
  }
  else {
    this.n = 1;
    this.m = 0;
    this.es = 0;
    this.C_y = Math.sqrt((this.m + 1) / this.n);
    this.C_x = this.C_y / (this.m + 1);
  }

}

/* Sinusoidal forward equations--mapping lat,long to x,y
  -----------------------------------------------------*/
function forward$a(p) {
  var x, y;
  var lon = p.x;
  var lat = p.y;
  /* Forward equations
    -----------------*/
  lon = adjust_lon(lon - this.long0);

  if (this.sphere) {
    if (!this.m) {
      lat = this.n !== 1 ? Math.asin(this.n * Math.sin(lat)) : lat;
    }
    else {
      var k = this.n * Math.sin(lat);
      for (var i = MAX_ITER; i; --i) {
        var V = (this.m * lat + Math.sin(lat) - k) / (this.m + Math.cos(lat));
        lat -= V;
        if (Math.abs(V) < EPSLN) {
          break;
        }
      }
    }
    x = this.a * this.C_x * lon * (this.m + Math.cos(lat));
    y = this.a * this.C_y * lat;

  }
  else {

    var s = Math.sin(lat);
    var c = Math.cos(lat);
    y = this.a * pj_mlfn(lat, s, c, this.en);
    x = this.a * lon * c / Math.sqrt(1 - this.es * s * s);
  }

  p.x = x;
  p.y = y;
  return p;
}

function inverse$a(p) {
  var lat, temp, lon, s;

  p.x -= this.x0;
  lon = p.x / this.a;
  p.y -= this.y0;
  lat = p.y / this.a;

  if (this.sphere) {
    lat /= this.C_y;
    lon = lon / (this.C_x * (this.m + Math.cos(lat)));
    if (this.m) {
      lat = asinz((this.m * lat + Math.sin(lat)) / this.n);
    }
    else if (this.n !== 1) {
      lat = asinz(Math.sin(lat) / this.n);
    }
    lon = adjust_lon(lon + this.long0);
    lat = adjust_lat(lat);
  }
  else {
    lat = pj_inv_mlfn(p.y / this.a, this.es, this.en);
    s = Math.abs(lat);
    if (s < HALF_PI) {
      s = Math.sin(lat);
      temp = this.long0 + p.x * Math.sqrt(1 - this.es * s * s) / (this.a * Math.cos(lat));
      //temp = this.long0 + p.x / (this.a * Math.cos(lat));
      lon = adjust_lon(temp);
    }
    else if ((s - EPSLN) < HALF_PI) {
      lon = this.long0;
    }
  }
  p.x = lon;
  p.y = lat;
  return p;
}

var names$a = ["Sinusoidal", "sinu"];
var sinu = {
  init: init$a,
  forward: forward$a,
  inverse: inverse$a,
  names: names$a
};

function init$9() {}
/* Mollweide forward equations--mapping lat,long to x,y
    ----------------------------------------------------*/
function forward$9(p) {

  /* Forward equations
      -----------------*/
  var lon = p.x;
  var lat = p.y;

  var delta_lon = adjust_lon(lon - this.long0);
  var theta = lat;
  var con = Math.PI * Math.sin(lat);

  /* Iterate using the Newton-Raphson method to find theta
      -----------------------------------------------------*/
  while (true) {
    var delta_theta = -(theta + Math.sin(theta) - con) / (1 + Math.cos(theta));
    theta += delta_theta;
    if (Math.abs(delta_theta) < EPSLN) {
      break;
    }
  }
  theta /= 2;

  /* If the latitude is 90 deg, force the x coordinate to be "0 + false easting"
       this is done here because of precision problems with "cos(theta)"
       --------------------------------------------------------------------------*/
  if (Math.PI / 2 - Math.abs(lat) < EPSLN) {
    delta_lon = 0;
  }
  var x = 0.900316316158 * this.a * delta_lon * Math.cos(theta) + this.x0;
  var y = 1.4142135623731 * this.a * Math.sin(theta) + this.y0;

  p.x = x;
  p.y = y;
  return p;
}

function inverse$9(p) {
  var theta;
  var arg;

  /* Inverse equations
      -----------------*/
  p.x -= this.x0;
  p.y -= this.y0;
  arg = p.y / (1.4142135623731 * this.a);

  /* Because of division by zero problems, 'arg' can not be 1.  Therefore
       a number very close to one is used instead.
       -------------------------------------------------------------------*/
  if (Math.abs(arg) > 0.999999999999) {
    arg = 0.999999999999;
  }
  theta = Math.asin(arg);
  var lon = adjust_lon(this.long0 + (p.x / (0.900316316158 * this.a * Math.cos(theta))));
  if (lon < (-Math.PI)) {
    lon = -Math.PI;
  }
  if (lon > Math.PI) {
    lon = Math.PI;
  }
  arg = (2 * theta + Math.sin(2 * theta)) / Math.PI;
  if (Math.abs(arg) > 1) {
    arg = 1;
  }
  var lat = Math.asin(arg);

  p.x = lon;
  p.y = lat;
  return p;
}

var names$9 = ["Mollweide", "moll"];
var moll = {
  init: init$9,
  forward: forward$9,
  inverse: inverse$9,
  names: names$9
};

function init$8() {

  /* Place parameters in static storage for common use
      -------------------------------------------------*/
  // Standard Parallels cannot be equal and on opposite sides of the equator
  if (Math.abs(this.lat1 + this.lat2) < EPSLN) {
    return;
  }
  this.lat2 = this.lat2 || this.lat1;
  this.temp = this.b / this.a;
  this.es = 1 - Math.pow(this.temp, 2);
  this.e = Math.sqrt(this.es);
  this.e0 = e0fn(this.es);
  this.e1 = e1fn(this.es);
  this.e2 = e2fn(this.es);
  this.e3 = e3fn(this.es);

  this.sinphi = Math.sin(this.lat1);
  this.cosphi = Math.cos(this.lat1);

  this.ms1 = msfnz(this.e, this.sinphi, this.cosphi);
  this.ml1 = mlfn(this.e0, this.e1, this.e2, this.e3, this.lat1);

  if (Math.abs(this.lat1 - this.lat2) < EPSLN) {
    this.ns = this.sinphi;
  }
  else {
    this.sinphi = Math.sin(this.lat2);
    this.cosphi = Math.cos(this.lat2);
    this.ms2 = msfnz(this.e, this.sinphi, this.cosphi);
    this.ml2 = mlfn(this.e0, this.e1, this.e2, this.e3, this.lat2);
    this.ns = (this.ms1 - this.ms2) / (this.ml2 - this.ml1);
  }
  this.g = this.ml1 + this.ms1 / this.ns;
  this.ml0 = mlfn(this.e0, this.e1, this.e2, this.e3, this.lat0);
  this.rh = this.a * (this.g - this.ml0);
}

/* Equidistant Conic forward equations--mapping lat,long to x,y
  -----------------------------------------------------------*/
function forward$8(p) {
  var lon = p.x;
  var lat = p.y;
  var rh1;

  /* Forward equations
      -----------------*/
  if (this.sphere) {
    rh1 = this.a * (this.g - lat);
  }
  else {
    var ml = mlfn(this.e0, this.e1, this.e2, this.e3, lat);
    rh1 = this.a * (this.g - ml);
  }
  var theta = this.ns * adjust_lon(lon - this.long0);
  var x = this.x0 + rh1 * Math.sin(theta);
  var y = this.y0 + this.rh - rh1 * Math.cos(theta);
  p.x = x;
  p.y = y;
  return p;
}

/* Inverse equations
  -----------------*/
function inverse$8(p) {
  p.x -= this.x0;
  p.y = this.rh - p.y + this.y0;
  var con, rh1, lat, lon;
  if (this.ns >= 0) {
    rh1 = Math.sqrt(p.x * p.x + p.y * p.y);
    con = 1;
  }
  else {
    rh1 = -Math.sqrt(p.x * p.x + p.y * p.y);
    con = -1;
  }
  var theta = 0;
  if (rh1 !== 0) {
    theta = Math.atan2(con * p.x, con * p.y);
  }

  if (this.sphere) {
    lon = adjust_lon(this.long0 + theta / this.ns);
    lat = adjust_lat(this.g - rh1 / this.a);
    p.x = lon;
    p.y = lat;
    return p;
  }
  else {
    var ml = this.g - rh1 / this.a;
    lat = imlfn(ml, this.e0, this.e1, this.e2, this.e3);
    lon = adjust_lon(this.long0 + theta / this.ns);
    p.x = lon;
    p.y = lat;
    return p;
  }

}

var names$8 = ["Equidistant_Conic", "eqdc"];
var eqdc = {
  init: init$8,
  forward: forward$8,
  inverse: inverse$8,
  names: names$8
};

/* Initialize the Van Der Grinten projection
  ----------------------------------------*/
function init$7() {
  //this.R = 6370997; //Radius of earth
  this.R = this.a;
}

function forward$7(p) {

  var lon = p.x;
  var lat = p.y;

  /* Forward equations
    -----------------*/
  var dlon = adjust_lon(lon - this.long0);
  var x, y;

  if (Math.abs(lat) <= EPSLN) {
    x = this.x0 + this.R * dlon;
    y = this.y0;
  }
  var theta = asinz(2 * Math.abs(lat / Math.PI));
  if ((Math.abs(dlon) <= EPSLN) || (Math.abs(Math.abs(lat) - HALF_PI) <= EPSLN)) {
    x = this.x0;
    if (lat >= 0) {
      y = this.y0 + Math.PI * this.R * Math.tan(0.5 * theta);
    }
    else {
      y = this.y0 + Math.PI * this.R * -Math.tan(0.5 * theta);
    }
    //  return(OK);
  }
  var al = 0.5 * Math.abs((Math.PI / dlon) - (dlon / Math.PI));
  var asq = al * al;
  var sinth = Math.sin(theta);
  var costh = Math.cos(theta);

  var g = costh / (sinth + costh - 1);
  var gsq = g * g;
  var m = g * (2 / sinth - 1);
  var msq = m * m;
  var con = Math.PI * this.R * (al * (g - msq) + Math.sqrt(asq * (g - msq) * (g - msq) - (msq + asq) * (gsq - msq))) / (msq + asq);
  if (dlon < 0) {
    con = -con;
  }
  x = this.x0 + con;
  //con = Math.abs(con / (Math.PI * this.R));
  var q = asq + g;
  con = Math.PI * this.R * (m * q - al * Math.sqrt((msq + asq) * (asq + 1) - q * q)) / (msq + asq);
  if (lat >= 0) {
    //y = this.y0 + Math.PI * this.R * Math.sqrt(1 - con * con - 2 * al * con);
    y = this.y0 + con;
  }
  else {
    //y = this.y0 - Math.PI * this.R * Math.sqrt(1 - con * con - 2 * al * con);
    y = this.y0 - con;
  }
  p.x = x;
  p.y = y;
  return p;
}

/* Van Der Grinten inverse equations--mapping x,y to lat/long
  ---------------------------------------------------------*/
function inverse$7(p) {
  var lon, lat;
  var xx, yy, xys, c1, c2, c3;
  var a1;
  var m1;
  var con;
  var th1;
  var d;

  /* inverse equations
    -----------------*/
  p.x -= this.x0;
  p.y -= this.y0;
  con = Math.PI * this.R;
  xx = p.x / con;
  yy = p.y / con;
  xys = xx * xx + yy * yy;
  c1 = -Math.abs(yy) * (1 + xys);
  c2 = c1 - 2 * yy * yy + xx * xx;
  c3 = -2 * c1 + 1 + 2 * yy * yy + xys * xys;
  d = yy * yy / c3 + (2 * c2 * c2 * c2 / c3 / c3 / c3 - 9 * c1 * c2 / c3 / c3) / 27;
  a1 = (c1 - c2 * c2 / 3 / c3) / c3;
  m1 = 2 * Math.sqrt(-a1 / 3);
  con = ((3 * d) / a1) / m1;
  if (Math.abs(con) > 1) {
    if (con >= 0) {
      con = 1;
    }
    else {
      con = -1;
    }
  }
  th1 = Math.acos(con) / 3;
  if (p.y >= 0) {
    lat = (-m1 * Math.cos(th1 + Math.PI / 3) - c2 / 3 / c3) * Math.PI;
  }
  else {
    lat = -(-m1 * Math.cos(th1 + Math.PI / 3) - c2 / 3 / c3) * Math.PI;
  }

  if (Math.abs(xx) < EPSLN) {
    lon = this.long0;
  }
  else {
    lon = adjust_lon(this.long0 + Math.PI * (xys - 1 + Math.sqrt(1 + 2 * (xx * xx - yy * yy) + xys * xys)) / 2 / xx);
  }

  p.x = lon;
  p.y = lat;
  return p;
}

var names$7 = ["Van_der_Grinten_I", "VanDerGrinten", "vandg"];
var vandg = {
  init: init$7,
  forward: forward$7,
  inverse: inverse$7,
  names: names$7
};

function init$6() {
  this.sin_p12 = Math.sin(this.lat0);
  this.cos_p12 = Math.cos(this.lat0);
}

function forward$6(p) {
  var lon = p.x;
  var lat = p.y;
  var sinphi = Math.sin(p.y);
  var cosphi = Math.cos(p.y);
  var dlon = adjust_lon(lon - this.long0);
  var e0, e1, e2, e3, Mlp, Ml, tanphi, Nl1, Nl, psi, Az, G, H, GH, Hs, c, kp, cos_c, s, s2, s3, s4, s5;
  if (this.sphere) {
    if (Math.abs(this.sin_p12 - 1) <= EPSLN) {
      //North Pole case
      p.x = this.x0 + this.a * (HALF_PI - lat) * Math.sin(dlon);
      p.y = this.y0 - this.a * (HALF_PI - lat) * Math.cos(dlon);
      return p;
    }
    else if (Math.abs(this.sin_p12 + 1) <= EPSLN) {
      //South Pole case
      p.x = this.x0 + this.a * (HALF_PI + lat) * Math.sin(dlon);
      p.y = this.y0 + this.a * (HALF_PI + lat) * Math.cos(dlon);
      return p;
    }
    else {
      //default case
      cos_c = this.sin_p12 * sinphi + this.cos_p12 * cosphi * Math.cos(dlon);
      c = Math.acos(cos_c);
      kp = c ? c / Math.sin(c) : 1;
      p.x = this.x0 + this.a * kp * cosphi * Math.sin(dlon);
      p.y = this.y0 + this.a * kp * (this.cos_p12 * sinphi - this.sin_p12 * cosphi * Math.cos(dlon));
      return p;
    }
  }
  else {
    e0 = e0fn(this.es);
    e1 = e1fn(this.es);
    e2 = e2fn(this.es);
    e3 = e3fn(this.es);
    if (Math.abs(this.sin_p12 - 1) <= EPSLN) {
      //North Pole case
      Mlp = this.a * mlfn(e0, e1, e2, e3, HALF_PI);
      Ml = this.a * mlfn(e0, e1, e2, e3, lat);
      p.x = this.x0 + (Mlp - Ml) * Math.sin(dlon);
      p.y = this.y0 - (Mlp - Ml) * Math.cos(dlon);
      return p;
    }
    else if (Math.abs(this.sin_p12 + 1) <= EPSLN) {
      //South Pole case
      Mlp = this.a * mlfn(e0, e1, e2, e3, HALF_PI);
      Ml = this.a * mlfn(e0, e1, e2, e3, lat);
      p.x = this.x0 + (Mlp + Ml) * Math.sin(dlon);
      p.y = this.y0 + (Mlp + Ml) * Math.cos(dlon);
      return p;
    }
    else {
      //Default case
      tanphi = sinphi / cosphi;
      Nl1 = gN(this.a, this.e, this.sin_p12);
      Nl = gN(this.a, this.e, sinphi);
      psi = Math.atan((1 - this.es) * tanphi + this.es * Nl1 * this.sin_p12 / (Nl * cosphi));
      Az = Math.atan2(Math.sin(dlon), this.cos_p12 * Math.tan(psi) - this.sin_p12 * Math.cos(dlon));
      if (Az === 0) {
        s = Math.asin(this.cos_p12 * Math.sin(psi) - this.sin_p12 * Math.cos(psi));
      }
      else if (Math.abs(Math.abs(Az) - Math.PI) <= EPSLN) {
        s = -Math.asin(this.cos_p12 * Math.sin(psi) - this.sin_p12 * Math.cos(psi));
      }
      else {
        s = Math.asin(Math.sin(dlon) * Math.cos(psi) / Math.sin(Az));
      }
      G = this.e * this.sin_p12 / Math.sqrt(1 - this.es);
      H = this.e * this.cos_p12 * Math.cos(Az) / Math.sqrt(1 - this.es);
      GH = G * H;
      Hs = H * H;
      s2 = s * s;
      s3 = s2 * s;
      s4 = s3 * s;
      s5 = s4 * s;
      c = Nl1 * s * (1 - s2 * Hs * (1 - Hs) / 6 + s3 / 8 * GH * (1 - 2 * Hs) + s4 / 120 * (Hs * (4 - 7 * Hs) - 3 * G * G * (1 - 7 * Hs)) - s5 / 48 * GH);
      p.x = this.x0 + c * Math.sin(Az);
      p.y = this.y0 + c * Math.cos(Az);
      return p;
    }
  }


}

function inverse$6(p) {
  p.x -= this.x0;
  p.y -= this.y0;
  var rh, z, sinz, cosz, lon, lat, con, e0, e1, e2, e3, Mlp, M, N1, psi, Az, cosAz, tmp, A, B, D, Ee, F, sinpsi;
  if (this.sphere) {
    rh = Math.sqrt(p.x * p.x + p.y * p.y);
    if (rh > (2 * HALF_PI * this.a)) {
      return;
    }
    z = rh / this.a;

    sinz = Math.sin(z);
    cosz = Math.cos(z);

    lon = this.long0;
    if (Math.abs(rh) <= EPSLN) {
      lat = this.lat0;
    }
    else {
      lat = asinz(cosz * this.sin_p12 + (p.y * sinz * this.cos_p12) / rh);
      con = Math.abs(this.lat0) - HALF_PI;
      if (Math.abs(con) <= EPSLN) {
        if (this.lat0 >= 0) {
          lon = adjust_lon(this.long0 + Math.atan2(p.x, - p.y));
        }
        else {
          lon = adjust_lon(this.long0 - Math.atan2(-p.x, p.y));
        }
      }
      else {
        /*con = cosz - this.sin_p12 * Math.sin(lat);
        if ((Math.abs(con) < EPSLN) && (Math.abs(p.x) < EPSLN)) {
          //no-op, just keep the lon value as is
        } else {
          var temp = Math.atan2((p.x * sinz * this.cos_p12), (con * rh));
          lon = adjust_lon(this.long0 + Math.atan2((p.x * sinz * this.cos_p12), (con * rh)));
        }*/
        lon = adjust_lon(this.long0 + Math.atan2(p.x * sinz, rh * this.cos_p12 * cosz - p.y * this.sin_p12 * sinz));
      }
    }

    p.x = lon;
    p.y = lat;
    return p;
  }
  else {
    e0 = e0fn(this.es);
    e1 = e1fn(this.es);
    e2 = e2fn(this.es);
    e3 = e3fn(this.es);
    if (Math.abs(this.sin_p12 - 1) <= EPSLN) {
      //North pole case
      Mlp = this.a * mlfn(e0, e1, e2, e3, HALF_PI);
      rh = Math.sqrt(p.x * p.x + p.y * p.y);
      M = Mlp - rh;
      lat = imlfn(M / this.a, e0, e1, e2, e3);
      lon = adjust_lon(this.long0 + Math.atan2(p.x, - 1 * p.y));
      p.x = lon;
      p.y = lat;
      return p;
    }
    else if (Math.abs(this.sin_p12 + 1) <= EPSLN) {
      //South pole case
      Mlp = this.a * mlfn(e0, e1, e2, e3, HALF_PI);
      rh = Math.sqrt(p.x * p.x + p.y * p.y);
      M = rh - Mlp;

      lat = imlfn(M / this.a, e0, e1, e2, e3);
      lon = adjust_lon(this.long0 + Math.atan2(p.x, p.y));
      p.x = lon;
      p.y = lat;
      return p;
    }
    else {
      //default case
      rh = Math.sqrt(p.x * p.x + p.y * p.y);
      Az = Math.atan2(p.x, p.y);
      N1 = gN(this.a, this.e, this.sin_p12);
      cosAz = Math.cos(Az);
      tmp = this.e * this.cos_p12 * cosAz;
      A = -tmp * tmp / (1 - this.es);
      B = 3 * this.es * (1 - A) * this.sin_p12 * this.cos_p12 * cosAz / (1 - this.es);
      D = rh / N1;
      Ee = D - A * (1 + A) * Math.pow(D, 3) / 6 - B * (1 + 3 * A) * Math.pow(D, 4) / 24;
      F = 1 - A * Ee * Ee / 2 - D * Ee * Ee * Ee / 6;
      psi = Math.asin(this.sin_p12 * Math.cos(Ee) + this.cos_p12 * Math.sin(Ee) * cosAz);
      lon = adjust_lon(this.long0 + Math.asin(Math.sin(Az) * Math.sin(Ee) / Math.cos(psi)));
      sinpsi = Math.sin(psi);
      lat = Math.atan2((sinpsi - this.es * F * this.sin_p12) * Math.tan(psi), sinpsi * (1 - this.es));
      p.x = lon;
      p.y = lat;
      return p;
    }
  }

}

var names$6 = ["Azimuthal_Equidistant", "aeqd"];
var aeqd = {
  init: init$6,
  forward: forward$6,
  inverse: inverse$6,
  names: names$6
};

function init$5() {
  //double temp;      /* temporary variable    */

  /* Place parameters in static storage for common use
      -------------------------------------------------*/
  this.sin_p14 = Math.sin(this.lat0);
  this.cos_p14 = Math.cos(this.lat0);
}

/* Orthographic forward equations--mapping lat,long to x,y
    ---------------------------------------------------*/
function forward$5(p) {
  var sinphi, cosphi; /* sin and cos value        */
  var dlon; /* delta longitude value      */
  var coslon; /* cos of longitude        */
  var ksp; /* scale factor          */
  var g, x, y;
  var lon = p.x;
  var lat = p.y;
  /* Forward equations
      -----------------*/
  dlon = adjust_lon(lon - this.long0);

  sinphi = Math.sin(lat);
  cosphi = Math.cos(lat);

  coslon = Math.cos(dlon);
  g = this.sin_p14 * sinphi + this.cos_p14 * cosphi * coslon;
  ksp = 1;
  if ((g > 0) || (Math.abs(g) <= EPSLN)) {
    x = this.a * ksp * cosphi * Math.sin(dlon);
    y = this.y0 + this.a * ksp * (this.cos_p14 * sinphi - this.sin_p14 * cosphi * coslon);
  }
  p.x = x;
  p.y = y;
  return p;
}

function inverse$5(p) {
  var rh; /* height above ellipsoid      */
  var z; /* angle          */
  var sinz, cosz; /* sin of z and cos of z      */
  var con;
  var lon, lat;
  /* Inverse equations
      -----------------*/
  p.x -= this.x0;
  p.y -= this.y0;
  rh = Math.sqrt(p.x * p.x + p.y * p.y);
  z = asinz(rh / this.a);

  sinz = Math.sin(z);
  cosz = Math.cos(z);

  lon = this.long0;
  if (Math.abs(rh) <= EPSLN) {
    lat = this.lat0;
    p.x = lon;
    p.y = lat;
    return p;
  }
  lat = asinz(cosz * this.sin_p14 + (p.y * sinz * this.cos_p14) / rh);
  con = Math.abs(this.lat0) - HALF_PI;
  if (Math.abs(con) <= EPSLN) {
    if (this.lat0 >= 0) {
      lon = adjust_lon(this.long0 + Math.atan2(p.x, - p.y));
    }
    else {
      lon = adjust_lon(this.long0 - Math.atan2(-p.x, p.y));
    }
    p.x = lon;
    p.y = lat;
    return p;
  }
  lon = adjust_lon(this.long0 + Math.atan2((p.x * sinz), rh * this.cos_p14 * cosz - p.y * this.sin_p14 * sinz));
  p.x = lon;
  p.y = lat;
  return p;
}

var names$5 = ["ortho"];
var ortho = {
  init: init$5,
  forward: forward$5,
  inverse: inverse$5,
  names: names$5
};

// QSC projection rewritten from the original PROJ4

/* constants */
var FACE_ENUM = {
    FRONT: 1,
    RIGHT: 2,
    BACK: 3,
    LEFT: 4,
    TOP: 5,
    BOTTOM: 6
};

var AREA_ENUM = {
    AREA_0: 1,
    AREA_1: 2,
    AREA_2: 3,
    AREA_3: 4
};

function init$4() {

  this.x0 = this.x0 || 0;
  this.y0 = this.y0 || 0;
  this.lat0 = this.lat0 || 0;
  this.long0 = this.long0 || 0;
  this.lat_ts = this.lat_ts || 0;
  this.title = this.title || "Quadrilateralized Spherical Cube";

  /* Determine the cube face from the center of projection. */
  if (this.lat0 >= HALF_PI - FORTPI / 2.0) {
    this.face = FACE_ENUM.TOP;
  } else if (this.lat0 <= -(HALF_PI - FORTPI / 2.0)) {
    this.face = FACE_ENUM.BOTTOM;
  } else if (Math.abs(this.long0) <= FORTPI) {
    this.face = FACE_ENUM.FRONT;
  } else if (Math.abs(this.long0) <= HALF_PI + FORTPI) {
    this.face = this.long0 > 0.0 ? FACE_ENUM.RIGHT : FACE_ENUM.LEFT;
  } else {
    this.face = FACE_ENUM.BACK;
  }

  /* Fill in useful values for the ellipsoid <-> sphere shift
   * described in [LK12]. */
  if (this.es !== 0) {
    this.one_minus_f = 1 - (this.a - this.b) / this.a;
    this.one_minus_f_squared = this.one_minus_f * this.one_minus_f;
  }
}

// QSC forward equations--mapping lat,long to x,y
// -----------------------------------------------------------------
function forward$4(p) {
  var xy = {x: 0, y: 0};
  var lat, lon;
  var theta, phi;
  var t, mu;
  /* nu; */
  var area = {value: 0};

  // move lon according to projection's lon
  p.x -= this.long0;

  /* Convert the geodetic latitude to a geocentric latitude.
   * This corresponds to the shift from the ellipsoid to the sphere
   * described in [LK12]. */
  if (this.es !== 0) {//if (P->es != 0) {
    lat = Math.atan(this.one_minus_f_squared * Math.tan(p.y));
  } else {
    lat = p.y;
  }

  /* Convert the input lat, lon into theta, phi as used by QSC.
   * This depends on the cube face and the area on it.
   * For the top and bottom face, we can compute theta and phi
   * directly from phi, lam. For the other faces, we must use
   * unit sphere cartesian coordinates as an intermediate step. */
  lon = p.x; //lon = lp.lam;
  if (this.face === FACE_ENUM.TOP) {
    phi = HALF_PI - lat;
    if (lon >= FORTPI && lon <= HALF_PI + FORTPI) {
      area.value = AREA_ENUM.AREA_0;
      theta = lon - HALF_PI;
    } else if (lon > HALF_PI + FORTPI || lon <= -(HALF_PI + FORTPI)) {
      area.value = AREA_ENUM.AREA_1;
      theta = (lon > 0.0 ? lon - SPI : lon + SPI);
    } else if (lon > -(HALF_PI + FORTPI) && lon <= -FORTPI) {
      area.value = AREA_ENUM.AREA_2;
      theta = lon + HALF_PI;
    } else {
      area.value = AREA_ENUM.AREA_3;
      theta = lon;
    }
  } else if (this.face === FACE_ENUM.BOTTOM) {
    phi = HALF_PI + lat;
    if (lon >= FORTPI && lon <= HALF_PI + FORTPI) {
      area.value = AREA_ENUM.AREA_0;
      theta = -lon + HALF_PI;
    } else if (lon < FORTPI && lon >= -FORTPI) {
      area.value = AREA_ENUM.AREA_1;
      theta = -lon;
    } else if (lon < -FORTPI && lon >= -(HALF_PI + FORTPI)) {
      area.value = AREA_ENUM.AREA_2;
      theta = -lon - HALF_PI;
    } else {
      area.value = AREA_ENUM.AREA_3;
      theta = (lon > 0.0 ? -lon + SPI : -lon - SPI);
    }
  } else {
    var q, r, s;
    var sinlat, coslat;
    var sinlon, coslon;

    if (this.face === FACE_ENUM.RIGHT) {
      lon = qsc_shift_lon_origin(lon, +HALF_PI);
    } else if (this.face === FACE_ENUM.BACK) {
      lon = qsc_shift_lon_origin(lon, +SPI);
    } else if (this.face === FACE_ENUM.LEFT) {
      lon = qsc_shift_lon_origin(lon, -HALF_PI);
    }
    sinlat = Math.sin(lat);
    coslat = Math.cos(lat);
    sinlon = Math.sin(lon);
    coslon = Math.cos(lon);
    q = coslat * coslon;
    r = coslat * sinlon;
    s = sinlat;

    if (this.face === FACE_ENUM.FRONT) {
      phi = Math.acos(q);
      theta = qsc_fwd_equat_face_theta(phi, s, r, area);
    } else if (this.face === FACE_ENUM.RIGHT) {
      phi = Math.acos(r);
      theta = qsc_fwd_equat_face_theta(phi, s, -q, area);
    } else if (this.face === FACE_ENUM.BACK) {
      phi = Math.acos(-q);
      theta = qsc_fwd_equat_face_theta(phi, s, -r, area);
    } else if (this.face === FACE_ENUM.LEFT) {
      phi = Math.acos(-r);
      theta = qsc_fwd_equat_face_theta(phi, s, q, area);
    } else {
      /* Impossible */
      phi = theta = 0;
      area.value = AREA_ENUM.AREA_0;
    }
  }

  /* Compute mu and nu for the area of definition.
   * For mu, see Eq. (3-21) in [OL76], but note the typos:
   * compare with Eq. (3-14). For nu, see Eq. (3-38). */
  mu = Math.atan((12 / SPI) * (theta + Math.acos(Math.sin(theta) * Math.cos(FORTPI)) - HALF_PI));
  t = Math.sqrt((1 - Math.cos(phi)) / (Math.cos(mu) * Math.cos(mu)) / (1 - Math.cos(Math.atan(1 / Math.cos(theta)))));

  /* Apply the result to the real area. */
  if (area.value === AREA_ENUM.AREA_1) {
    mu += HALF_PI;
  } else if (area.value === AREA_ENUM.AREA_2) {
    mu += SPI;
  } else if (area.value === AREA_ENUM.AREA_3) {
    mu += 1.5 * SPI;
  }

  /* Now compute x, y from mu and nu */
  xy.x = t * Math.cos(mu);
  xy.y = t * Math.sin(mu);
  xy.x = xy.x * this.a + this.x0;
  xy.y = xy.y * this.a + this.y0;

  p.x = xy.x;
  p.y = xy.y;
  return p;
}

// QSC inverse equations--mapping x,y to lat/long
// -----------------------------------------------------------------
function inverse$4(p) {
  var lp = {lam: 0, phi: 0};
  var mu, nu, cosmu, tannu;
  var tantheta, theta, cosphi, phi;
  var t;
  var area = {value: 0};

  /* de-offset */
  p.x = (p.x - this.x0) / this.a;
  p.y = (p.y - this.y0) / this.a;

  /* Convert the input x, y to the mu and nu angles as used by QSC.
   * This depends on the area of the cube face. */
  nu = Math.atan(Math.sqrt(p.x * p.x + p.y * p.y));
  mu = Math.atan2(p.y, p.x);
  if (p.x >= 0.0 && p.x >= Math.abs(p.y)) {
    area.value = AREA_ENUM.AREA_0;
  } else if (p.y >= 0.0 && p.y >= Math.abs(p.x)) {
    area.value = AREA_ENUM.AREA_1;
    mu -= HALF_PI;
  } else if (p.x < 0.0 && -p.x >= Math.abs(p.y)) {
    area.value = AREA_ENUM.AREA_2;
    mu = (mu < 0.0 ? mu + SPI : mu - SPI);
  } else {
    area.value = AREA_ENUM.AREA_3;
    mu += HALF_PI;
  }

  /* Compute phi and theta for the area of definition.
   * The inverse projection is not described in the original paper, but some
   * good hints can be found here (as of 2011-12-14):
   * http://fits.gsfc.nasa.gov/fitsbits/saf.93/saf.9302
   * (search for "Message-Id: <9302181759.AA25477 at fits.cv.nrao.edu>") */
  t = (SPI / 12) * Math.tan(mu);
  tantheta = Math.sin(t) / (Math.cos(t) - (1 / Math.sqrt(2)));
  theta = Math.atan(tantheta);
  cosmu = Math.cos(mu);
  tannu = Math.tan(nu);
  cosphi = 1 - cosmu * cosmu * tannu * tannu * (1 - Math.cos(Math.atan(1 / Math.cos(theta))));
  if (cosphi < -1) {
    cosphi = -1;
  } else if (cosphi > +1) {
    cosphi = +1;
  }

  /* Apply the result to the real area on the cube face.
   * For the top and bottom face, we can compute phi and lam directly.
   * For the other faces, we must use unit sphere cartesian coordinates
   * as an intermediate step. */
  if (this.face === FACE_ENUM.TOP) {
    phi = Math.acos(cosphi);
    lp.phi = HALF_PI - phi;
    if (area.value === AREA_ENUM.AREA_0) {
      lp.lam = theta + HALF_PI;
    } else if (area.value === AREA_ENUM.AREA_1) {
      lp.lam = (theta < 0.0 ? theta + SPI : theta - SPI);
    } else if (area.value === AREA_ENUM.AREA_2) {
      lp.lam = theta - HALF_PI;
    } else /* area.value == AREA_ENUM.AREA_3 */ {
      lp.lam = theta;
    }
  } else if (this.face === FACE_ENUM.BOTTOM) {
    phi = Math.acos(cosphi);
    lp.phi = phi - HALF_PI;
    if (area.value === AREA_ENUM.AREA_0) {
      lp.lam = -theta + HALF_PI;
    } else if (area.value === AREA_ENUM.AREA_1) {
      lp.lam = -theta;
    } else if (area.value === AREA_ENUM.AREA_2) {
      lp.lam = -theta - HALF_PI;
    } else /* area.value == AREA_ENUM.AREA_3 */ {
      lp.lam = (theta < 0.0 ? -theta - SPI : -theta + SPI);
    }
  } else {
    /* Compute phi and lam via cartesian unit sphere coordinates. */
    var q, r, s;
    q = cosphi;
    t = q * q;
    if (t >= 1) {
      s = 0;
    } else {
      s = Math.sqrt(1 - t) * Math.sin(theta);
    }
    t += s * s;
    if (t >= 1) {
      r = 0;
    } else {
      r = Math.sqrt(1 - t);
    }
    /* Rotate q,r,s into the correct area. */
    if (area.value === AREA_ENUM.AREA_1) {
      t = r;
      r = -s;
      s = t;
    } else if (area.value === AREA_ENUM.AREA_2) {
      r = -r;
      s = -s;
    } else if (area.value === AREA_ENUM.AREA_3) {
      t = r;
      r = s;
      s = -t;
    }
    /* Rotate q,r,s into the correct cube face. */
    if (this.face === FACE_ENUM.RIGHT) {
      t = q;
      q = -r;
      r = t;
    } else if (this.face === FACE_ENUM.BACK) {
      q = -q;
      r = -r;
    } else if (this.face === FACE_ENUM.LEFT) {
      t = q;
      q = r;
      r = -t;
    }
    /* Now compute phi and lam from the unit sphere coordinates. */
    lp.phi = Math.acos(-s) - HALF_PI;
    lp.lam = Math.atan2(r, q);
    if (this.face === FACE_ENUM.RIGHT) {
      lp.lam = qsc_shift_lon_origin(lp.lam, -HALF_PI);
    } else if (this.face === FACE_ENUM.BACK) {
      lp.lam = qsc_shift_lon_origin(lp.lam, -SPI);
    } else if (this.face === FACE_ENUM.LEFT) {
      lp.lam = qsc_shift_lon_origin(lp.lam, +HALF_PI);
    }
  }

  /* Apply the shift from the sphere to the ellipsoid as described
   * in [LK12]. */
  if (this.es !== 0) {
    var invert_sign;
    var tanphi, xa;
    invert_sign = (lp.phi < 0 ? 1 : 0);
    tanphi = Math.tan(lp.phi);
    xa = this.b / Math.sqrt(tanphi * tanphi + this.one_minus_f_squared);
    lp.phi = Math.atan(Math.sqrt(this.a * this.a - xa * xa) / (this.one_minus_f * xa));
    if (invert_sign) {
      lp.phi = -lp.phi;
    }
  }

  lp.lam += this.long0;
  p.x = lp.lam;
  p.y = lp.phi;
  return p;
}

/* Helper function for forward projection: compute the theta angle
 * and determine the area number. */
function qsc_fwd_equat_face_theta(phi, y, x, area) {
  var theta;
  if (phi < EPSLN) {
    area.value = AREA_ENUM.AREA_0;
    theta = 0.0;
  } else {
    theta = Math.atan2(y, x);
    if (Math.abs(theta) <= FORTPI) {
      area.value = AREA_ENUM.AREA_0;
    } else if (theta > FORTPI && theta <= HALF_PI + FORTPI) {
      area.value = AREA_ENUM.AREA_1;
      theta -= HALF_PI;
    } else if (theta > HALF_PI + FORTPI || theta <= -(HALF_PI + FORTPI)) {
      area.value = AREA_ENUM.AREA_2;
      theta = (theta >= 0.0 ? theta - SPI : theta + SPI);
    } else {
      area.value = AREA_ENUM.AREA_3;
      theta += HALF_PI;
    }
  }
  return theta;
}

/* Helper function: shift the longitude. */
function qsc_shift_lon_origin(lon, offset) {
  var slon = lon + offset;
  if (slon < -SPI) {
    slon += TWO_PI;
  } else if (slon > +SPI) {
    slon -= TWO_PI;
  }
  return slon;
}

var names$4 = ["Quadrilateralized Spherical Cube", "Quadrilateralized_Spherical_Cube", "qsc"];
var qsc = {
  init: init$4,
  forward: forward$4,
  inverse: inverse$4,
  names: names$4
};

// Robinson projection

var COEFS_X = [
    [1.0000, 2.2199e-17, -7.15515e-05, 3.1103e-06],
    [0.9986, -0.000482243, -2.4897e-05, -1.3309e-06],
    [0.9954, -0.00083103, -4.48605e-05, -9.86701e-07],
    [0.9900, -0.00135364, -5.9661e-05, 3.6777e-06],
    [0.9822, -0.00167442, -4.49547e-06, -5.72411e-06],
    [0.9730, -0.00214868, -9.03571e-05, 1.8736e-08],
    [0.9600, -0.00305085, -9.00761e-05, 1.64917e-06],
    [0.9427, -0.00382792, -6.53386e-05, -2.6154e-06],
    [0.9216, -0.00467746, -0.00010457, 4.81243e-06],
    [0.8962, -0.00536223, -3.23831e-05, -5.43432e-06],
    [0.8679, -0.00609363, -0.000113898, 3.32484e-06],
    [0.8350, -0.00698325, -6.40253e-05, 9.34959e-07],
    [0.7986, -0.00755338, -5.00009e-05, 9.35324e-07],
    [0.7597, -0.00798324, -3.5971e-05, -2.27626e-06],
    [0.7186, -0.00851367, -7.01149e-05, -8.6303e-06],
    [0.6732, -0.00986209, -0.000199569, 1.91974e-05],
    [0.6213, -0.010418, 8.83923e-05, 6.24051e-06],
    [0.5722, -0.00906601, 0.000182, 6.24051e-06],
    [0.5322, -0.00677797, 0.000275608, 6.24051e-06]
];

var COEFS_Y = [
    [-5.20417e-18, 0.0124, 1.21431e-18, -8.45284e-11],
    [0.0620, 0.0124, -1.26793e-09, 4.22642e-10],
    [0.1240, 0.0124, 5.07171e-09, -1.60604e-09],
    [0.1860, 0.0123999, -1.90189e-08, 6.00152e-09],
    [0.2480, 0.0124002, 7.10039e-08, -2.24e-08],
    [0.3100, 0.0123992, -2.64997e-07, 8.35986e-08],
    [0.3720, 0.0124029, 9.88983e-07, -3.11994e-07],
    [0.4340, 0.0123893, -3.69093e-06, -4.35621e-07],
    [0.4958, 0.0123198, -1.02252e-05, -3.45523e-07],
    [0.5571, 0.0121916, -1.54081e-05, -5.82288e-07],
    [0.6176, 0.0119938, -2.41424e-05, -5.25327e-07],
    [0.6769, 0.011713, -3.20223e-05, -5.16405e-07],
    [0.7346, 0.0113541, -3.97684e-05, -6.09052e-07],
    [0.7903, 0.0109107, -4.89042e-05, -1.04739e-06],
    [0.8435, 0.0103431, -6.4615e-05, -1.40374e-09],
    [0.8936, 0.00969686, -6.4636e-05, -8.547e-06],
    [0.9394, 0.00840947, -0.000192841, -4.2106e-06],
    [0.9761, 0.00616527, -0.000256, -4.2106e-06],
    [1.0000, 0.00328947, -0.000319159, -4.2106e-06]
];

var FXC = 0.8487;
var FYC = 1.3523;
var C1 = R2D/5; // rad to 5-degree interval
var RC1 = 1/C1;
var NODES = 18;

var poly3_val = function(coefs, x) {
    return coefs[0] + x * (coefs[1] + x * (coefs[2] + x * coefs[3]));
};

var poly3_der = function(coefs, x) {
    return coefs[1] + x * (2 * coefs[2] + x * 3 * coefs[3]);
};

function newton_rapshon(f_df, start, max_err, iters) {
    var x = start;
    for (; iters; --iters) {
        var upd = f_df(x);
        x -= upd;
        if (Math.abs(upd) < max_err) {
            break;
        }
    }
    return x;
}

function init$3() {
    this.x0 = this.x0 || 0;
    this.y0 = this.y0 || 0;
    this.long0 = this.long0 || 0;
    this.es = 0;
    this.title = this.title || "Robinson";
}

function forward$3(ll) {
    var lon = adjust_lon(ll.x - this.long0);

    var dphi = Math.abs(ll.y);
    var i = Math.floor(dphi * C1);
    if (i < 0) {
        i = 0;
    } else if (i >= NODES) {
        i = NODES - 1;
    }
    dphi = R2D * (dphi - RC1 * i);
    var xy = {
        x: poly3_val(COEFS_X[i], dphi) * lon,
        y: poly3_val(COEFS_Y[i], dphi)
    };
    if (ll.y < 0) {
        xy.y = -xy.y;
    }

    xy.x = xy.x * this.a * FXC + this.x0;
    xy.y = xy.y * this.a * FYC + this.y0;
    return xy;
}

function inverse$3(xy) {
    var ll = {
        x: (xy.x - this.x0) / (this.a * FXC),
        y: Math.abs(xy.y - this.y0) / (this.a * FYC)
    };

    if (ll.y >= 1) { // pathologic case
        ll.x /= COEFS_X[NODES][0];
        ll.y = xy.y < 0 ? -HALF_PI : HALF_PI;
    } else {
        // find table interval
        var i = Math.floor(ll.y * NODES);
        if (i < 0) {
            i = 0;
        } else if (i >= NODES) {
            i = NODES - 1;
        }
        for (;;) {
            if (COEFS_Y[i][0] > ll.y) {
                --i;
            } else if (COEFS_Y[i+1][0] <= ll.y) {
                ++i;
            } else {
                break;
            }
        }
        // linear interpolation in 5 degree interval
        var coefs = COEFS_Y[i];
        var t = 5 * (ll.y - coefs[0]) / (COEFS_Y[i+1][0] - coefs[0]);
        // find t so that poly3_val(coefs, t) = ll.y
        t = newton_rapshon(function(x) {
            return (poly3_val(coefs, x) - ll.y) / poly3_der(coefs, x);
        }, t, EPSLN, 100);

        ll.x /= poly3_val(COEFS_X[i], t);
        ll.y = (5 * i + t) * D2R$1;
        if (xy.y < 0) {
            ll.y = -ll.y;
        }
    }

    ll.x = adjust_lon(ll.x + this.long0);
    return ll;
}

var names$3 = ["Robinson", "robin"];
var robin = {
  init: init$3,
  forward: forward$3,
  inverse: inverse$3,
  names: names$3
};

function init$2() {
    this.name = 'geocent';

}

function forward$2(p) {
    var point = geodeticToGeocentric(p, this.es, this.a);
    return point;
}

function inverse$2(p) {
    var point = geocentricToGeodetic(p, this.es, this.a, this.b);
    return point;
}

var names$2 = ["Geocentric", 'geocentric', "geocent", "Geocent"];
var geocent = {
    init: init$2,
    forward: forward$2,
    inverse: inverse$2,
    names: names$2
};

var mode = {
  N_POLE: 0,
  S_POLE: 1,
  EQUIT: 2,
  OBLIQ: 3
};

var params = {
  h:     { def: 100000, num: true },           // default is Karman line, no default in PROJ.7
  azi:   { def: 0, num: true, degrees: true }, // default is North
  tilt:  { def: 0, num: true, degrees: true }, // default is Nadir
  long0: { def: 0, num: true },                // default is Greenwich, conversion to rad is automatic
  lat0:  { def: 0, num: true }                 // default is Equator, conversion to rad is automatic
};

function init$1() {
  Object.keys(params).forEach(function (p) {
    if (typeof this[p] === "undefined") {
      this[p] = params[p].def;
    } else if (params[p].num && isNaN(this[p])) {
      throw new Error("Invalid parameter value, must be numeric " + p + " = " + this[p]);
    } else if (params[p].num) {
      this[p] = parseFloat(this[p]);
    }
    if (params[p].degrees) {
      this[p] = this[p] * D2R$1;
    }
  }.bind(this));

  if (Math.abs((Math.abs(this.lat0) - HALF_PI)) < EPSLN) {
    this.mode = this.lat0 < 0 ? mode.S_POLE : mode.N_POLE;
  } else if (Math.abs(this.lat0) < EPSLN) {
    this.mode = mode.EQUIT;
  } else {
    this.mode = mode.OBLIQ;
    this.sinph0 = Math.sin(this.lat0);
    this.cosph0 = Math.cos(this.lat0);
  }

  this.pn1 = this.h / this.a;  // Normalize relative to the Earth's radius

  if (this.pn1 <= 0 || this.pn1 > 1e10) {
    throw new Error("Invalid height");
  }
  
  this.p = 1 + this.pn1;
  this.rp = 1 / this.p;
  this.h1 = 1 / this.pn1;
  this.pfact = (this.p + 1) * this.h1;
  this.es = 0;

  var omega = this.tilt;
  var gamma = this.azi;
  this.cg = Math.cos(gamma);
  this.sg = Math.sin(gamma);
  this.cw = Math.cos(omega);
  this.sw = Math.sin(omega);
}

function forward$1(p) {
  p.x -= this.long0;
  var sinphi = Math.sin(p.y);
  var cosphi = Math.cos(p.y);
  var coslam = Math.cos(p.x);
  var x, y;
  switch (this.mode) {
    case mode.OBLIQ:
      y = this.sinph0 * sinphi + this.cosph0 * cosphi * coslam;
      break;
    case mode.EQUIT:
      y = cosphi * coslam;
      break;
    case mode.S_POLE:
      y = -sinphi;
      break;
    case mode.N_POLE:
      y = sinphi;
      break;
  }
  y = this.pn1 / (this.p - y);
  x = y * cosphi * Math.sin(p.x);

  switch (this.mode) {
    case mode.OBLIQ:
      y *= this.cosph0 * sinphi - this.sinph0 * cosphi * coslam;
      break;
    case mode.EQUIT:
      y *= sinphi;
      break;
    case mode.N_POLE:
      y *= -(cosphi * coslam);
      break;
    case mode.S_POLE:
      y *= cosphi * coslam;
      break;
  }

  // Tilt 
  var yt, ba;
  yt = y * this.cg + x * this.sg;
  ba = 1 / (yt * this.sw * this.h1 + this.cw);
  x = (x * this.cg - y * this.sg) * this.cw * ba;
  y = yt * ba;

  p.x = x * this.a;
  p.y = y * this.a;
  return p;
}

function inverse$1(p) {
  p.x /= this.a;
  p.y /= this.a;
  var r = { x: p.x, y: p.y };

  // Un-Tilt
  var bm, bq, yt;
  yt = 1 / (this.pn1 - p.y * this.sw);
  bm = this.pn1 * p.x * yt;
  bq = this.pn1 * p.y * this.cw * yt;
  p.x = bm * this.cg + bq * this.sg;
  p.y = bq * this.cg - bm * this.sg;

  var rh = hypot(p.x, p.y);
  if (Math.abs(rh) < EPSLN) {
    r.x = 0;
    r.y = p.y;
  } else {
    var cosz, sinz;
    sinz = 1 - rh * rh * this.pfact;
    sinz = (this.p - Math.sqrt(sinz)) / (this.pn1 / rh + rh / this.pn1);
    cosz = Math.sqrt(1 - sinz * sinz);
    switch (this.mode) {
      case mode.OBLIQ:
        r.y = Math.asin(cosz * this.sinph0 + p.y * sinz * this.cosph0 / rh);
        p.y = (cosz - this.sinph0 * Math.sin(r.y)) * rh;
        p.x *= sinz * this.cosph0;
        break;
      case mode.EQUIT:
        r.y = Math.asin(p.y * sinz / rh);
        p.y = cosz * rh;
        p.x *= sinz;
        break;
      case mode.N_POLE:
        r.y = Math.asin(cosz);
        p.y = -p.y;
        break;
      case mode.S_POLE:
        r.y = -Math.asin(cosz);
        break;
    }
    r.x = Math.atan2(p.x, p.y);
  }

  p.x = r.x + this.long0;
  p.y = r.y;
  return p;
}

var names$1 = ["Tilted_Perspective", "tpers"];
var tpers = {
  init: init$1,
  forward: forward$1,
  inverse: inverse$1,
  names: names$1
};

function init() {
    this.flip_axis = (this.sweep === 'x' ? 1 : 0);
    this.h = Number(this.h);
    this.radius_g_1 = this.h / this.a;

    if (this.radius_g_1 <= 0 || this.radius_g_1 > 1e10) {
        throw new Error();
    }

    this.radius_g = 1.0 + this.radius_g_1;
    this.C = this.radius_g * this.radius_g - 1.0;

    if (this.es !== 0.0) {
        var one_es = 1.0 - this.es;
        var rone_es = 1 / one_es;

        this.radius_p = Math.sqrt(one_es);
        this.radius_p2 = one_es;
        this.radius_p_inv2 = rone_es;

        this.shape = 'ellipse'; // Use as a condition in the forward and inverse functions.
    } else {
        this.radius_p = 1.0;
        this.radius_p2 = 1.0;
        this.radius_p_inv2 = 1.0;

        this.shape = 'sphere';  // Use as a condition in the forward and inverse functions.
    }

    if (!this.title) {
        this.title = "Geostationary Satellite View";
    }
}

function forward(p) {
    var lon = p.x;
    var lat = p.y;
    var tmp, v_x, v_y, v_z;
    lon = lon - this.long0;

    if (this.shape === 'ellipse') {
        lat = Math.atan(this.radius_p2 * Math.tan(lat));
        var r = this.radius_p / hypot(this.radius_p * Math.cos(lat), Math.sin(lat));

        v_x = r * Math.cos(lon) * Math.cos(lat);
        v_y = r * Math.sin(lon) * Math.cos(lat);
        v_z = r * Math.sin(lat);

        if (((this.radius_g - v_x) * v_x - v_y * v_y - v_z * v_z * this.radius_p_inv2) < 0.0) {
            p.x = Number.NaN;
            p.y = Number.NaN;
            return p;
        }

        tmp = this.radius_g - v_x;
        if (this.flip_axis) {
            p.x = this.radius_g_1 * Math.atan(v_y / hypot(v_z, tmp));
            p.y = this.radius_g_1 * Math.atan(v_z / tmp);
        } else {
            p.x = this.radius_g_1 * Math.atan(v_y / tmp);
            p.y = this.radius_g_1 * Math.atan(v_z / hypot(v_y, tmp));
        }
    } else if (this.shape === 'sphere') {
        tmp = Math.cos(lat);
        v_x = Math.cos(lon) * tmp;
        v_y = Math.sin(lon) * tmp;
        v_z = Math.sin(lat);
        tmp = this.radius_g - v_x;

        if (this.flip_axis) {
            p.x = this.radius_g_1 * Math.atan(v_y / hypot(v_z, tmp));
            p.y = this.radius_g_1 * Math.atan(v_z / tmp);
        } else {
            p.x = this.radius_g_1 * Math.atan(v_y / tmp);
            p.y = this.radius_g_1 * Math.atan(v_z / hypot(v_y, tmp));
        }
    }
    p.x = p.x * this.a;
    p.y = p.y * this.a;
    return p;
}

function inverse(p) {
    var v_x = -1.0;
    var v_y = 0.0;
    var v_z = 0.0;
    var a, b, det, k;

    p.x = p.x / this.a;
    p.y = p.y / this.a;

    if (this.shape === 'ellipse') {
        if (this.flip_axis) {
            v_z = Math.tan(p.y / this.radius_g_1);
            v_y = Math.tan(p.x / this.radius_g_1) * hypot(1.0, v_z);
        } else {
            v_y = Math.tan(p.x / this.radius_g_1);
            v_z = Math.tan(p.y / this.radius_g_1) * hypot(1.0, v_y);
        }

        var v_zp = v_z / this.radius_p;
        a = v_y * v_y + v_zp * v_zp + v_x * v_x;
        b = 2 * this.radius_g * v_x;
        det = (b * b) - 4 * a * this.C;

        if (det < 0.0) {
            p.x = Number.NaN;
            p.y = Number.NaN;
            return p;
        }

        k = (-b - Math.sqrt(det)) / (2.0 * a);
        v_x = this.radius_g + k * v_x;
        v_y *= k;
        v_z *= k;

        p.x = Math.atan2(v_y, v_x);
        p.y = Math.atan(v_z * Math.cos(p.x) / v_x);
        p.y = Math.atan(this.radius_p_inv2 * Math.tan(p.y));
    } else if (this.shape === 'sphere') {
        if (this.flip_axis) {
            v_z = Math.tan(p.y / this.radius_g_1);
            v_y = Math.tan(p.x / this.radius_g_1) * Math.sqrt(1.0 + v_z * v_z);
        } else {
            v_y = Math.tan(p.x / this.radius_g_1);
            v_z = Math.tan(p.y / this.radius_g_1) * Math.sqrt(1.0 + v_y * v_y);
        }

        a = v_y * v_y + v_z * v_z + v_x * v_x;
        b = 2 * this.radius_g * v_x;
        det = (b * b) - 4 * a * this.C;
        if (det < 0.0) {
            p.x = Number.NaN;
            p.y = Number.NaN;
            return p;
        }

        k = (-b - Math.sqrt(det)) / (2.0 * a);
        v_x = this.radius_g + k * v_x;
        v_y *= k;
        v_z *= k;

        p.x = Math.atan2(v_y, v_x);
        p.y = Math.atan(v_z * Math.cos(p.x) / v_x);
    }
    p.x = p.x + this.long0;
    return p;
}

var names = ["Geostationary Satellite View", "Geostationary_Satellite", "geos"];
var geos = {
    init: init,
    forward: forward,
    inverse: inverse,
    names: names,
};

function includedProjections(proj4){
  proj4.Proj.projections.add(tmerc);
  proj4.Proj.projections.add(etmerc);
  proj4.Proj.projections.add(utm);
  proj4.Proj.projections.add(sterea);
  proj4.Proj.projections.add(stere);
  proj4.Proj.projections.add(somerc);
  proj4.Proj.projections.add(omerc);
  proj4.Proj.projections.add(lcc);
  proj4.Proj.projections.add(krovak);
  proj4.Proj.projections.add(cass);
  proj4.Proj.projections.add(laea);
  proj4.Proj.projections.add(aea);
  proj4.Proj.projections.add(gnom);
  proj4.Proj.projections.add(cea);
  proj4.Proj.projections.add(eqc);
  proj4.Proj.projections.add(poly);
  proj4.Proj.projections.add(nzmg);
  proj4.Proj.projections.add(mill);
  proj4.Proj.projections.add(sinu);
  proj4.Proj.projections.add(moll);
  proj4.Proj.projections.add(eqdc);
  proj4.Proj.projections.add(vandg);
  proj4.Proj.projections.add(aeqd);
  proj4.Proj.projections.add(ortho);
  proj4.Proj.projections.add(qsc);
  proj4.Proj.projections.add(robin);
  proj4.Proj.projections.add(geocent);
  proj4.Proj.projections.add(tpers);
  proj4.Proj.projections.add(geos);
}

proj4.defaultDatum = 'WGS84'; //default datum
proj4.Proj = Projection;
proj4.WGS84 = new proj4.Proj('WGS84');
proj4.Point = Point;
proj4.toPoint = common;
proj4.defs = defs;
proj4.nadgrid = nadgrid;
proj4.transform = transform;
proj4.mgrs = mgrs;
proj4.version = '__VERSION__';
includedProjections(proj4);

/**
 * @module helpers
 */
/**
 * Wraps a GeoJSON {@link Geometry} in a GeoJSON {@link Feature}.
 *
 * @name feature
 * @param {Geometry} geometry input geometry
 * @param {Object} [properties={}] an Object of key-value pairs to add as properties
 * @param {Object} [options={}] Optional Parameters
 * @param {Array<number>} [options.bbox] Bounding Box Array [west, south, east, north] associated with the Feature
 * @param {string|number} [options.id] Identifier associated with the Feature
 * @returns {Feature} a GeoJSON Feature
 * @example
 * var geometry = {
 *   "type": "Point",
 *   "coordinates": [110, 50]
 * };
 *
 * var feature = turf.feature(geometry);
 *
 * //=feature
 */
function feature(geom, properties, options) {
    if (options === void 0) { options = {}; }
    var feat = { type: "Feature" };
    if (options.id === 0 || options.id) {
        feat.id = options.id;
    }
    if (options.bbox) {
        feat.bbox = options.bbox;
    }
    feat.properties = properties || {};
    feat.geometry = geom;
    return feat;
}
/**
 * Creates a {@link Polygon} {@link Feature} from an Array of LinearRings.
 *
 * @name polygon
 * @param {Array<Array<Array<number>>>} coordinates an array of LinearRings
 * @param {Object} [properties={}] an Object of key-value pairs to add as properties
 * @param {Object} [options={}] Optional Parameters
 * @param {Array<number>} [options.bbox] Bounding Box Array [west, south, east, north] associated with the Feature
 * @param {string|number} [options.id] Identifier associated with the Feature
 * @returns {Feature<Polygon>} Polygon Feature
 * @example
 * var polygon = turf.polygon([[[-5, 52], [-4, 56], [-2, 51], [-7, 54], [-5, 52]]], { name: 'poly1' });
 *
 * //=polygon
 */
function polygon(coordinates, properties, options) {
    if (options === void 0) { options = {}; }
    for (var _i = 0, coordinates_1 = coordinates; _i < coordinates_1.length; _i++) {
        var ring = coordinates_1[_i];
        if (ring.length < 4) {
            throw new Error("Each LinearRing of a Polygon must have 4 or more Positions.");
        }
        for (var j = 0; j < ring[ring.length - 1].length; j++) {
            // Check if first point of Polygon contains two numbers
            if (ring[ring.length - 1][j] !== ring[0][j]) {
                throw new Error("First and last Position are not equivalent.");
            }
        }
    }
    var geom = {
        type: "Polygon",
        coordinates: coordinates,
    };
    return feature(geom, properties, options);
}
/**
 * Creates a {@link Feature<MultiPolygon>} based on a
 * coordinate array. Properties can be added optionally.
 *
 * @name multiPolygon
 * @param {Array<Array<Array<Array<number>>>>} coordinates an array of Polygons
 * @param {Object} [properties={}] an Object of key-value pairs to add as properties
 * @param {Object} [options={}] Optional Parameters
 * @param {Array<number>} [options.bbox] Bounding Box Array [west, south, east, north] associated with the Feature
 * @param {string|number} [options.id] Identifier associated with the Feature
 * @returns {Feature<MultiPolygon>} a multipolygon feature
 * @throws {Error} if no coordinates are passed
 * @example
 * var multiPoly = turf.multiPolygon([[[[0,0],[0,10],[10,10],[10,0],[0,0]]]]);
 *
 * //=multiPoly
 *
 */
function multiPolygon(coordinates, properties, options) {
    if (options === void 0) { options = {}; }
    var geom = {
        type: "MultiPolygon",
        coordinates: coordinates,
    };
    return feature(geom, properties, options);
}

// configure proj4 in order to convert GIS coordinates to web mercator
proj4.defs('EPSG:25832', '+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs');
const fromETRS89$1 = new proj4.Proj('EPSG:25832');
const toWGS84$1 = new proj4.Proj('WGS84');

const alwaysParseAsArrays = [
  'nn.land.parzelle',
  'wfs:FeatureCollection.gml:featureMember'
];
const options = {
  ignoreAttributes: true,
  parseTagValue: true,
  trimValues: true,
  parseAttributeValue: true,
  isArray: (name, jpath) => {
    if (alwaysParseAsArrays.indexOf(jpath) !== -1) return true
  }
};

function parseXML (xml) {
  if (fxp.XMLValidator.validate(xml) !== true) throw new Error('Invalid XML structure.')
  const parser = new fxp.XMLParser(options);
  const json = parser.parse(xml);

  const basis = {
    applicationYear: getSafe(() => json.nn.antragsjahr),
    farmId: getSafe(() => json.nn.bnrzd),
    state: getSafe(() => json.nn.land.bezeichnung),
    fieldBlockConstant: getSafe(() => json.nn.land.feldblockkonstante),
    stateNo: getSafe(() => json.nn.land.nummer)
  };

  if (getSafe(() => json.nn.land.parzelle)) {
    return json.nn.land.parzelle.map(field => {
      return {
        ...basis,
        ...field
      }
    })
  } else {
    return new Error('No fields found in XML.')
  }
}

function parseGML (gml) {
  if (fxp.XMLValidator.validate(gml) !== true) {
    throw new Error('Invalid GML structure.')
  }
  const parser = new fxp.XMLParser(options);
  const json = parser.parse(gml);
  if (getSafe(() => json['wfs:FeatureCollection']['gml:featureMember'])) {
    const results = [];
    json['wfs:FeatureCollection']['gml:featureMember'].forEach(field => {
      const id = getSafe(() => field['elan:tschlag']['elan:SCHLAGNR']);
      const year = getSafe(() => field['elan:tschlag']['elan:WIRTSCHAFTSJAHR']);
      let coordinates = getSafe(() => field['elan:tschlag']['elan:GEO_COORD_']['gml:Polygon']['gml:outerBoundaryIs']['gml:LinearRing']['gml:coordinates']);

      if (!coordinates) return

      // split coordinate string into array of strings
      coordinates = coordinates.split(' ');
      // then into array of arrays and transform string values to numbers
      coordinates = coordinates.map(pair => {
        return pair.split(',').map(coord => {
          return Number(coord)
        })
      });

      coordinates = coordinates.map(latlng => {
        return proj4(fromETRS89$1, toWGS84$1, latlng)
      });
      const feature = polygon([coordinates], {
        number: id,
        year
      });

      return results.push({
        schlag: {
          nummer: id
        },
        geometry: feature
      })
    });

    return results
  } else {
    throw new Error('No fields found in GML.')
  }
}

function join (xml, gml) {
  return xml.map(field => {
    const geometry = gml.find(
      // eslint-disable-next-line eqeqeq
      tschlag => tschlag.schlag.nummer == field.schlag.nummer
    );
    if (!geometry) return field
    return {
      ...geometry,
      ...field
    }
  })
}

function shape (shp, dbf) {
  return read(shp, dbf)
}

function xml (xml) {
  const parser = new fxp.XMLParser({ ignoreAttributes: false }, true);
  return parser.parse(xml, true)
}

function dataExperts (xml, gml) {
  return join(parseXML(xml), parseGML(gml))
}

/**
 * Callback for coordEach
 *
 * @callback coordEachCallback
 * @param {Array<number>} currentCoord The current coordinate being processed.
 * @param {number} coordIndex The current index of the coordinate being processed.
 * @param {number} featureIndex The current index of the Feature being processed.
 * @param {number} multiFeatureIndex The current index of the Multi-Feature being processed.
 * @param {number} geometryIndex The current index of the Geometry being processed.
 */

/**
 * Iterate over coordinates in any GeoJSON object, similar to Array.forEach()
 *
 * @name coordEach
 * @param {FeatureCollection|Feature|Geometry} geojson any GeoJSON object
 * @param {Function} callback a method that takes (currentCoord, coordIndex, featureIndex, multiFeatureIndex)
 * @param {boolean} [excludeWrapCoord=false] whether or not to include the final coordinate of LinearRings that wraps the ring in its iteration.
 * @returns {void}
 * @example
 * var features = turf.featureCollection([
 *   turf.point([26, 37], {"foo": "bar"}),
 *   turf.point([36, 53], {"hello": "world"})
 * ]);
 *
 * turf.coordEach(features, function (currentCoord, coordIndex, featureIndex, multiFeatureIndex, geometryIndex) {
 *   //=currentCoord
 *   //=coordIndex
 *   //=featureIndex
 *   //=multiFeatureIndex
 *   //=geometryIndex
 * });
 */
function coordEach(geojson, callback, excludeWrapCoord) {
  // Handles null Geometry -- Skips this GeoJSON
  if (geojson === null) return;
  var j,
    k,
    l,
    geometry,
    stopG,
    coords,
    geometryMaybeCollection,
    wrapShrink = 0,
    coordIndex = 0,
    isGeometryCollection,
    type = geojson.type,
    isFeatureCollection = type === "FeatureCollection",
    isFeature = type === "Feature",
    stop = isFeatureCollection ? geojson.features.length : 1;

  // This logic may look a little weird. The reason why it is that way
  // is because it's trying to be fast. GeoJSON supports multiple kinds
  // of objects at its root: FeatureCollection, Features, Geometries.
  // This function has the responsibility of handling all of them, and that
  // means that some of the `for` loops you see below actually just don't apply
  // to certain inputs. For instance, if you give this just a
  // Point geometry, then both loops are short-circuited and all we do
  // is gradually rename the input until it's called 'geometry'.
  //
  // This also aims to allocate as few resources as possible: just a
  // few numbers and booleans, rather than any temporary arrays as would
  // be required with the normalization approach.
  for (var featureIndex = 0; featureIndex < stop; featureIndex++) {
    geometryMaybeCollection = isFeatureCollection
      ? geojson.features[featureIndex].geometry
      : isFeature
      ? geojson.geometry
      : geojson;
    isGeometryCollection = geometryMaybeCollection
      ? geometryMaybeCollection.type === "GeometryCollection"
      : false;
    stopG = isGeometryCollection
      ? geometryMaybeCollection.geometries.length
      : 1;

    for (var geomIndex = 0; geomIndex < stopG; geomIndex++) {
      var multiFeatureIndex = 0;
      var geometryIndex = 0;
      geometry = isGeometryCollection
        ? geometryMaybeCollection.geometries[geomIndex]
        : geometryMaybeCollection;

      // Handles null Geometry -- Skips this geometry
      if (geometry === null) continue;
      coords = geometry.coordinates;
      var geomType = geometry.type;

      wrapShrink =
        excludeWrapCoord &&
        (geomType === "Polygon" || geomType === "MultiPolygon")
          ? 1
          : 0;

      switch (geomType) {
        case null:
          break;
        case "Point":
          if (
            callback(
              coords,
              coordIndex,
              featureIndex,
              multiFeatureIndex,
              geometryIndex
            ) === false
          )
            return false;
          coordIndex++;
          multiFeatureIndex++;
          break;
        case "LineString":
        case "MultiPoint":
          for (j = 0; j < coords.length; j++) {
            if (
              callback(
                coords[j],
                coordIndex,
                featureIndex,
                multiFeatureIndex,
                geometryIndex
              ) === false
            )
              return false;
            coordIndex++;
            if (geomType === "MultiPoint") multiFeatureIndex++;
          }
          if (geomType === "LineString") multiFeatureIndex++;
          break;
        case "Polygon":
        case "MultiLineString":
          for (j = 0; j < coords.length; j++) {
            for (k = 0; k < coords[j].length - wrapShrink; k++) {
              if (
                callback(
                  coords[j][k],
                  coordIndex,
                  featureIndex,
                  multiFeatureIndex,
                  geometryIndex
                ) === false
              )
                return false;
              coordIndex++;
            }
            if (geomType === "MultiLineString") multiFeatureIndex++;
            if (geomType === "Polygon") geometryIndex++;
          }
          if (geomType === "Polygon") multiFeatureIndex++;
          break;
        case "MultiPolygon":
          for (j = 0; j < coords.length; j++) {
            geometryIndex = 0;
            for (k = 0; k < coords[j].length; k++) {
              for (l = 0; l < coords[j][k].length - wrapShrink; l++) {
                if (
                  callback(
                    coords[j][k][l],
                    coordIndex,
                    featureIndex,
                    multiFeatureIndex,
                    geometryIndex
                  ) === false
                )
                  return false;
                coordIndex++;
              }
              geometryIndex++;
            }
            multiFeatureIndex++;
          }
          break;
        case "GeometryCollection":
          for (j = 0; j < geometry.geometries.length; j++)
            if (
              coordEach(geometry.geometries[j], callback, excludeWrapCoord) ===
              false
            )
              return false;
          break;
        default:
          throw new Error("Unknown Geometry Type");
      }
    }
  }
}

var polygonClipping_umd = {exports: {}};

(function (module, exports) {
	(function (global, factory) {
	  module.exports = factory() ;
	}(commonjsGlobal, (function () {
	  function _classCallCheck(instance, Constructor) {
	    if (!(instance instanceof Constructor)) {
	      throw new TypeError("Cannot call a class as a function");
	    }
	  }

	  function _defineProperties(target, props) {
	    for (var i = 0; i < props.length; i++) {
	      var descriptor = props[i];
	      descriptor.enumerable = descriptor.enumerable || false;
	      descriptor.configurable = true;
	      if ("value" in descriptor) descriptor.writable = true;
	      Object.defineProperty(target, descriptor.key, descriptor);
	    }
	  }

	  function _createClass(Constructor, protoProps, staticProps) {
	    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
	    if (staticProps) _defineProperties(Constructor, staticProps);
	    return Constructor;
	  }

	  /**
	   * splaytree v3.1.0
	   * Fast Splay tree for Node and browser
	   *
	   * @author Alexander Milevski <info@w8r.name>
	   * @license MIT
	   * @preserve
	   */
	  var Node =
	  /** @class */
	  function () {
	    function Node(key, data) {
	      this.next = null;
	      this.key = key;
	      this.data = data;
	      this.left = null;
	      this.right = null;
	    }

	    return Node;
	  }();
	  /* follows "An implementation of top-down splaying"
	   * by D. Sleator <sleator@cs.cmu.edu> March 1992
	   */


	  function DEFAULT_COMPARE(a, b) {
	    return a > b ? 1 : a < b ? -1 : 0;
	  }
	  /**
	   * Simple top down splay, not requiring i to be in the tree t.
	   */


	  function splay(i, t, comparator) {
	    var N = new Node(null, null);
	    var l = N;
	    var r = N;

	    while (true) {
	      var cmp = comparator(i, t.key); //if (i < t.key) {

	      if (cmp < 0) {
	        if (t.left === null) break; //if (i < t.left.key) {

	        if (comparator(i, t.left.key) < 0) {
	          var y = t.left;
	          /* rotate right */

	          t.left = y.right;
	          y.right = t;
	          t = y;
	          if (t.left === null) break;
	        }

	        r.left = t;
	        /* link right */

	        r = t;
	        t = t.left; //} else if (i > t.key) {
	      } else if (cmp > 0) {
	        if (t.right === null) break; //if (i > t.right.key) {

	        if (comparator(i, t.right.key) > 0) {
	          var y = t.right;
	          /* rotate left */

	          t.right = y.left;
	          y.left = t;
	          t = y;
	          if (t.right === null) break;
	        }

	        l.right = t;
	        /* link left */

	        l = t;
	        t = t.right;
	      } else break;
	    }
	    /* assemble */


	    l.right = t.left;
	    r.left = t.right;
	    t.left = N.right;
	    t.right = N.left;
	    return t;
	  }

	  function insert(i, data, t, comparator) {
	    var node = new Node(i, data);

	    if (t === null) {
	      node.left = node.right = null;
	      return node;
	    }

	    t = splay(i, t, comparator);
	    var cmp = comparator(i, t.key);

	    if (cmp < 0) {
	      node.left = t.left;
	      node.right = t;
	      t.left = null;
	    } else if (cmp >= 0) {
	      node.right = t.right;
	      node.left = t;
	      t.right = null;
	    }

	    return node;
	  }

	  function split(key, v, comparator) {
	    var left = null;
	    var right = null;

	    if (v) {
	      v = splay(key, v, comparator);
	      var cmp = comparator(v.key, key);

	      if (cmp === 0) {
	        left = v.left;
	        right = v.right;
	      } else if (cmp < 0) {
	        right = v.right;
	        v.right = null;
	        left = v;
	      } else {
	        left = v.left;
	        v.left = null;
	        right = v;
	      }
	    }

	    return {
	      left: left,
	      right: right
	    };
	  }

	  function merge(left, right, comparator) {
	    if (right === null) return left;
	    if (left === null) return right;
	    right = splay(left.key, right, comparator);
	    right.left = left;
	    return right;
	  }
	  /**
	   * Prints level of the tree
	   */


	  function printRow(root, prefix, isTail, out, printNode) {
	    if (root) {
	      out("" + prefix + (isTail ? '└── ' : '├── ') + printNode(root) + "\n");
	      var indent = prefix + (isTail ? '    ' : '│   ');
	      if (root.left) printRow(root.left, indent, false, out, printNode);
	      if (root.right) printRow(root.right, indent, true, out, printNode);
	    }
	  }

	  var Tree =
	  /** @class */
	  function () {
	    function Tree(comparator) {
	      if (comparator === void 0) {
	        comparator = DEFAULT_COMPARE;
	      }

	      this._root = null;
	      this._size = 0;
	      this._comparator = comparator;
	    }
	    /**
	     * Inserts a key, allows duplicates
	     */


	    Tree.prototype.insert = function (key, data) {
	      this._size++;
	      return this._root = insert(key, data, this._root, this._comparator);
	    };
	    /**
	     * Adds a key, if it is not present in the tree
	     */


	    Tree.prototype.add = function (key, data) {
	      var node = new Node(key, data);

	      if (this._root === null) {
	        node.left = node.right = null;
	        this._size++;
	        this._root = node;
	      }

	      var comparator = this._comparator;
	      var t = splay(key, this._root, comparator);
	      var cmp = comparator(key, t.key);
	      if (cmp === 0) this._root = t;else {
	        if (cmp < 0) {
	          node.left = t.left;
	          node.right = t;
	          t.left = null;
	        } else if (cmp > 0) {
	          node.right = t.right;
	          node.left = t;
	          t.right = null;
	        }

	        this._size++;
	        this._root = node;
	      }
	      return this._root;
	    };
	    /**
	     * @param  {Key} key
	     * @return {Node|null}
	     */


	    Tree.prototype.remove = function (key) {
	      this._root = this._remove(key, this._root, this._comparator);
	    };
	    /**
	     * Deletes i from the tree if it's there
	     */


	    Tree.prototype._remove = function (i, t, comparator) {
	      var x;
	      if (t === null) return null;
	      t = splay(i, t, comparator);
	      var cmp = comparator(i, t.key);

	      if (cmp === 0) {
	        /* found it */
	        if (t.left === null) {
	          x = t.right;
	        } else {
	          x = splay(i, t.left, comparator);
	          x.right = t.right;
	        }

	        this._size--;
	        return x;
	      }

	      return t;
	      /* It wasn't there */
	    };
	    /**
	     * Removes and returns the node with smallest key
	     */


	    Tree.prototype.pop = function () {
	      var node = this._root;

	      if (node) {
	        while (node.left) {
	          node = node.left;
	        }

	        this._root = splay(node.key, this._root, this._comparator);
	        this._root = this._remove(node.key, this._root, this._comparator);
	        return {
	          key: node.key,
	          data: node.data
	        };
	      }

	      return null;
	    };
	    /**
	     * Find without splaying
	     */


	    Tree.prototype.findStatic = function (key) {
	      var current = this._root;
	      var compare = this._comparator;

	      while (current) {
	        var cmp = compare(key, current.key);
	        if (cmp === 0) return current;else if (cmp < 0) current = current.left;else current = current.right;
	      }

	      return null;
	    };

	    Tree.prototype.find = function (key) {
	      if (this._root) {
	        this._root = splay(key, this._root, this._comparator);
	        if (this._comparator(key, this._root.key) !== 0) return null;
	      }

	      return this._root;
	    };

	    Tree.prototype.contains = function (key) {
	      var current = this._root;
	      var compare = this._comparator;

	      while (current) {
	        var cmp = compare(key, current.key);
	        if (cmp === 0) return true;else if (cmp < 0) current = current.left;else current = current.right;
	      }

	      return false;
	    };

	    Tree.prototype.forEach = function (visitor, ctx) {
	      var current = this._root;
	      var Q = [];
	      /* Initialize stack s */

	      var done = false;

	      while (!done) {
	        if (current !== null) {
	          Q.push(current);
	          current = current.left;
	        } else {
	          if (Q.length !== 0) {
	            current = Q.pop();
	            visitor.call(ctx, current);
	            current = current.right;
	          } else done = true;
	        }
	      }

	      return this;
	    };
	    /**
	     * Walk key range from `low` to `high`. Stops if `fn` returns a value.
	     */


	    Tree.prototype.range = function (low, high, fn, ctx) {
	      var Q = [];
	      var compare = this._comparator;
	      var node = this._root;
	      var cmp;

	      while (Q.length !== 0 || node) {
	        if (node) {
	          Q.push(node);
	          node = node.left;
	        } else {
	          node = Q.pop();
	          cmp = compare(node.key, high);

	          if (cmp > 0) {
	            break;
	          } else if (compare(node.key, low) >= 0) {
	            if (fn.call(ctx, node)) return this; // stop if smth is returned
	          }

	          node = node.right;
	        }
	      }

	      return this;
	    };
	    /**
	     * Returns array of keys
	     */


	    Tree.prototype.keys = function () {
	      var keys = [];
	      this.forEach(function (_a) {
	        var key = _a.key;
	        return keys.push(key);
	      });
	      return keys;
	    };
	    /**
	     * Returns array of all the data in the nodes
	     */


	    Tree.prototype.values = function () {
	      var values = [];
	      this.forEach(function (_a) {
	        var data = _a.data;
	        return values.push(data);
	      });
	      return values;
	    };

	    Tree.prototype.min = function () {
	      if (this._root) return this.minNode(this._root).key;
	      return null;
	    };

	    Tree.prototype.max = function () {
	      if (this._root) return this.maxNode(this._root).key;
	      return null;
	    };

	    Tree.prototype.minNode = function (t) {
	      if (t === void 0) {
	        t = this._root;
	      }

	      if (t) while (t.left) {
	        t = t.left;
	      }
	      return t;
	    };

	    Tree.prototype.maxNode = function (t) {
	      if (t === void 0) {
	        t = this._root;
	      }

	      if (t) while (t.right) {
	        t = t.right;
	      }
	      return t;
	    };
	    /**
	     * Returns node at given index
	     */


	    Tree.prototype.at = function (index) {
	      var current = this._root;
	      var done = false;
	      var i = 0;
	      var Q = [];

	      while (!done) {
	        if (current) {
	          Q.push(current);
	          current = current.left;
	        } else {
	          if (Q.length > 0) {
	            current = Q.pop();
	            if (i === index) return current;
	            i++;
	            current = current.right;
	          } else done = true;
	        }
	      }

	      return null;
	    };

	    Tree.prototype.next = function (d) {
	      var root = this._root;
	      var successor = null;

	      if (d.right) {
	        successor = d.right;

	        while (successor.left) {
	          successor = successor.left;
	        }

	        return successor;
	      }

	      var comparator = this._comparator;

	      while (root) {
	        var cmp = comparator(d.key, root.key);
	        if (cmp === 0) break;else if (cmp < 0) {
	          successor = root;
	          root = root.left;
	        } else root = root.right;
	      }

	      return successor;
	    };

	    Tree.prototype.prev = function (d) {
	      var root = this._root;
	      var predecessor = null;

	      if (d.left !== null) {
	        predecessor = d.left;

	        while (predecessor.right) {
	          predecessor = predecessor.right;
	        }

	        return predecessor;
	      }

	      var comparator = this._comparator;

	      while (root) {
	        var cmp = comparator(d.key, root.key);
	        if (cmp === 0) break;else if (cmp < 0) root = root.left;else {
	          predecessor = root;
	          root = root.right;
	        }
	      }

	      return predecessor;
	    };

	    Tree.prototype.clear = function () {
	      this._root = null;
	      this._size = 0;
	      return this;
	    };

	    Tree.prototype.toList = function () {
	      return toList(this._root);
	    };
	    /**
	     * Bulk-load items. Both array have to be same size
	     */


	    Tree.prototype.load = function (keys, values, presort) {
	      if (values === void 0) {
	        values = [];
	      }

	      if (presort === void 0) {
	        presort = false;
	      }

	      var size = keys.length;
	      var comparator = this._comparator; // sort if needed

	      if (presort) sort(keys, values, 0, size - 1, comparator);

	      if (this._root === null) {
	        // empty tree
	        this._root = loadRecursive(keys, values, 0, size);
	        this._size = size;
	      } else {
	        // that re-builds the whole tree from two in-order traversals
	        var mergedList = mergeLists(this.toList(), createList(keys, values), comparator);
	        size = this._size + size;
	        this._root = sortedListToBST({
	          head: mergedList
	        }, 0, size);
	      }

	      return this;
	    };

	    Tree.prototype.isEmpty = function () {
	      return this._root === null;
	    };

	    Object.defineProperty(Tree.prototype, "size", {
	      get: function get() {
	        return this._size;
	      },
	      enumerable: true,
	      configurable: true
	    });
	    Object.defineProperty(Tree.prototype, "root", {
	      get: function get() {
	        return this._root;
	      },
	      enumerable: true,
	      configurable: true
	    });

	    Tree.prototype.toString = function (printNode) {
	      if (printNode === void 0) {
	        printNode = function printNode(n) {
	          return String(n.key);
	        };
	      }

	      var out = [];
	      printRow(this._root, '', true, function (v) {
	        return out.push(v);
	      }, printNode);
	      return out.join('');
	    };

	    Tree.prototype.update = function (key, newKey, newData) {
	      var comparator = this._comparator;

	      var _a = split(key, this._root, comparator),
	          left = _a.left,
	          right = _a.right;

	      if (comparator(key, newKey) < 0) {
	        right = insert(newKey, newData, right, comparator);
	      } else {
	        left = insert(newKey, newData, left, comparator);
	      }

	      this._root = merge(left, right, comparator);
	    };

	    Tree.prototype.split = function (key) {
	      return split(key, this._root, this._comparator);
	    };

	    return Tree;
	  }();

	  function loadRecursive(keys, values, start, end) {
	    var size = end - start;

	    if (size > 0) {
	      var middle = start + Math.floor(size / 2);
	      var key = keys[middle];
	      var data = values[middle];
	      var node = new Node(key, data);
	      node.left = loadRecursive(keys, values, start, middle);
	      node.right = loadRecursive(keys, values, middle + 1, end);
	      return node;
	    }

	    return null;
	  }

	  function createList(keys, values) {
	    var head = new Node(null, null);
	    var p = head;

	    for (var i = 0; i < keys.length; i++) {
	      p = p.next = new Node(keys[i], values[i]);
	    }

	    p.next = null;
	    return head.next;
	  }

	  function toList(root) {
	    var current = root;
	    var Q = [];
	    var done = false;
	    var head = new Node(null, null);
	    var p = head;

	    while (!done) {
	      if (current) {
	        Q.push(current);
	        current = current.left;
	      } else {
	        if (Q.length > 0) {
	          current = p = p.next = Q.pop();
	          current = current.right;
	        } else done = true;
	      }
	    }

	    p.next = null; // that'll work even if the tree was empty

	    return head.next;
	  }

	  function sortedListToBST(list, start, end) {
	    var size = end - start;

	    if (size > 0) {
	      var middle = start + Math.floor(size / 2);
	      var left = sortedListToBST(list, start, middle);
	      var root = list.head;
	      root.left = left;
	      list.head = list.head.next;
	      root.right = sortedListToBST(list, middle + 1, end);
	      return root;
	    }

	    return null;
	  }

	  function mergeLists(l1, l2, compare) {
	    var head = new Node(null, null); // dummy

	    var p = head;
	    var p1 = l1;
	    var p2 = l2;

	    while (p1 !== null && p2 !== null) {
	      if (compare(p1.key, p2.key) < 0) {
	        p.next = p1;
	        p1 = p1.next;
	      } else {
	        p.next = p2;
	        p2 = p2.next;
	      }

	      p = p.next;
	    }

	    if (p1 !== null) {
	      p.next = p1;
	    } else if (p2 !== null) {
	      p.next = p2;
	    }

	    return head.next;
	  }

	  function sort(keys, values, left, right, compare) {
	    if (left >= right) return;
	    var pivot = keys[left + right >> 1];
	    var i = left - 1;
	    var j = right + 1;

	    while (true) {
	      do {
	        i++;
	      } while (compare(keys[i], pivot) < 0);

	      do {
	        j--;
	      } while (compare(keys[j], pivot) > 0);

	      if (i >= j) break;
	      var tmp = keys[i];
	      keys[i] = keys[j];
	      keys[j] = tmp;
	      tmp = values[i];
	      values[i] = values[j];
	      values[j] = tmp;
	    }

	    sort(keys, values, left, j, compare);
	    sort(keys, values, j + 1, right, compare);
	  }

	  /**
	   * A bounding box has the format:
	   *
	   *  { ll: { x: xmin, y: ymin }, ur: { x: xmax, y: ymax } }
	   *
	   */
	  var isInBbox = function isInBbox(bbox, point) {
	    return bbox.ll.x <= point.x && point.x <= bbox.ur.x && bbox.ll.y <= point.y && point.y <= bbox.ur.y;
	  };
	  /* Returns either null, or a bbox (aka an ordered pair of points)
	   * If there is only one point of overlap, a bbox with identical points
	   * will be returned */

	  var getBboxOverlap = function getBboxOverlap(b1, b2) {
	    // check if the bboxes overlap at all
	    if (b2.ur.x < b1.ll.x || b1.ur.x < b2.ll.x || b2.ur.y < b1.ll.y || b1.ur.y < b2.ll.y) return null; // find the middle two X values

	    var lowerX = b1.ll.x < b2.ll.x ? b2.ll.x : b1.ll.x;
	    var upperX = b1.ur.x < b2.ur.x ? b1.ur.x : b2.ur.x; // find the middle two Y values

	    var lowerY = b1.ll.y < b2.ll.y ? b2.ll.y : b1.ll.y;
	    var upperY = b1.ur.y < b2.ur.y ? b1.ur.y : b2.ur.y; // put those middle values together to get the overlap

	    return {
	      ll: {
	        x: lowerX,
	        y: lowerY
	      },
	      ur: {
	        x: upperX,
	        y: upperY
	      }
	    };
	  };

	  /* Javascript doesn't do integer math. Everything is
	   * floating point with percision Number.EPSILON.
	   *
	   * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/EPSILON
	   */
	  var epsilon = Number.EPSILON; // IE Polyfill

	  if (epsilon === undefined) epsilon = Math.pow(2, -52);
	  var EPSILON_SQ = epsilon * epsilon;
	  /* FLP comparator */

	  var cmp = function cmp(a, b) {
	    // check if they're both 0
	    if (-epsilon < a && a < epsilon) {
	      if (-epsilon < b && b < epsilon) {
	        return 0;
	      }
	    } // check if they're flp equal


	    var ab = a - b;

	    if (ab * ab < EPSILON_SQ * a * b) {
	      return 0;
	    } // normal comparison


	    return a < b ? -1 : 1;
	  };

	  /**
	   * This class rounds incoming values sufficiently so that
	   * floating points problems are, for the most part, avoided.
	   *
	   * Incoming points are have their x & y values tested against
	   * all previously seen x & y values. If either is 'too close'
	   * to a previously seen value, it's value is 'snapped' to the
	   * previously seen value.
	   *
	   * All points should be rounded by this class before being
	   * stored in any data structures in the rest of this algorithm.
	   */

	  var PtRounder = /*#__PURE__*/function () {
	    function PtRounder() {
	      _classCallCheck(this, PtRounder);

	      this.reset();
	    }

	    _createClass(PtRounder, [{
	      key: "reset",
	      value: function reset() {
	        this.xRounder = new CoordRounder();
	        this.yRounder = new CoordRounder();
	      }
	    }, {
	      key: "round",
	      value: function round(x, y) {
	        return {
	          x: this.xRounder.round(x),
	          y: this.yRounder.round(y)
	        };
	      }
	    }]);

	    return PtRounder;
	  }();

	  var CoordRounder = /*#__PURE__*/function () {
	    function CoordRounder() {
	      _classCallCheck(this, CoordRounder);

	      this.tree = new Tree(); // preseed with 0 so we don't end up with values < Number.EPSILON

	      this.round(0);
	    } // Note: this can rounds input values backwards or forwards.
	    //       You might ask, why not restrict this to just rounding
	    //       forwards? Wouldn't that allow left endpoints to always
	    //       remain left endpoints during splitting (never change to
	    //       right). No - it wouldn't, because we snap intersections
	    //       to endpoints (to establish independence from the segment
	    //       angle for t-intersections).


	    _createClass(CoordRounder, [{
	      key: "round",
	      value: function round(coord) {
	        var node = this.tree.add(coord);
	        var prevNode = this.tree.prev(node);

	        if (prevNode !== null && cmp(node.key, prevNode.key) === 0) {
	          this.tree.remove(coord);
	          return prevNode.key;
	        }

	        var nextNode = this.tree.next(node);

	        if (nextNode !== null && cmp(node.key, nextNode.key) === 0) {
	          this.tree.remove(coord);
	          return nextNode.key;
	        }

	        return coord;
	      }
	    }]);

	    return CoordRounder;
	  }(); // singleton available by import


	  var rounder = new PtRounder();

	  /* Cross Product of two vectors with first point at origin */

	  var crossProduct = function crossProduct(a, b) {
	    return a.x * b.y - a.y * b.x;
	  };
	  /* Dot Product of two vectors with first point at origin */

	  var dotProduct = function dotProduct(a, b) {
	    return a.x * b.x + a.y * b.y;
	  };
	  /* Comparator for two vectors with same starting point */

	  var compareVectorAngles = function compareVectorAngles(basePt, endPt1, endPt2) {
	    var v1 = {
	      x: endPt1.x - basePt.x,
	      y: endPt1.y - basePt.y
	    };
	    var v2 = {
	      x: endPt2.x - basePt.x,
	      y: endPt2.y - basePt.y
	    };
	    var kross = crossProduct(v1, v2);
	    return cmp(kross, 0);
	  };
	  var length = function length(v) {
	    return Math.sqrt(dotProduct(v, v));
	  };
	  /* Get the sine of the angle from pShared -> pAngle to pShaed -> pBase */

	  var sineOfAngle = function sineOfAngle(pShared, pBase, pAngle) {
	    var vBase = {
	      x: pBase.x - pShared.x,
	      y: pBase.y - pShared.y
	    };
	    var vAngle = {
	      x: pAngle.x - pShared.x,
	      y: pAngle.y - pShared.y
	    };
	    return crossProduct(vAngle, vBase) / length(vAngle) / length(vBase);
	  };
	  /* Get the cosine of the angle from pShared -> pAngle to pShaed -> pBase */

	  var cosineOfAngle = function cosineOfAngle(pShared, pBase, pAngle) {
	    var vBase = {
	      x: pBase.x - pShared.x,
	      y: pBase.y - pShared.y
	    };
	    var vAngle = {
	      x: pAngle.x - pShared.x,
	      y: pAngle.y - pShared.y
	    };
	    return dotProduct(vAngle, vBase) / length(vAngle) / length(vBase);
	  };
	  /* Get the x coordinate where the given line (defined by a point and vector)
	   * crosses the horizontal line with the given y coordiante.
	   * In the case of parrallel lines (including overlapping ones) returns null. */

	  var horizontalIntersection = function horizontalIntersection(pt, v, y) {
	    if (v.y === 0) return null;
	    return {
	      x: pt.x + v.x / v.y * (y - pt.y),
	      y: y
	    };
	  };
	  /* Get the y coordinate where the given line (defined by a point and vector)
	   * crosses the vertical line with the given x coordiante.
	   * In the case of parrallel lines (including overlapping ones) returns null. */

	  var verticalIntersection = function verticalIntersection(pt, v, x) {
	    if (v.x === 0) return null;
	    return {
	      x: x,
	      y: pt.y + v.y / v.x * (x - pt.x)
	    };
	  };
	  /* Get the intersection of two lines, each defined by a base point and a vector.
	   * In the case of parrallel lines (including overlapping ones) returns null. */

	  var intersection = function intersection(pt1, v1, pt2, v2) {
	    // take some shortcuts for vertical and horizontal lines
	    // this also ensures we don't calculate an intersection and then discover
	    // it's actually outside the bounding box of the line
	    if (v1.x === 0) return verticalIntersection(pt2, v2, pt1.x);
	    if (v2.x === 0) return verticalIntersection(pt1, v1, pt2.x);
	    if (v1.y === 0) return horizontalIntersection(pt2, v2, pt1.y);
	    if (v2.y === 0) return horizontalIntersection(pt1, v1, pt2.y); // General case for non-overlapping segments.
	    // This algorithm is based on Schneider and Eberly.
	    // http://www.cimec.org.ar/~ncalvo/Schneider_Eberly.pdf - pg 244

	    var kross = crossProduct(v1, v2);
	    if (kross == 0) return null;
	    var ve = {
	      x: pt2.x - pt1.x,
	      y: pt2.y - pt1.y
	    };
	    var d1 = crossProduct(ve, v1) / kross;
	    var d2 = crossProduct(ve, v2) / kross; // take the average of the two calculations to minimize rounding error

	    var x1 = pt1.x + d2 * v1.x,
	        x2 = pt2.x + d1 * v2.x;
	    var y1 = pt1.y + d2 * v1.y,
	        y2 = pt2.y + d1 * v2.y;
	    var x = (x1 + x2) / 2;
	    var y = (y1 + y2) / 2;
	    return {
	      x: x,
	      y: y
	    };
	  };

	  var SweepEvent = /*#__PURE__*/function () {
	    _createClass(SweepEvent, null, [{
	      key: "compare",
	      // for ordering sweep events in the sweep event queue
	      value: function compare(a, b) {
	        // favor event with a point that the sweep line hits first
	        var ptCmp = SweepEvent.comparePoints(a.point, b.point);
	        if (ptCmp !== 0) return ptCmp; // the points are the same, so link them if needed

	        if (a.point !== b.point) a.link(b); // favor right events over left

	        if (a.isLeft !== b.isLeft) return a.isLeft ? 1 : -1; // we have two matching left or right endpoints
	        // ordering of this case is the same as for their segments

	        return Segment.compare(a.segment, b.segment);
	      } // for ordering points in sweep line order

	    }, {
	      key: "comparePoints",
	      value: function comparePoints(aPt, bPt) {
	        if (aPt.x < bPt.x) return -1;
	        if (aPt.x > bPt.x) return 1;
	        if (aPt.y < bPt.y) return -1;
	        if (aPt.y > bPt.y) return 1;
	        return 0;
	      } // Warning: 'point' input will be modified and re-used (for performance)

	    }]);

	    function SweepEvent(point, isLeft) {
	      _classCallCheck(this, SweepEvent);

	      if (point.events === undefined) point.events = [this];else point.events.push(this);
	      this.point = point;
	      this.isLeft = isLeft; // this.segment, this.otherSE set by factory
	    }

	    _createClass(SweepEvent, [{
	      key: "link",
	      value: function link(other) {
	        if (other.point === this.point) {
	          throw new Error('Tried to link already linked events');
	        }

	        var otherEvents = other.point.events;

	        for (var i = 0, iMax = otherEvents.length; i < iMax; i++) {
	          var evt = otherEvents[i];
	          this.point.events.push(evt);
	          evt.point = this.point;
	        }

	        this.checkForConsuming();
	      }
	      /* Do a pass over our linked events and check to see if any pair
	       * of segments match, and should be consumed. */

	    }, {
	      key: "checkForConsuming",
	      value: function checkForConsuming() {
	        // FIXME: The loops in this method run O(n^2) => no good.
	        //        Maintain little ordered sweep event trees?
	        //        Can we maintaining an ordering that avoids the need
	        //        for the re-sorting with getLeftmostComparator in geom-out?
	        // Compare each pair of events to see if other events also match
	        var numEvents = this.point.events.length;

	        for (var i = 0; i < numEvents; i++) {
	          var evt1 = this.point.events[i];
	          if (evt1.segment.consumedBy !== undefined) continue;

	          for (var j = i + 1; j < numEvents; j++) {
	            var evt2 = this.point.events[j];
	            if (evt2.consumedBy !== undefined) continue;
	            if (evt1.otherSE.point.events !== evt2.otherSE.point.events) continue;
	            evt1.segment.consume(evt2.segment);
	          }
	        }
	      }
	    }, {
	      key: "getAvailableLinkedEvents",
	      value: function getAvailableLinkedEvents() {
	        // point.events is always of length 2 or greater
	        var events = [];

	        for (var i = 0, iMax = this.point.events.length; i < iMax; i++) {
	          var evt = this.point.events[i];

	          if (evt !== this && !evt.segment.ringOut && evt.segment.isInResult()) {
	            events.push(evt);
	          }
	        }

	        return events;
	      }
	      /**
	       * Returns a comparator function for sorting linked events that will
	       * favor the event that will give us the smallest left-side angle.
	       * All ring construction starts as low as possible heading to the right,
	       * so by always turning left as sharp as possible we'll get polygons
	       * without uncessary loops & holes.
	       *
	       * The comparator function has a compute cache such that it avoids
	       * re-computing already-computed values.
	       */

	    }, {
	      key: "getLeftmostComparator",
	      value: function getLeftmostComparator(baseEvent) {
	        var _this = this;

	        var cache = new Map();

	        var fillCache = function fillCache(linkedEvent) {
	          var nextEvent = linkedEvent.otherSE;
	          cache.set(linkedEvent, {
	            sine: sineOfAngle(_this.point, baseEvent.point, nextEvent.point),
	            cosine: cosineOfAngle(_this.point, baseEvent.point, nextEvent.point)
	          });
	        };

	        return function (a, b) {
	          if (!cache.has(a)) fillCache(a);
	          if (!cache.has(b)) fillCache(b);

	          var _cache$get = cache.get(a),
	              asine = _cache$get.sine,
	              acosine = _cache$get.cosine;

	          var _cache$get2 = cache.get(b),
	              bsine = _cache$get2.sine,
	              bcosine = _cache$get2.cosine; // both on or above x-axis


	          if (asine >= 0 && bsine >= 0) {
	            if (acosine < bcosine) return 1;
	            if (acosine > bcosine) return -1;
	            return 0;
	          } // both below x-axis


	          if (asine < 0 && bsine < 0) {
	            if (acosine < bcosine) return -1;
	            if (acosine > bcosine) return 1;
	            return 0;
	          } // one above x-axis, one below


	          if (bsine < asine) return -1;
	          if (bsine > asine) return 1;
	          return 0;
	        };
	      }
	    }]);

	    return SweepEvent;
	  }();

	  // segments and sweep events when all else is identical

	  var segmentId = 0;

	  var Segment = /*#__PURE__*/function () {
	    _createClass(Segment, null, [{
	      key: "compare",

	      /* This compare() function is for ordering segments in the sweep
	       * line tree, and does so according to the following criteria:
	       *
	       * Consider the vertical line that lies an infinestimal step to the
	       * right of the right-more of the two left endpoints of the input
	       * segments. Imagine slowly moving a point up from negative infinity
	       * in the increasing y direction. Which of the two segments will that
	       * point intersect first? That segment comes 'before' the other one.
	       *
	       * If neither segment would be intersected by such a line, (if one
	       * or more of the segments are vertical) then the line to be considered
	       * is directly on the right-more of the two left inputs.
	       */
	      value: function compare(a, b) {
	        var alx = a.leftSE.point.x;
	        var blx = b.leftSE.point.x;
	        var arx = a.rightSE.point.x;
	        var brx = b.rightSE.point.x; // check if they're even in the same vertical plane

	        if (brx < alx) return 1;
	        if (arx < blx) return -1;
	        var aly = a.leftSE.point.y;
	        var bly = b.leftSE.point.y;
	        var ary = a.rightSE.point.y;
	        var bry = b.rightSE.point.y; // is left endpoint of segment B the right-more?

	        if (alx < blx) {
	          // are the two segments in the same horizontal plane?
	          if (bly < aly && bly < ary) return 1;
	          if (bly > aly && bly > ary) return -1; // is the B left endpoint colinear to segment A?

	          var aCmpBLeft = a.comparePoint(b.leftSE.point);
	          if (aCmpBLeft < 0) return 1;
	          if (aCmpBLeft > 0) return -1; // is the A right endpoint colinear to segment B ?

	          var bCmpARight = b.comparePoint(a.rightSE.point);
	          if (bCmpARight !== 0) return bCmpARight; // colinear segments, consider the one with left-more
	          // left endpoint to be first (arbitrary?)

	          return -1;
	        } // is left endpoint of segment A the right-more?


	        if (alx > blx) {
	          if (aly < bly && aly < bry) return -1;
	          if (aly > bly && aly > bry) return 1; // is the A left endpoint colinear to segment B?

	          var bCmpALeft = b.comparePoint(a.leftSE.point);
	          if (bCmpALeft !== 0) return bCmpALeft; // is the B right endpoint colinear to segment A?

	          var aCmpBRight = a.comparePoint(b.rightSE.point);
	          if (aCmpBRight < 0) return 1;
	          if (aCmpBRight > 0) return -1; // colinear segments, consider the one with left-more
	          // left endpoint to be first (arbitrary?)

	          return 1;
	        } // if we get here, the two left endpoints are in the same
	        // vertical plane, ie alx === blx
	        // consider the lower left-endpoint to come first


	        if (aly < bly) return -1;
	        if (aly > bly) return 1; // left endpoints are identical
	        // check for colinearity by using the left-more right endpoint
	        // is the A right endpoint more left-more?

	        if (arx < brx) {
	          var _bCmpARight = b.comparePoint(a.rightSE.point);

	          if (_bCmpARight !== 0) return _bCmpARight;
	        } // is the B right endpoint more left-more?


	        if (arx > brx) {
	          var _aCmpBRight = a.comparePoint(b.rightSE.point);

	          if (_aCmpBRight < 0) return 1;
	          if (_aCmpBRight > 0) return -1;
	        }

	        if (arx !== brx) {
	          // are these two [almost] vertical segments with opposite orientation?
	          // if so, the one with the lower right endpoint comes first
	          var ay = ary - aly;
	          var ax = arx - alx;
	          var by = bry - bly;
	          var bx = brx - blx;
	          if (ay > ax && by < bx) return 1;
	          if (ay < ax && by > bx) return -1;
	        } // we have colinear segments with matching orientation
	        // consider the one with more left-more right endpoint to be first


	        if (arx > brx) return 1;
	        if (arx < brx) return -1; // if we get here, two two right endpoints are in the same
	        // vertical plane, ie arx === brx
	        // consider the lower right-endpoint to come first

	        if (ary < bry) return -1;
	        if (ary > bry) return 1; // right endpoints identical as well, so the segments are idential
	        // fall back on creation order as consistent tie-breaker

	        if (a.id < b.id) return -1;
	        if (a.id > b.id) return 1; // identical segment, ie a === b

	        return 0;
	      }
	      /* Warning: a reference to ringWindings input will be stored,
	       *  and possibly will be later modified */

	    }]);

	    function Segment(leftSE, rightSE, rings, windings) {
	      _classCallCheck(this, Segment);

	      this.id = ++segmentId;
	      this.leftSE = leftSE;
	      leftSE.segment = this;
	      leftSE.otherSE = rightSE;
	      this.rightSE = rightSE;
	      rightSE.segment = this;
	      rightSE.otherSE = leftSE;
	      this.rings = rings;
	      this.windings = windings; // left unset for performance, set later in algorithm
	      // this.ringOut, this.consumedBy, this.prev
	    }

	    _createClass(Segment, [{
	      key: "replaceRightSE",

	      /* When a segment is split, the rightSE is replaced with a new sweep event */
	      value: function replaceRightSE(newRightSE) {
	        this.rightSE = newRightSE;
	        this.rightSE.segment = this;
	        this.rightSE.otherSE = this.leftSE;
	        this.leftSE.otherSE = this.rightSE;
	      }
	    }, {
	      key: "bbox",
	      value: function bbox() {
	        var y1 = this.leftSE.point.y;
	        var y2 = this.rightSE.point.y;
	        return {
	          ll: {
	            x: this.leftSE.point.x,
	            y: y1 < y2 ? y1 : y2
	          },
	          ur: {
	            x: this.rightSE.point.x,
	            y: y1 > y2 ? y1 : y2
	          }
	        };
	      }
	      /* A vector from the left point to the right */

	    }, {
	      key: "vector",
	      value: function vector() {
	        return {
	          x: this.rightSE.point.x - this.leftSE.point.x,
	          y: this.rightSE.point.y - this.leftSE.point.y
	        };
	      }
	    }, {
	      key: "isAnEndpoint",
	      value: function isAnEndpoint(pt) {
	        return pt.x === this.leftSE.point.x && pt.y === this.leftSE.point.y || pt.x === this.rightSE.point.x && pt.y === this.rightSE.point.y;
	      }
	      /* Compare this segment with a point.
	       *
	       * A point P is considered to be colinear to a segment if there
	       * exists a distance D such that if we travel along the segment
	       * from one * endpoint towards the other a distance D, we find
	       * ourselves at point P.
	       *
	       * Return value indicates:
	       *
	       *   1: point lies above the segment (to the left of vertical)
	       *   0: point is colinear to segment
	       *  -1: point lies below the segment (to the right of vertical)
	       */

	    }, {
	      key: "comparePoint",
	      value: function comparePoint(point) {
	        if (this.isAnEndpoint(point)) return 0;
	        var lPt = this.leftSE.point;
	        var rPt = this.rightSE.point;
	        var v = this.vector(); // Exactly vertical segments.

	        if (lPt.x === rPt.x) {
	          if (point.x === lPt.x) return 0;
	          return point.x < lPt.x ? 1 : -1;
	        } // Nearly vertical segments with an intersection.
	        // Check to see where a point on the line with matching Y coordinate is.


	        var yDist = (point.y - lPt.y) / v.y;
	        var xFromYDist = lPt.x + yDist * v.x;
	        if (point.x === xFromYDist) return 0; // General case.
	        // Check to see where a point on the line with matching X coordinate is.

	        var xDist = (point.x - lPt.x) / v.x;
	        var yFromXDist = lPt.y + xDist * v.y;
	        if (point.y === yFromXDist) return 0;
	        return point.y < yFromXDist ? -1 : 1;
	      }
	      /**
	       * Given another segment, returns the first non-trivial intersection
	       * between the two segments (in terms of sweep line ordering), if it exists.
	       *
	       * A 'non-trivial' intersection is one that will cause one or both of the
	       * segments to be split(). As such, 'trivial' vs. 'non-trivial' intersection:
	       *
	       *   * endpoint of segA with endpoint of segB --> trivial
	       *   * endpoint of segA with point along segB --> non-trivial
	       *   * endpoint of segB with point along segA --> non-trivial
	       *   * point along segA with point along segB --> non-trivial
	       *
	       * If no non-trivial intersection exists, return null
	       * Else, return null.
	       */

	    }, {
	      key: "getIntersection",
	      value: function getIntersection(other) {
	        // If bboxes don't overlap, there can't be any intersections
	        var tBbox = this.bbox();
	        var oBbox = other.bbox();
	        var bboxOverlap = getBboxOverlap(tBbox, oBbox);
	        if (bboxOverlap === null) return null; // We first check to see if the endpoints can be considered intersections.
	        // This will 'snap' intersections to endpoints if possible, and will
	        // handle cases of colinearity.

	        var tlp = this.leftSE.point;
	        var trp = this.rightSE.point;
	        var olp = other.leftSE.point;
	        var orp = other.rightSE.point; // does each endpoint touch the other segment?
	        // note that we restrict the 'touching' definition to only allow segments
	        // to touch endpoints that lie forward from where we are in the sweep line pass

	        var touchesOtherLSE = isInBbox(tBbox, olp) && this.comparePoint(olp) === 0;
	        var touchesThisLSE = isInBbox(oBbox, tlp) && other.comparePoint(tlp) === 0;
	        var touchesOtherRSE = isInBbox(tBbox, orp) && this.comparePoint(orp) === 0;
	        var touchesThisRSE = isInBbox(oBbox, trp) && other.comparePoint(trp) === 0; // do left endpoints match?

	        if (touchesThisLSE && touchesOtherLSE) {
	          // these two cases are for colinear segments with matching left
	          // endpoints, and one segment being longer than the other
	          if (touchesThisRSE && !touchesOtherRSE) return trp;
	          if (!touchesThisRSE && touchesOtherRSE) return orp; // either the two segments match exactly (two trival intersections)
	          // or just on their left endpoint (one trivial intersection

	          return null;
	        } // does this left endpoint matches (other doesn't)


	        if (touchesThisLSE) {
	          // check for segments that just intersect on opposing endpoints
	          if (touchesOtherRSE) {
	            if (tlp.x === orp.x && tlp.y === orp.y) return null;
	          } // t-intersection on left endpoint


	          return tlp;
	        } // does other left endpoint matches (this doesn't)


	        if (touchesOtherLSE) {
	          // check for segments that just intersect on opposing endpoints
	          if (touchesThisRSE) {
	            if (trp.x === olp.x && trp.y === olp.y) return null;
	          } // t-intersection on left endpoint


	          return olp;
	        } // trivial intersection on right endpoints


	        if (touchesThisRSE && touchesOtherRSE) return null; // t-intersections on just one right endpoint

	        if (touchesThisRSE) return trp;
	        if (touchesOtherRSE) return orp; // None of our endpoints intersect. Look for a general intersection between
	        // infinite lines laid over the segments

	        var pt = intersection(tlp, this.vector(), olp, other.vector()); // are the segments parrallel? Note that if they were colinear with overlap,
	        // they would have an endpoint intersection and that case was already handled above

	        if (pt === null) return null; // is the intersection found between the lines not on the segments?

	        if (!isInBbox(bboxOverlap, pt)) return null; // round the the computed point if needed

	        return rounder.round(pt.x, pt.y);
	      }
	      /**
	       * Split the given segment into multiple segments on the given points.
	       *  * Each existing segment will retain its leftSE and a new rightSE will be
	       *    generated for it.
	       *  * A new segment will be generated which will adopt the original segment's
	       *    rightSE, and a new leftSE will be generated for it.
	       *  * If there are more than two points given to split on, new segments
	       *    in the middle will be generated with new leftSE and rightSE's.
	       *  * An array of the newly generated SweepEvents will be returned.
	       *
	       * Warning: input array of points is modified
	       */

	    }, {
	      key: "split",
	      value: function split(point) {
	        var newEvents = [];
	        var alreadyLinked = point.events !== undefined;
	        var newLeftSE = new SweepEvent(point, true);
	        var newRightSE = new SweepEvent(point, false);
	        var oldRightSE = this.rightSE;
	        this.replaceRightSE(newRightSE);
	        newEvents.push(newRightSE);
	        newEvents.push(newLeftSE);
	        var newSeg = new Segment(newLeftSE, oldRightSE, this.rings.slice(), this.windings.slice()); // when splitting a nearly vertical downward-facing segment,
	        // sometimes one of the resulting new segments is vertical, in which
	        // case its left and right events may need to be swapped

	        if (SweepEvent.comparePoints(newSeg.leftSE.point, newSeg.rightSE.point) > 0) {
	          newSeg.swapEvents();
	        }

	        if (SweepEvent.comparePoints(this.leftSE.point, this.rightSE.point) > 0) {
	          this.swapEvents();
	        } // in the point we just used to create new sweep events with was already
	        // linked to other events, we need to check if either of the affected
	        // segments should be consumed


	        if (alreadyLinked) {
	          newLeftSE.checkForConsuming();
	          newRightSE.checkForConsuming();
	        }

	        return newEvents;
	      }
	      /* Swap which event is left and right */

	    }, {
	      key: "swapEvents",
	      value: function swapEvents() {
	        var tmpEvt = this.rightSE;
	        this.rightSE = this.leftSE;
	        this.leftSE = tmpEvt;
	        this.leftSE.isLeft = true;
	        this.rightSE.isLeft = false;

	        for (var i = 0, iMax = this.windings.length; i < iMax; i++) {
	          this.windings[i] *= -1;
	        }
	      }
	      /* Consume another segment. We take their rings under our wing
	       * and mark them as consumed. Use for perfectly overlapping segments */

	    }, {
	      key: "consume",
	      value: function consume(other) {
	        var consumer = this;
	        var consumee = other;

	        while (consumer.consumedBy) {
	          consumer = consumer.consumedBy;
	        }

	        while (consumee.consumedBy) {
	          consumee = consumee.consumedBy;
	        }

	        var cmp = Segment.compare(consumer, consumee);
	        if (cmp === 0) return; // already consumed
	        // the winner of the consumption is the earlier segment
	        // according to sweep line ordering

	        if (cmp > 0) {
	          var tmp = consumer;
	          consumer = consumee;
	          consumee = tmp;
	        } // make sure a segment doesn't consume it's prev


	        if (consumer.prev === consumee) {
	          var _tmp = consumer;
	          consumer = consumee;
	          consumee = _tmp;
	        }

	        for (var i = 0, iMax = consumee.rings.length; i < iMax; i++) {
	          var ring = consumee.rings[i];
	          var winding = consumee.windings[i];
	          var index = consumer.rings.indexOf(ring);

	          if (index === -1) {
	            consumer.rings.push(ring);
	            consumer.windings.push(winding);
	          } else consumer.windings[index] += winding;
	        }

	        consumee.rings = null;
	        consumee.windings = null;
	        consumee.consumedBy = consumer; // mark sweep events consumed as to maintain ordering in sweep event queue

	        consumee.leftSE.consumedBy = consumer.leftSE;
	        consumee.rightSE.consumedBy = consumer.rightSE;
	      }
	      /* The first segment previous segment chain that is in the result */

	    }, {
	      key: "prevInResult",
	      value: function prevInResult() {
	        if (this._prevInResult !== undefined) return this._prevInResult;
	        if (!this.prev) this._prevInResult = null;else if (this.prev.isInResult()) this._prevInResult = this.prev;else this._prevInResult = this.prev.prevInResult();
	        return this._prevInResult;
	      }
	    }, {
	      key: "beforeState",
	      value: function beforeState() {
	        if (this._beforeState !== undefined) return this._beforeState;
	        if (!this.prev) this._beforeState = {
	          rings: [],
	          windings: [],
	          multiPolys: []
	        };else {
	          var seg = this.prev.consumedBy || this.prev;
	          this._beforeState = seg.afterState();
	        }
	        return this._beforeState;
	      }
	    }, {
	      key: "afterState",
	      value: function afterState() {
	        if (this._afterState !== undefined) return this._afterState;
	        var beforeState = this.beforeState();
	        this._afterState = {
	          rings: beforeState.rings.slice(0),
	          windings: beforeState.windings.slice(0),
	          multiPolys: []
	        };
	        var ringsAfter = this._afterState.rings;
	        var windingsAfter = this._afterState.windings;
	        var mpsAfter = this._afterState.multiPolys; // calculate ringsAfter, windingsAfter

	        for (var i = 0, iMax = this.rings.length; i < iMax; i++) {
	          var ring = this.rings[i];
	          var winding = this.windings[i];
	          var index = ringsAfter.indexOf(ring);

	          if (index === -1) {
	            ringsAfter.push(ring);
	            windingsAfter.push(winding);
	          } else windingsAfter[index] += winding;
	        } // calcualte polysAfter


	        var polysAfter = [];
	        var polysExclude = [];

	        for (var _i = 0, _iMax = ringsAfter.length; _i < _iMax; _i++) {
	          if (windingsAfter[_i] === 0) continue; // non-zero rule

	          var _ring = ringsAfter[_i];
	          var poly = _ring.poly;
	          if (polysExclude.indexOf(poly) !== -1) continue;
	          if (_ring.isExterior) polysAfter.push(poly);else {
	            if (polysExclude.indexOf(poly) === -1) polysExclude.push(poly);

	            var _index = polysAfter.indexOf(_ring.poly);

	            if (_index !== -1) polysAfter.splice(_index, 1);
	          }
	        } // calculate multiPolysAfter


	        for (var _i2 = 0, _iMax2 = polysAfter.length; _i2 < _iMax2; _i2++) {
	          var mp = polysAfter[_i2].multiPoly;
	          if (mpsAfter.indexOf(mp) === -1) mpsAfter.push(mp);
	        }

	        return this._afterState;
	      }
	      /* Is this segment part of the final result? */

	    }, {
	      key: "isInResult",
	      value: function isInResult() {
	        // if we've been consumed, we're not in the result
	        if (this.consumedBy) return false;
	        if (this._isInResult !== undefined) return this._isInResult;
	        var mpsBefore = this.beforeState().multiPolys;
	        var mpsAfter = this.afterState().multiPolys;

	        switch (operation.type) {
	          case 'union':
	            {
	              // UNION - included iff:
	              //  * On one side of us there is 0 poly interiors AND
	              //  * On the other side there is 1 or more.
	              var noBefores = mpsBefore.length === 0;
	              var noAfters = mpsAfter.length === 0;
	              this._isInResult = noBefores !== noAfters;
	              break;
	            }

	          case 'intersection':
	            {
	              // INTERSECTION - included iff:
	              //  * on one side of us all multipolys are rep. with poly interiors AND
	              //  * on the other side of us, not all multipolys are repsented
	              //    with poly interiors
	              var least;
	              var most;

	              if (mpsBefore.length < mpsAfter.length) {
	                least = mpsBefore.length;
	                most = mpsAfter.length;
	              } else {
	                least = mpsAfter.length;
	                most = mpsBefore.length;
	              }

	              this._isInResult = most === operation.numMultiPolys && least < most;
	              break;
	            }

	          case 'xor':
	            {
	              // XOR - included iff:
	              //  * the difference between the number of multipolys represented
	              //    with poly interiors on our two sides is an odd number
	              var diff = Math.abs(mpsBefore.length - mpsAfter.length);
	              this._isInResult = diff % 2 === 1;
	              break;
	            }

	          case 'difference':
	            {
	              // DIFFERENCE included iff:
	              //  * on exactly one side, we have just the subject
	              var isJustSubject = function isJustSubject(mps) {
	                return mps.length === 1 && mps[0].isSubject;
	              };

	              this._isInResult = isJustSubject(mpsBefore) !== isJustSubject(mpsAfter);
	              break;
	            }

	          default:
	            throw new Error("Unrecognized operation type found ".concat(operation.type));
	        }

	        return this._isInResult;
	      }
	    }], [{
	      key: "fromRing",
	      value: function fromRing(pt1, pt2, ring) {
	        var leftPt, rightPt, winding; // ordering the two points according to sweep line ordering

	        var cmpPts = SweepEvent.comparePoints(pt1, pt2);

	        if (cmpPts < 0) {
	          leftPt = pt1;
	          rightPt = pt2;
	          winding = 1;
	        } else if (cmpPts > 0) {
	          leftPt = pt2;
	          rightPt = pt1;
	          winding = -1;
	        } else throw new Error("Tried to create degenerate segment at [".concat(pt1.x, ", ").concat(pt1.y, "]"));

	        var leftSE = new SweepEvent(leftPt, true);
	        var rightSE = new SweepEvent(rightPt, false);
	        return new Segment(leftSE, rightSE, [ring], [winding]);
	      }
	    }]);

	    return Segment;
	  }();

	  var RingIn = /*#__PURE__*/function () {
	    function RingIn(geomRing, poly, isExterior) {
	      _classCallCheck(this, RingIn);

	      if (!Array.isArray(geomRing) || geomRing.length === 0) {
	        throw new Error('Input geometry is not a valid Polygon or MultiPolygon');
	      }

	      this.poly = poly;
	      this.isExterior = isExterior;
	      this.segments = [];

	      if (typeof geomRing[0][0] !== 'number' || typeof geomRing[0][1] !== 'number') {
	        throw new Error('Input geometry is not a valid Polygon or MultiPolygon');
	      }

	      var firstPoint = rounder.round(geomRing[0][0], geomRing[0][1]);
	      this.bbox = {
	        ll: {
	          x: firstPoint.x,
	          y: firstPoint.y
	        },
	        ur: {
	          x: firstPoint.x,
	          y: firstPoint.y
	        }
	      };
	      var prevPoint = firstPoint;

	      for (var i = 1, iMax = geomRing.length; i < iMax; i++) {
	        if (typeof geomRing[i][0] !== 'number' || typeof geomRing[i][1] !== 'number') {
	          throw new Error('Input geometry is not a valid Polygon or MultiPolygon');
	        }

	        var point = rounder.round(geomRing[i][0], geomRing[i][1]); // skip repeated points

	        if (point.x === prevPoint.x && point.y === prevPoint.y) continue;
	        this.segments.push(Segment.fromRing(prevPoint, point, this));
	        if (point.x < this.bbox.ll.x) this.bbox.ll.x = point.x;
	        if (point.y < this.bbox.ll.y) this.bbox.ll.y = point.y;
	        if (point.x > this.bbox.ur.x) this.bbox.ur.x = point.x;
	        if (point.y > this.bbox.ur.y) this.bbox.ur.y = point.y;
	        prevPoint = point;
	      } // add segment from last to first if last is not the same as first


	      if (firstPoint.x !== prevPoint.x || firstPoint.y !== prevPoint.y) {
	        this.segments.push(Segment.fromRing(prevPoint, firstPoint, this));
	      }
	    }

	    _createClass(RingIn, [{
	      key: "getSweepEvents",
	      value: function getSweepEvents() {
	        var sweepEvents = [];

	        for (var i = 0, iMax = this.segments.length; i < iMax; i++) {
	          var segment = this.segments[i];
	          sweepEvents.push(segment.leftSE);
	          sweepEvents.push(segment.rightSE);
	        }

	        return sweepEvents;
	      }
	    }]);

	    return RingIn;
	  }();
	  var PolyIn = /*#__PURE__*/function () {
	    function PolyIn(geomPoly, multiPoly) {
	      _classCallCheck(this, PolyIn);

	      if (!Array.isArray(geomPoly)) {
	        throw new Error('Input geometry is not a valid Polygon or MultiPolygon');
	      }

	      this.exteriorRing = new RingIn(geomPoly[0], this, true); // copy by value

	      this.bbox = {
	        ll: {
	          x: this.exteriorRing.bbox.ll.x,
	          y: this.exteriorRing.bbox.ll.y
	        },
	        ur: {
	          x: this.exteriorRing.bbox.ur.x,
	          y: this.exteriorRing.bbox.ur.y
	        }
	      };
	      this.interiorRings = [];

	      for (var i = 1, iMax = geomPoly.length; i < iMax; i++) {
	        var ring = new RingIn(geomPoly[i], this, false);
	        if (ring.bbox.ll.x < this.bbox.ll.x) this.bbox.ll.x = ring.bbox.ll.x;
	        if (ring.bbox.ll.y < this.bbox.ll.y) this.bbox.ll.y = ring.bbox.ll.y;
	        if (ring.bbox.ur.x > this.bbox.ur.x) this.bbox.ur.x = ring.bbox.ur.x;
	        if (ring.bbox.ur.y > this.bbox.ur.y) this.bbox.ur.y = ring.bbox.ur.y;
	        this.interiorRings.push(ring);
	      }

	      this.multiPoly = multiPoly;
	    }

	    _createClass(PolyIn, [{
	      key: "getSweepEvents",
	      value: function getSweepEvents() {
	        var sweepEvents = this.exteriorRing.getSweepEvents();

	        for (var i = 0, iMax = this.interiorRings.length; i < iMax; i++) {
	          var ringSweepEvents = this.interiorRings[i].getSweepEvents();

	          for (var j = 0, jMax = ringSweepEvents.length; j < jMax; j++) {
	            sweepEvents.push(ringSweepEvents[j]);
	          }
	        }

	        return sweepEvents;
	      }
	    }]);

	    return PolyIn;
	  }();
	  var MultiPolyIn = /*#__PURE__*/function () {
	    function MultiPolyIn(geom, isSubject) {
	      _classCallCheck(this, MultiPolyIn);

	      if (!Array.isArray(geom)) {
	        throw new Error('Input geometry is not a valid Polygon or MultiPolygon');
	      }

	      try {
	        // if the input looks like a polygon, convert it to a multipolygon
	        if (typeof geom[0][0][0] === 'number') geom = [geom];
	      } catch (ex) {// The input is either malformed or has empty arrays.
	        // In either case, it will be handled later on.
	      }

	      this.polys = [];
	      this.bbox = {
	        ll: {
	          x: Number.POSITIVE_INFINITY,
	          y: Number.POSITIVE_INFINITY
	        },
	        ur: {
	          x: Number.NEGATIVE_INFINITY,
	          y: Number.NEGATIVE_INFINITY
	        }
	      };

	      for (var i = 0, iMax = geom.length; i < iMax; i++) {
	        var poly = new PolyIn(geom[i], this);
	        if (poly.bbox.ll.x < this.bbox.ll.x) this.bbox.ll.x = poly.bbox.ll.x;
	        if (poly.bbox.ll.y < this.bbox.ll.y) this.bbox.ll.y = poly.bbox.ll.y;
	        if (poly.bbox.ur.x > this.bbox.ur.x) this.bbox.ur.x = poly.bbox.ur.x;
	        if (poly.bbox.ur.y > this.bbox.ur.y) this.bbox.ur.y = poly.bbox.ur.y;
	        this.polys.push(poly);
	      }

	      this.isSubject = isSubject;
	    }

	    _createClass(MultiPolyIn, [{
	      key: "getSweepEvents",
	      value: function getSweepEvents() {
	        var sweepEvents = [];

	        for (var i = 0, iMax = this.polys.length; i < iMax; i++) {
	          var polySweepEvents = this.polys[i].getSweepEvents();

	          for (var j = 0, jMax = polySweepEvents.length; j < jMax; j++) {
	            sweepEvents.push(polySweepEvents[j]);
	          }
	        }

	        return sweepEvents;
	      }
	    }]);

	    return MultiPolyIn;
	  }();

	  var RingOut = /*#__PURE__*/function () {
	    _createClass(RingOut, null, [{
	      key: "factory",

	      /* Given the segments from the sweep line pass, compute & return a series
	       * of closed rings from all the segments marked to be part of the result */
	      value: function factory(allSegments) {
	        var ringsOut = [];

	        for (var i = 0, iMax = allSegments.length; i < iMax; i++) {
	          var segment = allSegments[i];
	          if (!segment.isInResult() || segment.ringOut) continue;
	          var prevEvent = null;
	          var event = segment.leftSE;
	          var nextEvent = segment.rightSE;
	          var events = [event];
	          var startingPoint = event.point;
	          var intersectionLEs = [];
	          /* Walk the chain of linked events to form a closed ring */

	          while (true) {
	            prevEvent = event;
	            event = nextEvent;
	            events.push(event);
	            /* Is the ring complete? */

	            if (event.point === startingPoint) break;

	            while (true) {
	              var availableLEs = event.getAvailableLinkedEvents();
	              /* Did we hit a dead end? This shouldn't happen. Indicates some earlier
	               * part of the algorithm malfunctioned... please file a bug report. */

	              if (availableLEs.length === 0) {
	                var firstPt = events[0].point;
	                var lastPt = events[events.length - 1].point;
	                throw new Error("Unable to complete output ring starting at [".concat(firstPt.x, ",") + " ".concat(firstPt.y, "]. Last matching segment found ends at") + " [".concat(lastPt.x, ", ").concat(lastPt.y, "]."));
	              }
	              /* Only one way to go, so cotinue on the path */


	              if (availableLEs.length === 1) {
	                nextEvent = availableLEs[0].otherSE;
	                break;
	              }
	              /* We must have an intersection. Check for a completed loop */


	              var indexLE = null;

	              for (var j = 0, jMax = intersectionLEs.length; j < jMax; j++) {
	                if (intersectionLEs[j].point === event.point) {
	                  indexLE = j;
	                  break;
	                }
	              }
	              /* Found a completed loop. Cut that off and make a ring */


	              if (indexLE !== null) {
	                var intersectionLE = intersectionLEs.splice(indexLE)[0];
	                var ringEvents = events.splice(intersectionLE.index);
	                ringEvents.unshift(ringEvents[0].otherSE);
	                ringsOut.push(new RingOut(ringEvents.reverse()));
	                continue;
	              }
	              /* register the intersection */


	              intersectionLEs.push({
	                index: events.length,
	                point: event.point
	              });
	              /* Choose the left-most option to continue the walk */

	              var comparator = event.getLeftmostComparator(prevEvent);
	              nextEvent = availableLEs.sort(comparator)[0].otherSE;
	              break;
	            }
	          }

	          ringsOut.push(new RingOut(events));
	        }

	        return ringsOut;
	      }
	    }]);

	    function RingOut(events) {
	      _classCallCheck(this, RingOut);

	      this.events = events;

	      for (var i = 0, iMax = events.length; i < iMax; i++) {
	        events[i].segment.ringOut = this;
	      }

	      this.poly = null;
	    }

	    _createClass(RingOut, [{
	      key: "getGeom",
	      value: function getGeom() {
	        // Remove superfluous points (ie extra points along a straight line),
	        var prevPt = this.events[0].point;
	        var points = [prevPt];

	        for (var i = 1, iMax = this.events.length - 1; i < iMax; i++) {
	          var _pt = this.events[i].point;
	          var _nextPt = this.events[i + 1].point;
	          if (compareVectorAngles(_pt, prevPt, _nextPt) === 0) continue;
	          points.push(_pt);
	          prevPt = _pt;
	        } // ring was all (within rounding error of angle calc) colinear points


	        if (points.length === 1) return null; // check if the starting point is necessary

	        var pt = points[0];
	        var nextPt = points[1];
	        if (compareVectorAngles(pt, prevPt, nextPt) === 0) points.shift();
	        points.push(points[0]);
	        var step = this.isExteriorRing() ? 1 : -1;
	        var iStart = this.isExteriorRing() ? 0 : points.length - 1;
	        var iEnd = this.isExteriorRing() ? points.length : -1;
	        var orderedPoints = [];

	        for (var _i = iStart; _i != iEnd; _i += step) {
	          orderedPoints.push([points[_i].x, points[_i].y]);
	        }

	        return orderedPoints;
	      }
	    }, {
	      key: "isExteriorRing",
	      value: function isExteriorRing() {
	        if (this._isExteriorRing === undefined) {
	          var enclosing = this.enclosingRing();
	          this._isExteriorRing = enclosing ? !enclosing.isExteriorRing() : true;
	        }

	        return this._isExteriorRing;
	      }
	    }, {
	      key: "enclosingRing",
	      value: function enclosingRing() {
	        if (this._enclosingRing === undefined) {
	          this._enclosingRing = this._calcEnclosingRing();
	        }

	        return this._enclosingRing;
	      }
	      /* Returns the ring that encloses this one, if any */

	    }, {
	      key: "_calcEnclosingRing",
	      value: function _calcEnclosingRing() {
	        // start with the ealier sweep line event so that the prevSeg
	        // chain doesn't lead us inside of a loop of ours
	        var leftMostEvt = this.events[0];

	        for (var i = 1, iMax = this.events.length; i < iMax; i++) {
	          var evt = this.events[i];
	          if (SweepEvent.compare(leftMostEvt, evt) > 0) leftMostEvt = evt;
	        }

	        var prevSeg = leftMostEvt.segment.prevInResult();
	        var prevPrevSeg = prevSeg ? prevSeg.prevInResult() : null;

	        while (true) {
	          // no segment found, thus no ring can enclose us
	          if (!prevSeg) return null; // no segments below prev segment found, thus the ring of the prev
	          // segment must loop back around and enclose us

	          if (!prevPrevSeg) return prevSeg.ringOut; // if the two segments are of different rings, the ring of the prev
	          // segment must either loop around us or the ring of the prev prev
	          // seg, which would make us and the ring of the prev peers

	          if (prevPrevSeg.ringOut !== prevSeg.ringOut) {
	            if (prevPrevSeg.ringOut.enclosingRing() !== prevSeg.ringOut) {
	              return prevSeg.ringOut;
	            } else return prevSeg.ringOut.enclosingRing();
	          } // two segments are from the same ring, so this was a penisula
	          // of that ring. iterate downward, keep searching


	          prevSeg = prevPrevSeg.prevInResult();
	          prevPrevSeg = prevSeg ? prevSeg.prevInResult() : null;
	        }
	      }
	    }]);

	    return RingOut;
	  }();
	  var PolyOut = /*#__PURE__*/function () {
	    function PolyOut(exteriorRing) {
	      _classCallCheck(this, PolyOut);

	      this.exteriorRing = exteriorRing;
	      exteriorRing.poly = this;
	      this.interiorRings = [];
	    }

	    _createClass(PolyOut, [{
	      key: "addInterior",
	      value: function addInterior(ring) {
	        this.interiorRings.push(ring);
	        ring.poly = this;
	      }
	    }, {
	      key: "getGeom",
	      value: function getGeom() {
	        var geom = [this.exteriorRing.getGeom()]; // exterior ring was all (within rounding error of angle calc) colinear points

	        if (geom[0] === null) return null;

	        for (var i = 0, iMax = this.interiorRings.length; i < iMax; i++) {
	          var ringGeom = this.interiorRings[i].getGeom(); // interior ring was all (within rounding error of angle calc) colinear points

	          if (ringGeom === null) continue;
	          geom.push(ringGeom);
	        }

	        return geom;
	      }
	    }]);

	    return PolyOut;
	  }();
	  var MultiPolyOut = /*#__PURE__*/function () {
	    function MultiPolyOut(rings) {
	      _classCallCheck(this, MultiPolyOut);

	      this.rings = rings;
	      this.polys = this._composePolys(rings);
	    }

	    _createClass(MultiPolyOut, [{
	      key: "getGeom",
	      value: function getGeom() {
	        var geom = [];

	        for (var i = 0, iMax = this.polys.length; i < iMax; i++) {
	          var polyGeom = this.polys[i].getGeom(); // exterior ring was all (within rounding error of angle calc) colinear points

	          if (polyGeom === null) continue;
	          geom.push(polyGeom);
	        }

	        return geom;
	      }
	    }, {
	      key: "_composePolys",
	      value: function _composePolys(rings) {
	        var polys = [];

	        for (var i = 0, iMax = rings.length; i < iMax; i++) {
	          var ring = rings[i];
	          if (ring.poly) continue;
	          if (ring.isExteriorRing()) polys.push(new PolyOut(ring));else {
	            var enclosingRing = ring.enclosingRing();
	            if (!enclosingRing.poly) polys.push(new PolyOut(enclosingRing));
	            enclosingRing.poly.addInterior(ring);
	          }
	        }

	        return polys;
	      }
	    }]);

	    return MultiPolyOut;
	  }();

	  /**
	   * NOTE:  We must be careful not to change any segments while
	   *        they are in the SplayTree. AFAIK, there's no way to tell
	   *        the tree to rebalance itself - thus before splitting
	   *        a segment that's in the tree, we remove it from the tree,
	   *        do the split, then re-insert it. (Even though splitting a
	   *        segment *shouldn't* change its correct position in the
	   *        sweep line tree, the reality is because of rounding errors,
	   *        it sometimes does.)
	   */

	  var SweepLine = /*#__PURE__*/function () {
	    function SweepLine(queue) {
	      var comparator = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : Segment.compare;

	      _classCallCheck(this, SweepLine);

	      this.queue = queue;
	      this.tree = new Tree(comparator);
	      this.segments = [];
	    }

	    _createClass(SweepLine, [{
	      key: "process",
	      value: function process(event) {
	        var segment = event.segment;
	        var newEvents = []; // if we've already been consumed by another segment,
	        // clean up our body parts and get out

	        if (event.consumedBy) {
	          if (event.isLeft) this.queue.remove(event.otherSE);else this.tree.remove(segment);
	          return newEvents;
	        }

	        var node = event.isLeft ? this.tree.insert(segment) : this.tree.find(segment);
	        if (!node) throw new Error("Unable to find segment #".concat(segment.id, " ") + "[".concat(segment.leftSE.point.x, ", ").concat(segment.leftSE.point.y, "] -> ") + "[".concat(segment.rightSE.point.x, ", ").concat(segment.rightSE.point.y, "] ") + 'in SweepLine tree. Please submit a bug report.');
	        var prevNode = node;
	        var nextNode = node;
	        var prevSeg = undefined;
	        var nextSeg = undefined; // skip consumed segments still in tree

	        while (prevSeg === undefined) {
	          prevNode = this.tree.prev(prevNode);
	          if (prevNode === null) prevSeg = null;else if (prevNode.key.consumedBy === undefined) prevSeg = prevNode.key;
	        } // skip consumed segments still in tree


	        while (nextSeg === undefined) {
	          nextNode = this.tree.next(nextNode);
	          if (nextNode === null) nextSeg = null;else if (nextNode.key.consumedBy === undefined) nextSeg = nextNode.key;
	        }

	        if (event.isLeft) {
	          // Check for intersections against the previous segment in the sweep line
	          var prevMySplitter = null;

	          if (prevSeg) {
	            var prevInter = prevSeg.getIntersection(segment);

	            if (prevInter !== null) {
	              if (!segment.isAnEndpoint(prevInter)) prevMySplitter = prevInter;

	              if (!prevSeg.isAnEndpoint(prevInter)) {
	                var newEventsFromSplit = this._splitSafely(prevSeg, prevInter);

	                for (var i = 0, iMax = newEventsFromSplit.length; i < iMax; i++) {
	                  newEvents.push(newEventsFromSplit[i]);
	                }
	              }
	            }
	          } // Check for intersections against the next segment in the sweep line


	          var nextMySplitter = null;

	          if (nextSeg) {
	            var nextInter = nextSeg.getIntersection(segment);

	            if (nextInter !== null) {
	              if (!segment.isAnEndpoint(nextInter)) nextMySplitter = nextInter;

	              if (!nextSeg.isAnEndpoint(nextInter)) {
	                var _newEventsFromSplit = this._splitSafely(nextSeg, nextInter);

	                for (var _i = 0, _iMax = _newEventsFromSplit.length; _i < _iMax; _i++) {
	                  newEvents.push(_newEventsFromSplit[_i]);
	                }
	              }
	            }
	          } // For simplicity, even if we find more than one intersection we only
	          // spilt on the 'earliest' (sweep-line style) of the intersections.
	          // The other intersection will be handled in a future process().


	          if (prevMySplitter !== null || nextMySplitter !== null) {
	            var mySplitter = null;
	            if (prevMySplitter === null) mySplitter = nextMySplitter;else if (nextMySplitter === null) mySplitter = prevMySplitter;else {
	              var cmpSplitters = SweepEvent.comparePoints(prevMySplitter, nextMySplitter);
	              mySplitter = cmpSplitters <= 0 ? prevMySplitter : nextMySplitter;
	            } // Rounding errors can cause changes in ordering,
	            // so remove afected segments and right sweep events before splitting

	            this.queue.remove(segment.rightSE);
	            newEvents.push(segment.rightSE);

	            var _newEventsFromSplit2 = segment.split(mySplitter);

	            for (var _i2 = 0, _iMax2 = _newEventsFromSplit2.length; _i2 < _iMax2; _i2++) {
	              newEvents.push(_newEventsFromSplit2[_i2]);
	            }
	          }

	          if (newEvents.length > 0) {
	            // We found some intersections, so re-do the current event to
	            // make sure sweep line ordering is totally consistent for later
	            // use with the segment 'prev' pointers
	            this.tree.remove(segment);
	            newEvents.push(event);
	          } else {
	            // done with left event
	            this.segments.push(segment);
	            segment.prev = prevSeg;
	          }
	        } else {
	          // event.isRight
	          // since we're about to be removed from the sweep line, check for
	          // intersections between our previous and next segments
	          if (prevSeg && nextSeg) {
	            var inter = prevSeg.getIntersection(nextSeg);

	            if (inter !== null) {
	              if (!prevSeg.isAnEndpoint(inter)) {
	                var _newEventsFromSplit3 = this._splitSafely(prevSeg, inter);

	                for (var _i3 = 0, _iMax3 = _newEventsFromSplit3.length; _i3 < _iMax3; _i3++) {
	                  newEvents.push(_newEventsFromSplit3[_i3]);
	                }
	              }

	              if (!nextSeg.isAnEndpoint(inter)) {
	                var _newEventsFromSplit4 = this._splitSafely(nextSeg, inter);

	                for (var _i4 = 0, _iMax4 = _newEventsFromSplit4.length; _i4 < _iMax4; _i4++) {
	                  newEvents.push(_newEventsFromSplit4[_i4]);
	                }
	              }
	            }
	          }

	          this.tree.remove(segment);
	        }

	        return newEvents;
	      }
	      /* Safely split a segment that is currently in the datastructures
	       * IE - a segment other than the one that is currently being processed. */

	    }, {
	      key: "_splitSafely",
	      value: function _splitSafely(seg, pt) {
	        // Rounding errors can cause changes in ordering,
	        // so remove afected segments and right sweep events before splitting
	        // removeNode() doesn't work, so have re-find the seg
	        // https://github.com/w8r/splay-tree/pull/5
	        this.tree.remove(seg);
	        var rightSE = seg.rightSE;
	        this.queue.remove(rightSE);
	        var newEvents = seg.split(pt);
	        newEvents.push(rightSE); // splitting can trigger consumption

	        if (seg.consumedBy === undefined) this.tree.insert(seg);
	        return newEvents;
	      }
	    }]);

	    return SweepLine;
	  }();

	  var POLYGON_CLIPPING_MAX_QUEUE_SIZE = typeof process !== 'undefined' && process.env.POLYGON_CLIPPING_MAX_QUEUE_SIZE || 1000000;
	  var POLYGON_CLIPPING_MAX_SWEEPLINE_SEGMENTS = typeof process !== 'undefined' && process.env.POLYGON_CLIPPING_MAX_SWEEPLINE_SEGMENTS || 1000000;
	  var Operation = /*#__PURE__*/function () {
	    function Operation() {
	      _classCallCheck(this, Operation);
	    }

	    _createClass(Operation, [{
	      key: "run",
	      value: function run(type, geom, moreGeoms) {
	        operation.type = type;
	        rounder.reset();
	        /* Convert inputs to MultiPoly objects */

	        var multipolys = [new MultiPolyIn(geom, true)];

	        for (var i = 0, iMax = moreGeoms.length; i < iMax; i++) {
	          multipolys.push(new MultiPolyIn(moreGeoms[i], false));
	        }

	        operation.numMultiPolys = multipolys.length;
	        /* BBox optimization for difference operation
	         * If the bbox of a multipolygon that's part of the clipping doesn't
	         * intersect the bbox of the subject at all, we can just drop that
	         * multiploygon. */

	        if (operation.type === 'difference') {
	          // in place removal
	          var subject = multipolys[0];
	          var _i = 1;

	          while (_i < multipolys.length) {
	            if (getBboxOverlap(multipolys[_i].bbox, subject.bbox) !== null) _i++;else multipolys.splice(_i, 1);
	          }
	        }
	        /* BBox optimization for intersection operation
	         * If we can find any pair of multipolygons whose bbox does not overlap,
	         * then the result will be empty. */


	        if (operation.type === 'intersection') {
	          // TODO: this is O(n^2) in number of polygons. By sorting the bboxes,
	          //       it could be optimized to O(n * ln(n))
	          for (var _i2 = 0, _iMax = multipolys.length; _i2 < _iMax; _i2++) {
	            var mpA = multipolys[_i2];

	            for (var j = _i2 + 1, jMax = multipolys.length; j < jMax; j++) {
	              if (getBboxOverlap(mpA.bbox, multipolys[j].bbox) === null) return [];
	            }
	          }
	        }
	        /* Put segment endpoints in a priority queue */


	        var queue = new Tree(SweepEvent.compare);

	        for (var _i3 = 0, _iMax2 = multipolys.length; _i3 < _iMax2; _i3++) {
	          var sweepEvents = multipolys[_i3].getSweepEvents();

	          for (var _j = 0, _jMax = sweepEvents.length; _j < _jMax; _j++) {
	            queue.insert(sweepEvents[_j]);

	            if (queue.size > POLYGON_CLIPPING_MAX_QUEUE_SIZE) {
	              // prevents an infinite loop, an otherwise common manifestation of bugs
	              throw new Error('Infinite loop when putting segment endpoints in a priority queue ' + '(queue size too big). Please file a bug report.');
	            }
	          }
	        }
	        /* Pass the sweep line over those endpoints */


	        var sweepLine = new SweepLine(queue);
	        var prevQueueSize = queue.size;
	        var node = queue.pop();

	        while (node) {
	          var evt = node.key;

	          if (queue.size === prevQueueSize) {
	            // prevents an infinite loop, an otherwise common manifestation of bugs
	            var seg = evt.segment;
	            throw new Error("Unable to pop() ".concat(evt.isLeft ? 'left' : 'right', " SweepEvent ") + "[".concat(evt.point.x, ", ").concat(evt.point.y, "] from segment #").concat(seg.id, " ") + "[".concat(seg.leftSE.point.x, ", ").concat(seg.leftSE.point.y, "] -> ") + "[".concat(seg.rightSE.point.x, ", ").concat(seg.rightSE.point.y, "] from queue. ") + 'Please file a bug report.');
	          }

	          if (queue.size > POLYGON_CLIPPING_MAX_QUEUE_SIZE) {
	            // prevents an infinite loop, an otherwise common manifestation of bugs
	            throw new Error('Infinite loop when passing sweep line over endpoints ' + '(queue size too big). Please file a bug report.');
	          }

	          if (sweepLine.segments.length > POLYGON_CLIPPING_MAX_SWEEPLINE_SEGMENTS) {
	            // prevents an infinite loop, an otherwise common manifestation of bugs
	            throw new Error('Infinite loop when passing sweep line over endpoints ' + '(too many sweep line segments). Please file a bug report.');
	          }

	          var newEvents = sweepLine.process(evt);

	          for (var _i4 = 0, _iMax3 = newEvents.length; _i4 < _iMax3; _i4++) {
	            var _evt = newEvents[_i4];
	            if (_evt.consumedBy === undefined) queue.insert(_evt);
	          }

	          prevQueueSize = queue.size;
	          node = queue.pop();
	        } // free some memory we don't need anymore


	        rounder.reset();
	        /* Collect and compile segments we're keeping into a multipolygon */

	        var ringsOut = RingOut.factory(sweepLine.segments);
	        var result = new MultiPolyOut(ringsOut);
	        return result.getGeom();
	      }
	    }]);

	    return Operation;
	  }(); // singleton available by import

	  var operation = new Operation();

	  var union = function union(geom) {
	    for (var _len = arguments.length, moreGeoms = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
	      moreGeoms[_key - 1] = arguments[_key];
	    }

	    return operation.run('union', geom, moreGeoms);
	  };

	  var intersection$1 = function intersection(geom) {
	    for (var _len2 = arguments.length, moreGeoms = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
	      moreGeoms[_key2 - 1] = arguments[_key2];
	    }

	    return operation.run('intersection', geom, moreGeoms);
	  };

	  var xor = function xor(geom) {
	    for (var _len3 = arguments.length, moreGeoms = new Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
	      moreGeoms[_key3 - 1] = arguments[_key3];
	    }

	    return operation.run('xor', geom, moreGeoms);
	  };

	  var difference = function difference(subjectGeom) {
	    for (var _len4 = arguments.length, clippingGeoms = new Array(_len4 > 1 ? _len4 - 1 : 0), _key4 = 1; _key4 < _len4; _key4++) {
	      clippingGeoms[_key4 - 1] = arguments[_key4];
	    }

	    return operation.run('difference', subjectGeom, clippingGeoms);
	  };

	  var index = {
	    union: union,
	    intersection: intersection$1,
	    xor: xor,
	    difference: difference
	  };

	  return index;

	})));
} (polygonClipping_umd));

var polygonClipping = polygonClipping_umd.exports;

var terraformerWktParser = {exports: {}};

var terraformer = {exports: {}};

var hasRequiredTerraformer;

function requireTerraformer () {
	if (hasRequiredTerraformer) return terraformer.exports;
	hasRequiredTerraformer = 1;
	(function (module, exports) {
		(function (root, factory) {

		  // Node.
		  {
		    module.exports = factory();
		  }

		  // Browser Global.
		  if(typeof window === "object") {
		    root.Terraformer = factory();
		  }

		}(commonjsGlobal, function(){

		  var exports = {},
		      EarthRadius = 6378137,
		      DegreesPerRadian = 57.295779513082320,
		      RadiansPerDegree =  0.017453292519943,
		      MercatorCRS = {
		        "type": "link",
		        "properties": {
		          "href": "http://spatialreference.org/ref/sr-org/6928/ogcwkt/",
		          "type": "ogcwkt"
		        }
		      },
		      GeographicCRS = {
		        "type": "link",
		        "properties": {
		          "href": "http://spatialreference.org/ref/epsg/4326/ogcwkt/",
		          "type": "ogcwkt"
		        }
		      };

		  /*
		  Internal: isArray function
		  */
		  function isArray(obj) {
		    return Object.prototype.toString.call(obj) === "[object Array]";
		  }

		  /*
		  Internal: safe warning
		  */
		  function warn() {
		    var args = Array.prototype.slice.apply(arguments);

		    if (typeof console !== undefined && console.warn) {
		      console.warn.apply(console, args);
		    }
		  }

		  /*
		  Internal: Extend one object with another.
		  */
		  function extend(destination, source) {
		    for (var k in source) {
		      if (source.hasOwnProperty(k)) {
		        destination[k] = source[k];
		      }
		    }
		    return destination;
		  }

		  /*
		  Public: Calculate an bounding box for a geojson object
		  */
		  function calculateBounds (geojson) {
		    if(geojson.type){
		      switch (geojson.type) {
		        case 'Point':
		          return [ geojson.coordinates[0], geojson.coordinates[1], geojson.coordinates[0], geojson.coordinates[1]];

		        case 'MultiPoint':
		          return calculateBoundsFromArray(geojson.coordinates);

		        case 'LineString':
		          return calculateBoundsFromArray(geojson.coordinates);

		        case 'MultiLineString':
		          return calculateBoundsFromNestedArrays(geojson.coordinates);

		        case 'Polygon':
		          return calculateBoundsFromNestedArrays(geojson.coordinates);

		        case 'MultiPolygon':
		          return calculateBoundsFromNestedArrayOfArrays(geojson.coordinates);

		        case 'Feature':
		          return geojson.geometry? calculateBounds(geojson.geometry) : null;

		        case 'FeatureCollection':
		          return calculateBoundsForFeatureCollection(geojson);

		        case 'GeometryCollection':
		          return calculateBoundsForGeometryCollection(geojson);

		        default:
		          throw new Error("Unknown type: " + geojson.type);
		      }
		    }
		    return null;
		  }

		  /*
		  Internal: Calculate an bounding box from an nested array of positions
		  [
		    [
		      [ [lng, lat],[lng, lat],[lng, lat] ]
		    ]
		    [
		      [lng, lat],[lng, lat],[lng, lat]
		    ]
		    [
		      [lng, lat],[lng, lat],[lng, lat]
		    ]
		  ]
		  */
		  function calculateBoundsFromNestedArrays (array) {
		    var x1 = null, x2 = null, y1 = null, y2 = null;

		    for (var i = 0; i < array.length; i++) {
		      var inner = array[i];

		      for (var j = 0; j < inner.length; j++) {
		        var lonlat = inner[j];

		        var lon = lonlat[0];
		        var lat = lonlat[1];

		        if (x1 === null) {
		          x1 = lon;
		        } else if (lon < x1) {
		          x1 = lon;
		        }

		        if (x2 === null) {
		          x2 = lon;
		        } else if (lon > x2) {
		          x2 = lon;
		        }

		        if (y1 === null) {
		          y1 = lat;
		        } else if (lat < y1) {
		          y1 = lat;
		        }

		        if (y2 === null) {
		          y2 = lat;
		        } else if (lat > y2) {
		          y2 = lat;
		        }
		      }
		    }

		    return [x1, y1, x2, y2 ];
		  }

		  /*
		  Internal: Calculate a bounding box from an array of arrays of arrays
		  [
		    [ [lng, lat],[lng, lat],[lng, lat] ]
		    [ [lng, lat],[lng, lat],[lng, lat] ]
		    [ [lng, lat],[lng, lat],[lng, lat] ]
		  ]
		  */
		  function calculateBoundsFromNestedArrayOfArrays (array) {
		    var x1 = null, x2 = null, y1 = null, y2 = null;

		    for (var i = 0; i < array.length; i++) {
		      var inner = array[i];

		      for (var j = 0; j < inner.length; j++) {
		        var innerinner = inner[j];
		        for (var k = 0; k < innerinner.length; k++) {
		          var lonlat = innerinner[k];

		          var lon = lonlat[0];
		          var lat = lonlat[1];

		          if (x1 === null) {
		            x1 = lon;
		          } else if (lon < x1) {
		            x1 = lon;
		          }

		          if (x2 === null) {
		            x2 = lon;
		          } else if (lon > x2) {
		            x2 = lon;
		          }

		          if (y1 === null) {
		            y1 = lat;
		          } else if (lat < y1) {
		            y1 = lat;
		          }

		          if (y2 === null) {
		            y2 = lat;
		          } else if (lat > y2) {
		            y2 = lat;
		          }
		        }
		      }
		    }

		    return [x1, y1, x2, y2];
		  }

		  /*
		  Internal: Calculate a bounding box from an array of positions
		  [
		    [lng, lat],[lng, lat],[lng, lat]
		  ]
		  */
		  function calculateBoundsFromArray (array) {
		    var x1 = null, x2 = null, y1 = null, y2 = null;

		    for (var i = 0; i < array.length; i++) {
		      var lonlat = array[i];
		      var lon = lonlat[0];
		      var lat = lonlat[1];

		      if (x1 === null) {
		        x1 = lon;
		      } else if (lon < x1) {
		        x1 = lon;
		      }

		      if (x2 === null) {
		        x2 = lon;
		      } else if (lon > x2) {
		        x2 = lon;
		      }

		      if (y1 === null) {
		        y1 = lat;
		      } else if (lat < y1) {
		        y1 = lat;
		      }

		      if (y2 === null) {
		        y2 = lat;
		      } else if (lat > y2) {
		        y2 = lat;
		      }
		    }

		    return [x1, y1, x2, y2 ];
		  }

		  /*
		  Internal: Calculate an bounding box for a feature collection
		  */
		  function calculateBoundsForFeatureCollection(featureCollection){
		    var extents = [], extent;
		    for (var i = featureCollection.features.length - 1; i >= 0; i--) {
		      extent = calculateBounds(featureCollection.features[i].geometry);
		      extents.push([extent[0],extent[1]]);
		      extents.push([extent[2],extent[3]]);
		    }

		    return calculateBoundsFromArray(extents);
		  }

		  /*
		  Internal: Calculate an bounding box for a geometry collection
		  */
		  function calculateBoundsForGeometryCollection(geometryCollection){
		    var extents = [], extent;

		    for (var i = geometryCollection.geometries.length - 1; i >= 0; i--) {
		      extent = calculateBounds(geometryCollection.geometries[i]);
		      extents.push([extent[0],extent[1]]);
		      extents.push([extent[2],extent[3]]);
		    }

		    return calculateBoundsFromArray(extents);
		  }

		  function calculateEnvelope(geojson){
		    var bounds = calculateBounds(geojson);
		    return {
		      x: bounds[0],
		      y: bounds[1],
		      w: Math.abs(bounds[0] - bounds[2]),
		      h: Math.abs(bounds[1] - bounds[3])
		    };
		  }

		  /*
		  Internal: Convert radians to degrees. Used by spatial reference converters.
		  */
		  function radToDeg(rad) {
		    return rad * DegreesPerRadian;
		  }

		  /*
		  Internal: Convert degrees to radians. Used by spatial reference converters.
		  */
		  function degToRad(deg) {
		    return deg * RadiansPerDegree;
		  }

		  /*
		  Internal: Loop over each array in a geojson object and apply a function to it. Used by spatial reference converters.
		  */
		  function eachPosition(coordinates, func) {
		    for (var i = 0; i < coordinates.length; i++) {
		      // we found a number so lets convert this pair
		      if(typeof coordinates[i][0] === "number"){
		        coordinates[i] = func(coordinates[i]);
		      }
		      // we found an coordinates array it again and run THIS function against it
		      if(typeof coordinates[i] === "object"){
		        coordinates[i] = eachPosition(coordinates[i], func);
		      }
		    }
		    return coordinates;
		  }

		  /*
		  Public: Convert a GeoJSON Position object to Geographic (4326)
		  */
		  function positionToGeographic(position) {
		    var x = position[0];
		    var y = position[1];
		    return [radToDeg(x / EarthRadius) - (Math.floor((radToDeg(x / EarthRadius) + 180) / 360) * 360), radToDeg((Math.PI / 2) - (2 * Math.atan(Math.exp(-1.0 * y / EarthRadius))))];
		  }

		  /*
		  Public: Convert a GeoJSON Position object to Web Mercator (102100)
		  */
		  function positionToMercator(position) {
		    var lng = position[0];
		    var lat = Math.max(Math.min(position[1], 89.99999), -89.99999);
		    return [degToRad(lng) * EarthRadius, EarthRadius/2.0 * Math.log( (1.0 + Math.sin(degToRad(lat))) / (1.0 - Math.sin(degToRad(lat))) )];
		  }

		  /*
		  Public: Apply a function agaist all positions in a geojson object. Used by spatial reference converters.
		  */
		  function applyConverter(geojson, converter, noCrs){
		    if(geojson.type === "Point") {
		      geojson.coordinates = converter(geojson.coordinates);
		    } else if(geojson.type === "Feature") {
		      geojson.geometry = applyConverter(geojson.geometry, converter, true);
		    } else if(geojson.type === "FeatureCollection") {
		      for (var f = 0; f < geojson.features.length; f++) {
		        geojson.features[f] = applyConverter(geojson.features[f], converter, true);
		      }
		    } else if(geojson.type === "GeometryCollection") {
		      for (var g = 0; g < geojson.geometries.length; g++) {
		        geojson.geometries[g] = applyConverter(geojson.geometries[g], converter, true);
		      }
		    } else {
		      geojson.coordinates = eachPosition(geojson.coordinates, converter);
		    }

		    if(!noCrs){
		      if(converter === positionToMercator){
		        geojson.crs = MercatorCRS;
		      }
		    }

		    if(converter === positionToGeographic){
		      delete geojson.crs;
		    }

		    return geojson;
		  }

		  /*
		  Public: Convert a GeoJSON object to ESRI Web Mercator (102100)
		  */
		  function toMercator(geojson) {
		    return applyConverter(geojson, positionToMercator);
		  }

		  /*
		  Convert a GeoJSON object to Geographic coordinates (WSG84, 4326)
		  */
		  function toGeographic(geojson) {
		    return applyConverter(geojson, positionToGeographic);
		  }


		  /*
		  Internal: -1,0,1 comparison function
		  */
		  function cmp(a, b) {
		    if(a < b) {
		      return -1;
		    } else if(a > b) {
		      return 1;
		    } else {
		      return 0;
		    }
		  }

		  /*
		  Internal: used for sorting
		  */
		  function compSort(p1, p2) {
		    if (p1[0] > p2[0]) {
		      return -1;
		    } else if (p1[0] < p2[0]) {
		      return 1;
		    } else if (p1[1] > p2[1]) {
		      return -1;
		    } else if (p1[1] < p2[1]) {
		      return 1;
		    } else {
		      return 0;
		    }
		  }


		  /*
		  Internal: used to determine turn
		  */
		  function turn(p, q, r) {
		    // Returns -1, 0, 1 if p,q,r forms a right, straight, or left turn.
		    return cmp((q[0] - p[0]) * (r[1] - p[1]) - (r[0] - p[0]) * (q[1] - p[1]), 0);
		  }

		  /*
		  Internal: used to determine euclidean distance between two points
		  */
		  function euclideanDistance(p, q) {
		    // Returns the squared Euclidean distance between p and q.
		    var dx = q[0] - p[0];
		    var dy = q[1] - p[1];

		    return dx * dx + dy * dy;
		  }

		  function nextHullPoint(points, p) {
		    // Returns the next point on the convex hull in CCW from p.
		    var q = p;
		    for(var r in points) {
		      var t = turn(p, q, points[r]);
		      if(t === -1 || t === 0 && euclideanDistance(p, points[r]) > euclideanDistance(p, q)) {
		        q = points[r];
		      }
		    }
		    return q;
		  }

		  function convexHull(points) {
		    // implementation of the Jarvis March algorithm
		    // adapted from http://tixxit.wordpress.com/2009/12/09/jarvis-march/

		    if(points.length === 0) {
		      return [];
		    } else if(points.length === 1) {
		      return points;
		    }

		    // Returns the points on the convex hull of points in CCW order.
		    var hull = [points.sort(compSort)[0]];

		    for(var p = 0; p < hull.length; p++) {
		      var q = nextHullPoint(points, hull[p]);

		      if(q !== hull[0]) {
		        hull.push(q);
		      }
		    }

		    return hull;
		  }

		  function isConvex(points) {
		    var ltz;

		    for (var i = 0; i < points.length - 3; i++) {
		      var p1 = points[i];
		      var p2 = points[i + 1];
		      var p3 = points[i + 2];
		      var v = [p2[0] - p1[0], p2[1] - p1[1]];

		      // p3.x * v.y - p3.y * v.x + v.x * p1.y - v.y * p1.x
		      var res = p3[0] * v[1] - p3[1] * v[0] + v[0] * p1[1] - v[1] * p1[0];

		      if (i === 0) {
		        if (res < 0) {
		          ltz = true;
		        } else {
		          ltz = false;
		        }
		      } else {
		        if (ltz && (res > 0) || !ltz && (res < 0)) {
		          return false;
		        }
		      }
		    }

		    return true;
		  }

		  function coordinatesContainPoint(coordinates, point) {
		    var contains = false;
		    for(var i = -1, l = coordinates.length, j = l - 1; ++i < l; j = i) {
		      if (((coordinates[i][1] <= point[1] && point[1] < coordinates[j][1]) ||
		           (coordinates[j][1] <= point[1] && point[1] < coordinates[i][1])) &&
		          (point[0] < (coordinates[j][0] - coordinates[i][0]) * (point[1] - coordinates[i][1]) / (coordinates[j][1] - coordinates[i][1]) + coordinates[i][0])) {
		        contains = !contains;
		      }
		    }
		    return contains;
		  }

		  function polygonContainsPoint(polygon, point) {
		    if (polygon && polygon.length) {
		      if (polygon.length === 1) { // polygon with no holes
		        return coordinatesContainPoint(polygon[0], point);
		      } else { // polygon with holes
		        if (coordinatesContainPoint(polygon[0], point)) {
		          for (var i = 1; i < polygon.length; i++) {
		            if (coordinatesContainPoint(polygon[i], point)) {
		              return false; // found in hole
		            }
		          }

		          return true;
		        } else {
		          return false;
		        }
		      }
		    } else {
		      return false;
		    }
		  }

		  function edgeIntersectsEdge(a1, a2, b1, b2) {
		    var ua_t = (b2[0] - b1[0]) * (a1[1] - b1[1]) - (b2[1] - b1[1]) * (a1[0] - b1[0]);
		    var ub_t = (a2[0] - a1[0]) * (a1[1] - b1[1]) - (a2[1] - a1[1]) * (a1[0] - b1[0]);
		    var u_b  = (b2[1] - b1[1]) * (a2[0] - a1[0]) - (b2[0] - b1[0]) * (a2[1] - a1[1]);

		    if ( u_b !== 0 ) {
		      var ua = ua_t / u_b;
		      var ub = ub_t / u_b;

		      if ( 0 <= ua && ua <= 1 && 0 <= ub && ub <= 1 ) {
		        return true;
		      }
		    }

		    return false;
		  }

		  function isNumber(n) {
		    return !isNaN(parseFloat(n)) && isFinite(n);
		  }

		  function arraysIntersectArrays(a, b) {
		    if (isNumber(a[0][0])) {
		      if (isNumber(b[0][0])) {
		        for (var i = 0; i < a.length - 1; i++) {
		          for (var j = 0; j < b.length - 1; j++) {
		            if (edgeIntersectsEdge(a[i], a[i + 1], b[j], b[j + 1])) {
		              return true;
		            }
		          }
		        }
		      } else {
		        for (var k = 0; k < b.length; k++) {
		          if (arraysIntersectArrays(a, b[k])) {
		            return true;
		          }
		        }
		      }
		    } else {
		      for (var l = 0; l < a.length; l++) {
		        if (arraysIntersectArrays(a[l], b)) {
		          return true;
		        }
		      }
		    }
		    return false;
		  }

		  /*
		  Internal: Returns a copy of coordinates for s closed polygon
		  */
		  function closedPolygon(coordinates) {
		    var outer = [ ];

		    for (var i = 0; i < coordinates.length; i++) {
		      var inner = coordinates[i].slice();
		      if (pointsEqual(inner[0], inner[inner.length - 1]) === false) {
		        inner.push(inner[0]);
		      }

		      outer.push(inner);
		    }

		    return outer;
		  }

		  function pointsEqual(a, b) {
		    for (var i = 0; i < a.length; i++) {

		      if (a[i] !== b[i]) {
		        return false;
		      }
		    }

		    return true;
		  }

		  function coordinatesEqual(a, b) {
		    if (a.length !== b.length) {
		      return false;
		    }

		    var na = a.slice().sort(compSort);
		    var nb = b.slice().sort(compSort);

		    for (var i = 0; i < na.length; i++) {
		      if (na[i].length !== nb[i].length) {
		        return false;
		      }
		      for (var j = 0; j < na.length; j++) {
		        if (na[i][j] !== nb[i][j]) {
		          return false;
		        }
		      }
		    }

		    return true;
		  }

		  /*
		  Internal: An array of variables that will be excluded form JSON objects.
		  */
		  var excludeFromJSON = ["length"];

		  /*
		  Internal: Base GeoJSON Primitive
		  */
		  function Primitive(geojson){
		    if(geojson){
		      switch (geojson.type) {
		      case 'Point':
		        return new Point(geojson);

		      case 'MultiPoint':
		        return new MultiPoint(geojson);

		      case 'LineString':
		        return new LineString(geojson);

		      case 'MultiLineString':
		        return new MultiLineString(geojson);

		      case 'Polygon':
		        return new Polygon(geojson);

		      case 'MultiPolygon':
		        return new MultiPolygon(geojson);

		      case 'Feature':
		        return new Feature(geojson);

		      case 'FeatureCollection':
		        return new FeatureCollection(geojson);

		      case 'GeometryCollection':
		        return new GeometryCollection(geojson);

		      default:
		        throw new Error("Unknown type: " + geojson.type);
		      }
		    }
		  }

		  Primitive.prototype.toMercator = function(){
		    return toMercator(this);
		  };

		  Primitive.prototype.toGeographic = function(){
		    return toGeographic(this);
		  };

		  Primitive.prototype.envelope = function(){
		    return calculateEnvelope(this);
		  };

		  Primitive.prototype.bbox = function(){
		    return calculateBounds(this);
		  };

		  Primitive.prototype.convexHull = function(){
		    var coordinates = [ ], i, j;
		    if (this.type === 'Point') {
		      return null;
		    } else if (this.type === 'LineString' || this.type === 'MultiPoint') {
		      if (this.coordinates && this.coordinates.length >= 3) {
		        coordinates = this.coordinates;
		      } else {
		        return null;
		      }
		    } else if (this.type === 'Polygon' || this.type === 'MultiLineString') {
		      if (this.coordinates && this.coordinates.length > 0) {
		        for (i = 0; i < this.coordinates.length; i++) {
		          coordinates = coordinates.concat(this.coordinates[i]);
		        }
		        if(coordinates.length < 3){
		          return null;
		        }
		      } else {
		        return null;
		      }
		    } else if (this.type === 'MultiPolygon') {
		      if (this.coordinates && this.coordinates.length > 0) {
		        for (i = 0; i < this.coordinates.length; i++) {
		          for (j = 0; j < this.coordinates[i].length; j++) {
		            coordinates = coordinates.concat(this.coordinates[i][j]);
		          }
		        }
		        if(coordinates.length < 3){
		          return null;
		        }
		      } else {
		        return null;
		      }
		    } else if(this.type === "Feature"){
		      var primitive = new Primitive(this.geometry);
		      return primitive.convexHull();
		    }

		    return new Polygon({
		      type: 'Polygon',
		      coordinates: closedPolygon([convexHull(coordinates)])
		    });
		  };

		  Primitive.prototype.toJSON = function(){
		    var obj = {};
		    for (var key in this) {
		      if (this.hasOwnProperty(key) && excludeFromJSON.indexOf(key) === -1) {
		        obj[key] = this[key];
		      }
		    }
		    obj.bbox = calculateBounds(this);
		    return obj;
		  };

		  Primitive.prototype.contains = function(primitive){
		    return new Primitive(primitive).within(this);
		  };

		  Primitive.prototype.within = function(primitive) {
		    var coordinates, i, j, contains;

		    // if we are passed a feature, use the polygon inside instead
		    if (primitive.type === 'Feature') {
		      primitive = primitive.geometry;
		    }

		    // point.within(point) :: equality
		    if (primitive.type === "Point") {
		      if (this.type === "Point") {
		        return pointsEqual(this.coordinates, primitive.coordinates);

		      }
		    }

		    // point.within(multilinestring)
		    if (primitive.type === "MultiLineString") {
		      if (this.type === "Point") {
		        for (i = 0; i < primitive.coordinates.length; i++) {
		          var linestring = { type: "LineString", coordinates: primitive.coordinates[i] };

		          if (this.within(linestring)) {
		            return true;
		          }
		        }
		      }
		    }

		    // point.within(linestring), point.within(multipoint)
		    if (primitive.type === "LineString" || primitive.type === "MultiPoint") {
		      if (this.type === "Point") {
		        for (i = 0; i < primitive.coordinates.length; i++) {
		          if (this.coordinates.length !== primitive.coordinates[i].length) {
		            return false;
		          }

		          if (pointsEqual(this.coordinates, primitive.coordinates[i])) {
		            return true;
		          }
		        }
		      }
		    }

		    if (primitive.type === "Polygon") {
		      // polygon.within(polygon)
		      if (this.type === "Polygon") {
		        // check for equal polygons
		        if (primitive.coordinates.length === this.coordinates.length) {
		          for (i = 0; i < this.coordinates.length; i++) {
		            if (coordinatesEqual(this.coordinates[i], primitive.coordinates[i])) {
		              return true;
		            }
		          }
		        }

		        if (this.coordinates.length && polygonContainsPoint(primitive.coordinates, this.coordinates[0][0])) {
		          return !arraysIntersectArrays(closedPolygon(this.coordinates), closedPolygon(primitive.coordinates));
		        } else {
		          return false;
		        }

		      // point.within(polygon)
		      } else if (this.type === "Point") {
		        return polygonContainsPoint(primitive.coordinates, this.coordinates);

		      // linestring/multipoint withing polygon
		      } else if (this.type === "LineString" || this.type === "MultiPoint") {
		        if (!this.coordinates || this.coordinates.length === 0) {
		          return false;
		        }

		        for (i = 0; i < this.coordinates.length; i++) {
		          if (polygonContainsPoint(primitive.coordinates, this.coordinates[i]) === false) {
		            return false;
		          }
		        }

		        return true;

		      // multilinestring.within(polygon)
		      } else if (this.type === "MultiLineString") {
		        for (i = 0; i < this.coordinates.length; i++) {
		          var ls = new LineString(this.coordinates[i]);

		          if (ls.within(primitive) === false) {
		            contains++;
		            return false;
		          }
		        }

		        return true;

		      // multipolygon.within(polygon)
		      } else if (this.type === "MultiPolygon") {
		        for (i = 0; i < this.coordinates.length; i++) {
		          var p1 = new Primitive({ type: "Polygon", coordinates: this.coordinates[i] });

		          if (p1.within(primitive) === false) {
		            return false;
		          }
		        }

		        return true;
		      }

		    }

		    if (primitive.type === "MultiPolygon") {
		      // point.within(multipolygon)
		      if (this.type === "Point") {
		        if (primitive.coordinates.length) {
		          for (i = 0; i < primitive.coordinates.length; i++) {
		            coordinates = primitive.coordinates[i];
		            if (polygonContainsPoint(coordinates, this.coordinates) && arraysIntersectArrays([this.coordinates], primitive.coordinates) === false) {
		              return true;
		            }
		          }
		        }

		        return false;
		      // polygon.within(multipolygon)
		      } else if (this.type === "Polygon") {
		        for (i = 0; i < this.coordinates.length; i++) {
		          if (primitive.coordinates[i].length === this.coordinates.length) {
		            for (j = 0; j < this.coordinates.length; j++) {
		              if (coordinatesEqual(this.coordinates[j], primitive.coordinates[i][j])) {
		                return true;
		              }
		            }
		          }
		        }

		        if (arraysIntersectArrays(this.coordinates, primitive.coordinates) === false) {
		          if (primitive.coordinates.length) {
		            for (i = 0; i < primitive.coordinates.length; i++) {
		              coordinates = primitive.coordinates[i];
		              if (polygonContainsPoint(coordinates, this.coordinates[0][0]) === false) {
		                contains = false;
		              } else {
		                contains = true;
		              }
		            }

		            return contains;
		          }
		        }

		      // linestring.within(multipolygon), multipoint.within(multipolygon)
		      } else if (this.type === "LineString" || this.type === "MultiPoint") {
		        for (i = 0; i < primitive.coordinates.length; i++) {
		          var p = { type: "Polygon", coordinates: primitive.coordinates[i] };

		          if (this.within(p)) {
		            return true;
		          }

		          return false;
		        }

		      // multilinestring.within(multipolygon)
		      } else if (this.type === "MultiLineString") {
		        for (i = 0; i < this.coordinates.length; i++) {
		          var lines = new LineString(this.coordinates[i]);

		          if (lines.within(primitive) === false) {
		            return false;
		          }
		        }

		        return true;

		      // multipolygon.within(multipolygon)
		      } else if (this.type === "MultiPolygon") {
		        for (i = 0; i < primitive.coordinates.length; i++) {
		          var mpoly = { type: "Polygon", coordinates: primitive.coordinates[i] };

		          if (this.within(mpoly) === false) {
		            return false;
		          }
		        }

		        return true;
		      }
		    }

		    // default to false
		    return false;
		  };

		  Primitive.prototype.intersects = function(primitive) {
		    // if we are passed a feature, use the polygon inside instead
		    if (primitive.type === 'Feature') {
		      primitive = primitive.geometry;
		    }

		    var p = new Primitive(primitive);
		    if (this.within(primitive) || p.within(this)) {
		      return true;
		    }


		    if (this.type !== 'Point' && this.type !== 'MultiPoint' &&
		        primitive.type !== 'Point' && primitive.type !== 'MultiPoint') {
		      return arraysIntersectArrays(this.coordinates, primitive.coordinates);
		    } else if (this.type === 'Feature') {
		      // in the case of a Feature, use the internal primitive for intersection
		      var inner = new Primitive(this.geometry);
		      return inner.intersects(primitive);
		    }

		    warn("Type " + this.type + " to " + primitive.type + " intersection is not supported by intersects");
		    return false;
		  };


		  /*
		  GeoJSON Point Class
		    new Point();
		    new Point(x,y,z,wtf);
		    new Point([x,y,z,wtf]);
		    new Point([x,y]);
		    new Point({
		      type: "Point",
		      coordinates: [x,y]
		    });
		  */
		  function Point(input){
		    var args = Array.prototype.slice.call(arguments);

		    if(input && input.type === "Point" && input.coordinates){
		      extend(this, input);
		    } else if(input && isArray(input)) {
		      this.coordinates = input;
		    } else if(args.length >= 2) {
		      this.coordinates = args;
		    } else {
		      throw "Terraformer: invalid input for Terraformer.Point";
		    }

		    this.type = "Point";
		  }

		  Point.prototype = new Primitive();
		  Point.prototype.constructor = Point;

		  /*
		  GeoJSON MultiPoint Class
		      new MultiPoint();
		      new MultiPoint([[x,y], [x1,y1]]);
		      new MultiPoint({
		        type: "MultiPoint",
		        coordinates: [x,y]
		      });
		  */
		  function MultiPoint(input){
		    if(input && input.type === "MultiPoint" && input.coordinates){
		      extend(this, input);
		    } else if(isArray(input)) {
		      this.coordinates = input;
		    } else {
		      throw "Terraformer: invalid input for Terraformer.MultiPoint";
		    }

		    this.type = "MultiPoint";
		  }

		  MultiPoint.prototype = new Primitive();
		  MultiPoint.prototype.constructor = MultiPoint;
		  MultiPoint.prototype.forEach = function(func){
		    for (var i = 0; i < this.coordinates.length; i++) {
		      func.apply(this, [this.coordinates[i], i, this.coordinates]);
		    }
		    return this;
		  };
		  MultiPoint.prototype.addPoint = function(point){
		    this.coordinates.push(point);
		    return this;
		  };
		  MultiPoint.prototype.insertPoint = function(point, index){
		    this.coordinates.splice(index, 0, point);
		    return this;
		  };
		  MultiPoint.prototype.removePoint = function(remove){
		    if(typeof remove === "number"){
		      this.coordinates.splice(remove, 1);
		    } else {
		      this.coordinates.splice(this.coordinates.indexOf(remove), 1);
		    }
		    return this;
		  };
		  MultiPoint.prototype.get = function(i){
		    return new Point(this.coordinates[i]);
		  };

		  /*
		  GeoJSON LineString Class
		      new LineString();
		      new LineString([[x,y], [x1,y1]]);
		      new LineString({
		        type: "LineString",
		        coordinates: [x,y]
		      });
		  */
		  function LineString(input){
		    if(input && input.type === "LineString" && input.coordinates){
		      extend(this, input);
		    } else if(isArray(input)) {
		      this.coordinates = input;
		    } else {
		      throw "Terraformer: invalid input for Terraformer.LineString";
		    }

		    this.type = "LineString";
		  }

		  LineString.prototype = new Primitive();
		  LineString.prototype.constructor = LineString;
		  LineString.prototype.addVertex = function(point){
		    this.coordinates.push(point);
		    return this;
		  };
		  LineString.prototype.insertVertex = function(point, index){
		    this.coordinates.splice(index, 0, point);
		    return this;
		  };
		  LineString.prototype.removeVertex = function(remove){
		    this.coordinates.splice(remove, 1);
		    return this;
		  };

		  /*
		  GeoJSON MultiLineString Class
		      new MultiLineString();
		      new MultiLineString([ [[x,y], [x1,y1]], [[x2,y2], [x3,y3]] ]);
		      new MultiLineString({
		        type: "MultiLineString",
		        coordinates: [ [[x,y], [x1,y1]], [[x2,y2], [x3,y3]] ]
		      });
		  */
		  function MultiLineString(input){
		    if(input && input.type === "MultiLineString" && input.coordinates){
		      extend(this, input);
		    } else if(isArray(input)) {
		      this.coordinates = input;
		    } else {
		      throw "Terraformer: invalid input for Terraformer.MultiLineString";
		    }

		    this.type = "MultiLineString";
		  }

		  MultiLineString.prototype = new Primitive();
		  MultiLineString.prototype.constructor = MultiLineString;
		  MultiLineString.prototype.forEach = function(func){
		    for (var i = 0; i < this.coordinates.length; i++) {
		      func.apply(this, [this.coordinates[i], i, this.coordinates ]);
		    }
		  };
		  MultiLineString.prototype.get = function(i){
		    return new LineString(this.coordinates[i]);
		  };

		  /*
		  GeoJSON Polygon Class
		      new Polygon();
		      new Polygon([ [[x,y], [x1,y1], [x2,y2]] ]);
		      new Polygon({
		        type: "Polygon",
		        coordinates: [ [[x,y], [x1,y1], [x2,y2]] ]
		      });
		  */
		  function Polygon(input){
		    if(input && input.type === "Polygon" && input.coordinates){
		      extend(this, input);
		    } else if(isArray(input)) {
		      this.coordinates = input;
		    } else {
		      throw "Terraformer: invalid input for Terraformer.Polygon";
		    }

		    this.type = "Polygon";
		  }

		  Polygon.prototype = new Primitive();
		  Polygon.prototype.constructor = Polygon;
		  Polygon.prototype.addVertex = function(point){
		    this.insertVertex(point, this.coordinates[0].length - 1);
		    return this;
		  };
		  Polygon.prototype.insertVertex = function(point, index){
		    this.coordinates[0].splice(index, 0, point);
		    return this;
		  };
		  Polygon.prototype.removeVertex = function(remove){
		    this.coordinates[0].splice(remove, 1);
		    return this;
		  };
		  Polygon.prototype.close = function() {
		    this.coordinates = closedPolygon(this.coordinates);
		  };
		  Polygon.prototype.hasHoles = function() {
		    return this.coordinates.length > 1;
		  };
		  Polygon.prototype.holes = function() {
		    var holes = [];
		    if (this.hasHoles()) {
		      for (var i = 1; i < this.coordinates.length; i++) {
		        holes.push(new Polygon([this.coordinates[i]]));
		      }
		    }
		    return holes;
		  };

		  /*
		  GeoJSON MultiPolygon Class
		      new MultiPolygon();
		      new MultiPolygon([ [ [[x,y], [x1,y1]], [[x2,y2], [x3,y3]] ] ]);
		      new MultiPolygon({
		        type: "MultiPolygon",
		        coordinates: [ [ [[x,y], [x1,y1]], [[x2,y2], [x3,y3]] ] ]
		      });
		  */
		  function MultiPolygon(input){
		    if(input && input.type === "MultiPolygon" && input.coordinates){
		      extend(this, input);
		    } else if(isArray(input)) {
		      this.coordinates = input;
		    } else {
		      throw "Terraformer: invalid input for Terraformer.MultiPolygon";
		    }

		    this.type = "MultiPolygon";
		  }

		  MultiPolygon.prototype = new Primitive();
		  MultiPolygon.prototype.constructor = MultiPolygon;
		  MultiPolygon.prototype.forEach = function(func){
		    for (var i = 0; i < this.coordinates.length; i++) {
		      func.apply(this, [this.coordinates[i], i, this.coordinates ]);
		    }
		  };
		  MultiPolygon.prototype.get = function(i){
		    return new Polygon(this.coordinates[i]);
		  };
		  MultiPolygon.prototype.close = function(){
		    var outer = [];
		    this.forEach(function(polygon){
		      outer.push(closedPolygon(polygon));
		    });
		    this.coordinates = outer;
		    return this;
		  };

		  /*
		  GeoJSON Feature Class
		      new Feature();
		      new Feature({
		        type: "Feature",
		        geometry: {
		          type: "Polygon",
		          coordinates: [ [ [[x,y], [x1,y1]], [[x2,y2], [x3,y3]] ] ]
		        }
		      });
		      new Feature({
		        type: "Polygon",
		        coordinates: [ [ [[x,y], [x1,y1]], [[x2,y2], [x3,y3]] ] ]
		      });
		  */
		  function Feature(input){
		    if(input && input.type === "Feature"){
		      extend(this, input);
		    } else if(input && input.type && input.coordinates) {
		      this.geometry = input;
		    } else {
		      throw "Terraformer: invalid input for Terraformer.Feature";
		    }

		    this.type = "Feature";
		  }

		  Feature.prototype = new Primitive();
		  Feature.prototype.constructor = Feature;

		  /*
		  GeoJSON FeatureCollection Class
		      new FeatureCollection();
		      new FeatureCollection([feature, feature1]);
		      new FeatureCollection({
		        type: "FeatureCollection",
		        coordinates: [feature, feature1]
		      });
		  */
		  function FeatureCollection(input){
		    if(input && input.type === "FeatureCollection" && input.features){
		      extend(this, input);
		    } else if(isArray(input)) {
		      this.features = input;
		    } else {
		      throw "Terraformer: invalid input for Terraformer.FeatureCollection";
		    }

		    this.type = "FeatureCollection";
		  }

		  FeatureCollection.prototype = new Primitive();
		  FeatureCollection.prototype.constructor = FeatureCollection;
		  FeatureCollection.prototype.forEach = function(func){
		    for (var i = 0; i < this.features.length; i++) {
		      func.apply(this, [this.features[i], i, this.features]);
		    }
		  };
		  FeatureCollection.prototype.get = function(id){
		    var found;
		    this.forEach(function(feature){
		      if(feature.id === id){
		        found = feature;
		      }
		    });
		    return new Feature(found);
		  };

		  /*
		  GeoJSON GeometryCollection Class
		      new GeometryCollection();
		      new GeometryCollection([geometry, geometry1]);
		      new GeometryCollection({
		        type: "GeometryCollection",
		        coordinates: [geometry, geometry1]
		      });
		  */
		  function GeometryCollection(input){
		    if(input && input.type === "GeometryCollection" && input.geometries){
		      extend(this, input);
		    } else if(isArray(input)) {
		      this.geometries = input;
		    } else if(input.coordinates && input.type){
		      this.type = "GeometryCollection";
		      this.geometries = [input];
		    } else {
		      throw "Terraformer: invalid input for Terraformer.GeometryCollection";
		    }

		    this.type = "GeometryCollection";
		  }

		  GeometryCollection.prototype = new Primitive();
		  GeometryCollection.prototype.constructor = GeometryCollection;
		  GeometryCollection.prototype.forEach = function(func){
		    for (var i = 0; i < this.geometries.length; i++) {
		      func.apply(this, [this.geometries[i], i, this.geometries]);
		    }
		  };
		  GeometryCollection.prototype.get = function(i){
		    return new Primitive(this.geometries[i]);
		  };

		  function createCircle(center, radius, interpolate){
		    var mercatorPosition = positionToMercator(center);
		    var steps = interpolate || 64;
		    var polygon = {
		      type: "Polygon",
		      coordinates: [[]]
		    };
		    for(var i=1; i<=steps; i++) {
		      var radians = i * (360/steps) * Math.PI / 180;
		      polygon.coordinates[0].push([mercatorPosition[0] + radius * Math.cos(radians), mercatorPosition[1] + radius * Math.sin(radians)]);
		    }
		    polygon.coordinates = closedPolygon(polygon.coordinates);

		    return toGeographic(polygon);
		  }

		  function Circle (center, radius, interpolate) {
		    var steps = interpolate || 64;
		    var rad = radius || 250;

		    if(!center || center.length < 2 || !rad || !steps) {
		      throw new Error("Terraformer: missing parameter for Terraformer.Circle");
		    }

		    extend(this, new Feature({
		      type: "Feature",
		      geometry: createCircle(center, rad, steps),
		      properties: {
		        radius: rad,
		        center: center,
		        steps: steps
		      }
		    }));
		  }

		  Circle.prototype = new Primitive();
		  Circle.prototype.constructor = Circle;
		  Circle.prototype.recalculate = function(){
		    this.geometry = createCircle(this.properties.center, this.properties.radius, this.properties.steps);
		    return this;
		  };
		  Circle.prototype.center = function(coordinates){
		    if(coordinates){
		      this.properties.center = coordinates;
		      this.recalculate();
		    }
		    return this.properties.center;
		  };
		  Circle.prototype.radius = function(radius){
		    if(radius){
		      this.properties.radius = radius;
		      this.recalculate();
		    }
		    return this.properties.radius;
		  };
		  Circle.prototype.steps = function(steps){
		    if(steps){
		      this.properties.steps = steps;
		      this.recalculate();
		    }
		    return this.properties.steps;
		  };

		  Circle.prototype.toJSON = function() {
		    var output = Primitive.prototype.toJSON.call(this);
		    return output;
		  };

		  exports.Primitive = Primitive;
		  exports.Point = Point;
		  exports.MultiPoint = MultiPoint;
		  exports.LineString = LineString;
		  exports.MultiLineString = MultiLineString;
		  exports.Polygon = Polygon;
		  exports.MultiPolygon = MultiPolygon;
		  exports.Feature = Feature;
		  exports.FeatureCollection = FeatureCollection;
		  exports.GeometryCollection = GeometryCollection;
		  exports.Circle = Circle;

		  exports.toMercator = toMercator;
		  exports.toGeographic = toGeographic;

		  exports.Tools = {};
		  exports.Tools.positionToMercator = positionToMercator;
		  exports.Tools.positionToGeographic = positionToGeographic;
		  exports.Tools.applyConverter = applyConverter;
		  exports.Tools.toMercator = toMercator;
		  exports.Tools.toGeographic = toGeographic;
		  exports.Tools.createCircle = createCircle;

		  exports.Tools.calculateBounds = calculateBounds;
		  exports.Tools.calculateEnvelope = calculateEnvelope;

		  exports.Tools.coordinatesContainPoint = coordinatesContainPoint;
		  exports.Tools.polygonContainsPoint = polygonContainsPoint;
		  exports.Tools.arraysIntersectArrays = arraysIntersectArrays;
		  exports.Tools.coordinatesContainPoint = coordinatesContainPoint;
		  exports.Tools.coordinatesEqual = coordinatesEqual;
		  exports.Tools.convexHull = convexHull;
		  exports.Tools.isConvex = isConvex;

		  exports.MercatorCRS = MercatorCRS;
		  exports.GeographicCRS = GeographicCRS;

		  return exports;
		}));
} (terraformer));
	return terraformer.exports;
}

(function (module, exports) {
	(function (root, factory) {

	  // Node.
	  {
	    module.exports = factory(requireTerraformer());
	  }

	}(commonjsGlobal, function(Terraformer) {
	  var exports = { };

	  /* Jison generated parser */
	var parser = (function(){
	var parser = {trace: function trace () { },
	yy: {},
	symbols_: {"error":2,"expressions":3,"point":4,"EOF":5,"linestring":6,"polygon":7,"multipoint":8,"multilinestring":9,"multipolygon":10,"coordinate":11,"DOUBLE_TOK":12,"ptarray":13,"COMMA":14,"ring_list":15,"ring":16,"(":17,")":18,"POINT":19,"Z":20,"ZM":21,"M":22,"EMPTY":23,"point_untagged":24,"polygon_list":25,"polygon_untagged":26,"point_list":27,"LINESTRING":28,"POLYGON":29,"MULTIPOINT":30,"MULTILINESTRING":31,"MULTIPOLYGON":32,"$accept":0,"$end":1},
	terminals_: {2:"error",5:"EOF",12:"DOUBLE_TOK",14:"COMMA",17:"(",18:")",19:"POINT",20:"Z",21:"ZM",22:"M",23:"EMPTY",28:"LINESTRING",29:"POLYGON",30:"MULTIPOINT",31:"MULTILINESTRING",32:"MULTIPOLYGON"},
	productions_: [0,[3,2],[3,2],[3,2],[3,2],[3,2],[3,2],[11,2],[11,3],[11,4],[13,3],[13,1],[15,3],[15,1],[16,3],[4,4],[4,5],[4,5],[4,5],[4,2],[24,1],[24,3],[25,3],[25,1],[26,3],[27,3],[27,1],[6,4],[6,5],[6,5],[6,5],[6,2],[7,4],[7,5],[7,5],[7,5],[7,2],[8,4],[8,5],[8,5],[8,5],[8,2],[9,4],[9,5],[9,5],[9,5],[9,2],[10,4],[10,5],[10,5],[10,5],[10,2]],
	performAction: function anonymous(yytext,yyleng,yylineno,yy,yystate,$,_$
	) {

	var $0 = $.length - 1;
	switch (yystate) {
	case 1: return $[$0-1]; 
	case 2: return $[$0-1]; 
	case 3: return $[$0-1]; 
	case 4: return $[$0-1]; 
	case 5: return $[$0-1]; 
	case 6: return $[$0-1]; 
	case 7: this.$ = new PointArray([ Number($[$0-1]), Number($[$0]) ]); 
	break;
	case 8: this.$ = new PointArray([ Number($[$0-2]), Number($[$0-1]), Number($[$0]) ]); 
	break;
	case 9: this.$ = new PointArray([ Number($[$0-3]), Number($[$0-2]), Number($[$0-1]), Number($[$0]) ]); 
	break;
	case 10: this.$ = $[$0-2].addPoint($[$0]); 
	break;
	case 11: this.$ = $[$0]; 
	break;
	case 12: this.$ = $[$0-2].addRing($[$0]); 
	break;
	case 13: this.$ = new RingList($[$0]); 
	break;
	case 14: this.$ = new Ring($[$0-1]); 
	break;
	case 15: this.$ = { "type": "Point", "coordinates": $[$0-1].data[0] }; 
	break;
	case 16: this.$ = { "type": "Point", "coordinates": $[$0-1].data[0], "properties": { z: true } }; 
	break;
	case 17: this.$ = { "type": "Point", "coordinates": $[$0-1].data[0], "properties": { z: true, m: true } }; 
	break;
	case 18: this.$ = { "type": "Point", "coordinates": $[$0-1].data[0], "properties": { m: true } }; 
	break;
	case 19: this.$ = { "type": "Point", "coordinates": [ ] }; 
	break;
	case 20: this.$ = $[$0]; 
	break;
	case 21: this.$ = $[$0-1]; 
	break;
	case 22: this.$ = $[$0-2].addPolygon($[$0]); 
	break;
	case 23: this.$ = new PolygonList($[$0]); 
	break;
	case 24: this.$ = $[$0-1]; 
	break;
	case 25: this.$ = $[$0-2].addPoint($[$0]); 
	break;
	case 26: this.$ = $[$0]; 
	break;
	case 27: this.$ = { "type": "LineString", "coordinates": $[$0-1].data }; 
	break;
	case 28: this.$ = { "type": "LineString", "coordinates": $[$0-1].data, "properties": { z: true } }; 
	break;
	case 29: this.$ = { "type": "LineString", "coordinates": $[$0-1].data, "properties": { m: true } }; 
	break;
	case 30: this.$ = { "type": "LineString", "coordinates": $[$0-1].data, "properties": { z: true, m: true } }; 
	break;
	case 31: this.$ = { "type": "LineString", "coordinates": [ ] }; 
	break;
	case 32: this.$ = { "type": "Polygon", "coordinates": $[$0-1].toJSON() }; 
	break;
	case 33: this.$ = { "type": "Polygon", "coordinates": $[$0-1].toJSON(), "properties": { z: true } }; 
	break;
	case 34: this.$ = { "type": "Polygon", "coordinates": $[$0-1].toJSON(), "properties": { m: true } }; 
	break;
	case 35: this.$ = { "type": "Polygon", "coordinates": $[$0-1].toJSON(), "properties": { z: true, m: true } }; 
	break;
	case 36: this.$ = { "type": "Polygon", "coordinates": [ ] }; 
	break;
	case 37: this.$ = { "type": "MultiPoint", "coordinates": $[$0-1].data }; 
	break;
	case 38: this.$ = { "type": "MultiPoint", "coordinates": $[$0-1].data, "properties": { z: true } }; 
	break;
	case 39: this.$ = { "type": "MultiPoint", "coordinates": $[$0-1].data, "properties": { m: true } }; 
	break;
	case 40: this.$ = { "type": "MultiPoint", "coordinates": $[$0-1].data, "properties": { z: true, m: true } }; 
	break;
	case 41: this.$ = { "type": "MultiPoint", "coordinates": [ ] }; 
	break;
	case 42: this.$ = { "type": "MultiLineString", "coordinates": $[$0-1].toJSON() }; 
	break;
	case 43: this.$ = { "type": "MultiLineString", "coordinates": $[$0-1].toJSON(), "properties": { z: true } }; 
	break;
	case 44: this.$ = { "type": "MultiLineString", "coordinates": $[$0-1].toJSON(), "properties": { m: true } }; 
	break;
	case 45: this.$ = { "type": "MultiLineString", "coordinates": $[$0-1].toJSON(), "properties": { z: true, m: true } }; 
	break;
	case 46: this.$ = { "type": "MultiLineString", "coordinates": [ ] }; 
	break;
	case 47: this.$ = { "type": "MultiPolygon", "coordinates": $[$0-1].toJSON() }; 
	break;
	case 48: this.$ = { "type": "MultiPolygon", "coordinates": $[$0-1].toJSON(), "properties": { z: true } }; 
	break;
	case 49: this.$ = { "type": "MultiPolygon", "coordinates": $[$0-1].toJSON(), "properties": { m: true } }; 
	break;
	case 50: this.$ = { "type": "MultiPolygon", "coordinates": $[$0-1].toJSON(), "properties": { z: true, m: true } }; 
	break;
	case 51: this.$ = { "type": "MultiPolygon", "coordinates": [ ] }; 
	break;
	}
	},
	table: [{3:1,4:2,6:3,7:4,8:5,9:6,10:7,19:[1,8],28:[1,9],29:[1,10],30:[1,11],31:[1,12],32:[1,13]},{1:[3]},{5:[1,14]},{5:[1,15]},{5:[1,16]},{5:[1,17]},{5:[1,18]},{5:[1,19]},{17:[1,20],20:[1,21],21:[1,22],22:[1,23],23:[1,24]},{17:[1,25],20:[1,26],21:[1,28],22:[1,27],23:[1,29]},{17:[1,30],20:[1,31],21:[1,33],22:[1,32],23:[1,34]},{17:[1,35],20:[1,36],21:[1,38],22:[1,37],23:[1,39]},{17:[1,40],20:[1,41],21:[1,43],22:[1,42],23:[1,44]},{17:[1,45],20:[1,46],21:[1,48],22:[1,47],23:[1,49]},{1:[2,1]},{1:[2,2]},{1:[2,3]},{1:[2,4]},{1:[2,5]},{1:[2,6]},{11:51,12:[1,52],13:50},{17:[1,53]},{17:[1,54]},{17:[1,55]},{5:[2,19]},{11:58,12:[1,52],17:[1,59],24:57,27:56},{17:[1,60]},{17:[1,61]},{17:[1,62]},{5:[2,31]},{15:63,16:64,17:[1,65]},{17:[1,66]},{17:[1,67]},{17:[1,68]},{5:[2,36]},{11:58,12:[1,52],17:[1,59],24:57,27:69},{17:[1,70]},{17:[1,71]},{17:[1,72]},{5:[2,41]},{15:73,16:64,17:[1,65]},{17:[1,74]},{17:[1,75]},{17:[1,76]},{5:[2,46]},{17:[1,79],25:77,26:78},{17:[1,80]},{17:[1,81]},{17:[1,82]},{5:[2,51]},{14:[1,84],18:[1,83]},{14:[2,11],18:[2,11]},{12:[1,85]},{11:51,12:[1,52],13:86},{11:51,12:[1,52],13:87},{11:51,12:[1,52],13:88},{14:[1,90],18:[1,89]},{14:[2,26],18:[2,26]},{14:[2,20],18:[2,20]},{11:91,12:[1,52]},{11:58,12:[1,52],17:[1,59],24:57,27:92},{11:58,12:[1,52],17:[1,59],24:57,27:93},{11:58,12:[1,52],17:[1,59],24:57,27:94},{14:[1,96],18:[1,95]},{14:[2,13],18:[2,13]},{11:51,12:[1,52],13:97},{15:98,16:64,17:[1,65]},{15:99,16:64,17:[1,65]},{15:100,16:64,17:[1,65]},{14:[1,90],18:[1,101]},{11:58,12:[1,52],17:[1,59],24:57,27:102},{11:58,12:[1,52],17:[1,59],24:57,27:103},{11:58,12:[1,52],17:[1,59],24:57,27:104},{14:[1,96],18:[1,105]},{15:106,16:64,17:[1,65]},{15:107,16:64,17:[1,65]},{15:108,16:64,17:[1,65]},{14:[1,110],18:[1,109]},{14:[2,23],18:[2,23]},{15:111,16:64,17:[1,65]},{17:[1,79],25:112,26:78},{17:[1,79],25:113,26:78},{17:[1,79],25:114,26:78},{5:[2,15]},{11:115,12:[1,52]},{12:[1,116],14:[2,7],18:[2,7]},{14:[1,84],18:[1,117]},{14:[1,84],18:[1,118]},{14:[1,84],18:[1,119]},{5:[2,27]},{11:58,12:[1,52],17:[1,59],24:120},{18:[1,121]},{14:[1,90],18:[1,122]},{14:[1,90],18:[1,123]},{14:[1,90],18:[1,124]},{5:[2,32]},{16:125,17:[1,65]},{14:[1,84],18:[1,126]},{14:[1,96],18:[1,127]},{14:[1,96],18:[1,128]},{14:[1,96],18:[1,129]},{5:[2,37]},{14:[1,90],18:[1,130]},{14:[1,90],18:[1,131]},{14:[1,90],18:[1,132]},{5:[2,42]},{14:[1,96],18:[1,133]},{14:[1,96],18:[1,134]},{14:[1,96],18:[1,135]},{5:[2,47]},{17:[1,79],26:136},{14:[1,96],18:[1,137]},{14:[1,110],18:[1,138]},{14:[1,110],18:[1,139]},{14:[1,110],18:[1,140]},{14:[2,10],18:[2,10]},{12:[1,141],14:[2,8],18:[2,8]},{5:[2,16]},{5:[2,17]},{5:[2,18]},{14:[2,25],18:[2,25]},{14:[2,21],18:[2,21]},{5:[2,28]},{5:[2,29]},{5:[2,30]},{14:[2,12],18:[2,12]},{14:[2,14],18:[2,14]},{5:[2,33]},{5:[2,34]},{5:[2,35]},{5:[2,38]},{5:[2,39]},{5:[2,40]},{5:[2,43]},{5:[2,44]},{5:[2,45]},{14:[2,22],18:[2,22]},{14:[2,24],18:[2,24]},{5:[2,48]},{5:[2,49]},{5:[2,50]},{14:[2,9],18:[2,9]}],
	defaultActions: {14:[2,1],15:[2,2],16:[2,3],17:[2,4],18:[2,5],19:[2,6],24:[2,19],29:[2,31],34:[2,36],39:[2,41],44:[2,46],49:[2,51],83:[2,15],89:[2,27],95:[2,32],101:[2,37],105:[2,42],109:[2,47],117:[2,16],118:[2,17],119:[2,18],122:[2,28],123:[2,29],124:[2,30],127:[2,33],128:[2,34],129:[2,35],130:[2,38],131:[2,39],132:[2,40],133:[2,43],134:[2,44],135:[2,45],138:[2,48],139:[2,49],140:[2,50]},
	parseError: function parseError (str, hash) {
	    throw new Error(str);
	},
	parse: function parse(input) {
	    var self = this, stack = [0], vstack = [null], lstack = [], table = this.table, yytext = "", yylineno = 0, yyleng = 0;
	    this.lexer.setInput(input);
	    this.lexer.yy = this.yy;
	    this.yy.lexer = this.lexer;
	    this.yy.parser = this;
	    if (typeof this.lexer.yylloc == "undefined")
	        this.lexer.yylloc = {};
	    var yyloc = this.lexer.yylloc;
	    lstack.push(yyloc);
	    var ranges = this.lexer.options && this.lexer.options.ranges;
	    if (typeof this.yy.parseError === "function")
	        this.parseError = this.yy.parseError;
	    function lex() {
	        var token;
	        token = self.lexer.lex() || 1;
	        if (typeof token !== "number") {
	            token = self.symbols_[token] || token;
	        }
	        return token;
	    }
	    var symbol, state, action, r, yyval = {}, p, len, newState, expected;
	    while (true) {
	        state = stack[stack.length - 1];
	        if (this.defaultActions[state]) {
	            action = this.defaultActions[state];
	        } else {
	            if (symbol === null || typeof symbol == "undefined") {
	                symbol = lex();
	            }
	            action = table[state] && table[state][symbol];
	        }
	        if (typeof action === "undefined" || !action.length || !action[0]) {
	            var errStr = "";
	            {
	                expected = [];
	                for (p in table[state])
	                    if (this.terminals_[p] && p > 2) {
	                        expected.push("'" + this.terminals_[p] + "'");
	                    }
	                if (this.lexer.showPosition) {
	                    errStr = "Parse error on line " + (yylineno + 1) + ":\n" + this.lexer.showPosition() + "\nExpecting " + expected.join(", ") + ", got '" + (this.terminals_[symbol] || symbol) + "'";
	                } else {
	                    errStr = "Parse error on line " + (yylineno + 1) + ": Unexpected " + (symbol == 1?"end of input":"'" + (this.terminals_[symbol] || symbol) + "'");
	                }
	                this.parseError(errStr, {text: this.lexer.match, token: this.terminals_[symbol] || symbol, line: this.lexer.yylineno, loc: yyloc, expected: expected});
	            }
	        }
	        if (action[0] instanceof Array && action.length > 1) {
	            throw new Error("Parse Error: multiple actions possible at state: " + state + ", token: " + symbol);
	        }
	        switch (action[0]) {
	        case 1:
	            stack.push(symbol);
	            vstack.push(this.lexer.yytext);
	            lstack.push(this.lexer.yylloc);
	            stack.push(action[1]);
	            symbol = null;
	            {
	                yyleng = this.lexer.yyleng;
	                yytext = this.lexer.yytext;
	                yylineno = this.lexer.yylineno;
	                yyloc = this.lexer.yylloc;
	            }
	            break;
	        case 2:
	            len = this.productions_[action[1]][1];
	            yyval.$ = vstack[vstack.length - len];
	            yyval._$ = {first_line: lstack[lstack.length - (len || 1)].first_line, last_line: lstack[lstack.length - 1].last_line, first_column: lstack[lstack.length - (len || 1)].first_column, last_column: lstack[lstack.length - 1].last_column};
	            if (ranges) {
	                yyval._$.range = [lstack[lstack.length - (len || 1)].range[0], lstack[lstack.length - 1].range[1]];
	            }
	            r = this.performAction.call(yyval, yytext, yyleng, yylineno, this.yy, action[1], vstack, lstack);
	            if (typeof r !== "undefined") {
	                return r;
	            }
	            if (len) {
	                stack = stack.slice(0, -1 * len * 2);
	                vstack = vstack.slice(0, -1 * len);
	                lstack = lstack.slice(0, -1 * len);
	            }
	            stack.push(this.productions_[action[1]][0]);
	            vstack.push(yyval.$);
	            lstack.push(yyval._$);
	            newState = table[stack[stack.length - 2]][stack[stack.length - 1]];
	            stack.push(newState);
	            break;
	        case 3:
	            return true;
	        }
	    }
	    return true;
	}
	};
	var lexer = (function(){
	var lexer = ({EOF:1,
	parseError:function parseError(str, hash) {
	        if (this.yy.parser) {
	            this.yy.parser.parseError(str, hash);
	        } else {
	            throw new Error(str);
	        }
	    },
	setInput:function (input) {
	        this._input = input;
	        this._more = this._less = this.done = false;
	        this.yylineno = this.yyleng = 0;
	        this.yytext = this.matched = this.match = '';
	        this.conditionStack = ['INITIAL'];
	        this.yylloc = {first_line:1,first_column:0,last_line:1,last_column:0};
	        if (this.options.ranges) this.yylloc.range = [0,0];
	        this.offset = 0;
	        return this;
	    },
	input:function () {
	        var ch = this._input[0];
	        this.yytext += ch;
	        this.yyleng++;
	        this.offset++;
	        this.match += ch;
	        this.matched += ch;
	        var lines = ch.match(/(?:\r\n?|\n).*/g);
	        if (lines) {
	            this.yylineno++;
	            this.yylloc.last_line++;
	        } else {
	            this.yylloc.last_column++;
	        }
	        if (this.options.ranges) this.yylloc.range[1]++;

	        this._input = this._input.slice(1);
	        return ch;
	    },
	unput:function (ch) {
	        var len = ch.length;
	        var lines = ch.split(/(?:\r\n?|\n)/g);

	        this._input = ch + this._input;
	        this.yytext = this.yytext.substr(0, this.yytext.length-len-1);
	        //this.yyleng -= len;
	        this.offset -= len;
	        var oldLines = this.match.split(/(?:\r\n?|\n)/g);
	        this.match = this.match.substr(0, this.match.length-1);
	        this.matched = this.matched.substr(0, this.matched.length-1);

	        if (lines.length-1) this.yylineno -= lines.length-1;
	        var r = this.yylloc.range;

	        this.yylloc = {first_line: this.yylloc.first_line,
	          last_line: this.yylineno+1,
	          first_column: this.yylloc.first_column,
	          last_column: lines ?
	              (lines.length === oldLines.length ? this.yylloc.first_column : 0) + oldLines[oldLines.length - lines.length].length - lines[0].length:
	              this.yylloc.first_column - len
	          };

	        if (this.options.ranges) {
	            this.yylloc.range = [r[0], r[0] + this.yyleng - len];
	        }
	        return this;
	    },
	more:function () {
	        this._more = true;
	        return this;
	    },
	less:function (n) {
	        this.unput(this.match.slice(n));
	    },
	pastInput:function () {
	        var past = this.matched.substr(0, this.matched.length - this.match.length);
	        return (past.length > 20 ? '...':'') + past.substr(-20).replace(/\n/g, "");
	    },
	upcomingInput:function () {
	        var next = this.match;
	        if (next.length < 20) {
	            next += this._input.substr(0, 20-next.length);
	        }
	        return (next.substr(0,20)+(next.length > 20 ? '...':'')).replace(/\n/g, "");
	    },
	showPosition:function () {
	        var pre = this.pastInput();
	        var c = new Array(pre.length + 1).join("-");
	        return pre + this.upcomingInput() + "\n" + c+"^";
	    },
	next:function () {
	        if (this.done) {
	            return this.EOF;
	        }
	        if (!this._input) this.done = true;

	        var token,
	            match,
	            tempMatch,
	            index,
	            lines;
	        if (!this._more) {
	            this.yytext = '';
	            this.match = '';
	        }
	        var rules = this._currentRules();
	        for (var i=0;i < rules.length; i++) {
	            tempMatch = this._input.match(this.rules[rules[i]]);
	            if (tempMatch && (!match || tempMatch[0].length > match[0].length)) {
	                match = tempMatch;
	                index = i;
	                if (!this.options.flex) break;
	            }
	        }
	        if (match) {
	            lines = match[0].match(/(?:\r\n?|\n).*/g);
	            if (lines) this.yylineno += lines.length;
	            this.yylloc = {first_line: this.yylloc.last_line,
	                           last_line: this.yylineno+1,
	                           first_column: this.yylloc.last_column,
	                           last_column: lines ? lines[lines.length-1].length-lines[lines.length-1].match(/\r?\n?/)[0].length : this.yylloc.last_column + match[0].length};
	            this.yytext += match[0];
	            this.match += match[0];
	            this.matches = match;
	            this.yyleng = this.yytext.length;
	            if (this.options.ranges) {
	                this.yylloc.range = [this.offset, this.offset += this.yyleng];
	            }
	            this._more = false;
	            this._input = this._input.slice(match[0].length);
	            this.matched += match[0];
	            token = this.performAction.call(this, this.yy, this, rules[index],this.conditionStack[this.conditionStack.length-1]);
	            if (this.done && this._input) this.done = false;
	            if (token) return token;
	            else return;
	        }
	        if (this._input === "") {
	            return this.EOF;
	        } else {
	            return this.parseError('Lexical error on line '+(this.yylineno+1)+'. Unrecognized text.\n'+this.showPosition(),
	                    {text: "", token: null, line: this.yylineno});
	        }
	    },
	lex:function lex () {
	        var r = this.next();
	        if (typeof r !== 'undefined') {
	            return r;
	        } else {
	            return this.lex();
	        }
	    },
	begin:function begin (condition) {
	        this.conditionStack.push(condition);
	    },
	popState:function popState () {
	        return this.conditionStack.pop();
	    },
	_currentRules:function _currentRules () {
	        return this.conditions[this.conditionStack[this.conditionStack.length-1]].rules;
	    },
	topState:function () {
	        return this.conditionStack[this.conditionStack.length-2];
	    },
	pushState:function begin (condition) {
	        this.begin(condition);
	    }});
	lexer.options = {};
	lexer.performAction = function anonymous(yy,yy_,$avoiding_name_collisions,YY_START
	) {
	switch($avoiding_name_collisions) {
	case 0:// ignore
	break;
	case 1:return 17
	case 2:return 18
	case 3:return 12
	case 4:return 19
	case 5:return 28
	case 6:return 29
	case 7:return 30
	case 8:return 31
	case 9:return 32
	case 10:return 14
	case 11:return 23
	case 12:return 22
	case 13:return 20
	case 14:return 21
	case 15:return 5
	case 16:return "INVALID"
	}
	};
	lexer.rules = [/^(?:\s+)/,/^(?:\()/,/^(?:\))/,/^(?:-?[0-9]+(\.[0-9]+)?([eE][\-\+]?[0-9]+)?)/,/^(?:POINT\b)/,/^(?:LINESTRING\b)/,/^(?:POLYGON\b)/,/^(?:MULTIPOINT\b)/,/^(?:MULTILINESTRING\b)/,/^(?:MULTIPOLYGON\b)/,/^(?:,)/,/^(?:EMPTY\b)/,/^(?:M\b)/,/^(?:Z\b)/,/^(?:ZM\b)/,/^(?:$)/,/^(?:.)/];
	lexer.conditions = {"INITIAL":{"rules":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],"inclusive":true}};
	return lexer;})();
	parser.lexer = lexer;
	function Parser () { this.yy = {}; }Parser.prototype = parser;parser.Parser = Parser;
	return new Parser;
	})();

	  function PointArray (point) {
	    this.data = [ point ];
	    this.type = 'PointArray';
	  }

	  PointArray.prototype.addPoint = function (point) {
	    if (point.type === 'PointArray') {
	      this.data = this.data.concat(point.data);
	    } else {
	      this.data.push(point);
	    }

	    return this;
	  };

	  PointArray.prototype.toJSON = function () {
	    return this.data;
	  };

	  function Ring (point) {
	    this.data = point;
	    this.type = 'Ring';
	  }

	  Ring.prototype.toJSON = function () {
	    var data = [ ];

	    for (var i = 0; i < this.data.data.length; i++) {
	      data.push(this.data.data[i]);
	    }

	    return data;
	  };

	  function RingList (ring) {
	    this.data = [ ring ];
	    this.type = 'RingList';
	  }

	  RingList.prototype.addRing = function (ring) {
	    this.data.push(ring);

	    return this;
	  };

	  RingList.prototype.toJSON = function () {
	    var data = [ ];

	    for (var i = 0; i < this.data.length; i++) {
	      data.push(this.data[i].toJSON());
	    }

	    if (data.length === 1) {
	      return data;
	    } else {
	      return data;
	    }
	  };

	  function PolygonList (polygon) {
	    this.data = [ polygon ];
	    this.type = 'PolygonList';
	  }

	  PolygonList.prototype.addPolygon = function (polygon) {
	    this.data.push(polygon);

	    return this;
	  };

	  PolygonList.prototype.toJSON = function () {
	    var data = [ ];

	    for (var i = 0; i < this.data.length; i++) {
	      data = data.concat( [ this.data[i].toJSON() ] );
	    }

	    return data;
	  };

	  function parse (element) {
	    var res;

	    try {
	      res = parser.parse(element);
	    } catch (err) {
	      throw Error("Unable to parse: " + err);
	    }

	    return Terraformer.Primitive(res);
	  }

	  function arrayToRing (arr) {
	    var parts = [ ], ret = '';

	    for (var i = 0; i < arr.length; i++) {
	      parts.push(arr[i].join(' '));
	    }

	    ret += '(' + parts.join(', ') + ')';

	    return ret;

	  }

	  function pointToWKTPoint (primitive) {
	    var ret = 'POINT ';

	    if (primitive.coordinates === undefined || primitive.coordinates.length === 0) {
	      ret += 'EMPTY';

	      return ret;
	    } else if (primitive.coordinates.length === 3) {
	      // 3d or time? default to 3d
	      if (primitive.properties && primitive.properties.m === true) {
	        ret += 'M ';
	      } else {
	        ret += 'Z ';
	      }
	    } else if (primitive.coordinates.length === 4) {
	      // 3d and time
	      ret += 'ZM ';
	    }

	    // include coordinates
	    ret += '(' + primitive.coordinates.join(' ') + ')';

	    return ret;
	  }

	  function lineStringToWKTLineString (primitive) {
	    var ret = 'LINESTRING ';

	    if (primitive.coordinates === undefined || primitive.coordinates.length === 0 || primitive.coordinates[0].length === 0) {
	      ret += 'EMPTY';

	      return ret;
	    } else if (primitive.coordinates[0].length === 3) {
	      if (primitive.properties && primitive.properties.m === true) {
	        ret += 'M ';
	      } else {
	        ret += 'Z ';
	      }
	    } else if (primitive.coordinates[0].length === 4) {
	      ret += 'ZM ';
	    }

	    ret += arrayToRing(primitive.coordinates);

	    return ret;
	  }

	  function polygonToWKTPolygon (primitive) {
	    var ret = 'POLYGON ';

	    if (primitive.coordinates === undefined || primitive.coordinates.length === 0 || primitive.coordinates[0].length === 0) {
	      ret += 'EMPTY';

	      return ret;
	    } else if (primitive.coordinates[0][0].length === 3) {
	      if (primitive.properties && primitive.properties.m === true) {
	        ret += 'M ';
	      } else {
	        ret += 'Z ';
	      }
	    } else if (primitive.coordinates[0][0].length === 4) {
	      ret += 'ZM ';
	    }

	    ret += '(';
	    var parts = [ ];
	    for (var i = 0; i < primitive.coordinates.length; i++) {
	      parts.push(arrayToRing(primitive.coordinates[i]));
	    }

	    ret += parts.join(', ');
	    ret += ')';

	    return ret;
	  }

	  function multiPointToWKTMultiPoint (primitive) {
	    var ret = 'MULTIPOINT ';

	    if (primitive.coordinates === undefined || primitive.coordinates.length === 0 || primitive.coordinates[0].length === 0) {
	      ret += 'EMPTY';

	      return ret;
	    } else if (primitive.coordinates[0].length === 3) {
	      if (primitive.properties && primitive.properties.m === true) {
	        ret += 'M ';
	      } else {
	        ret += 'Z ';
	      }
	    } else if (primitive.coordinates[0].length === 4) {
	      ret += 'ZM ';
	    }

	    ret += arrayToRing(primitive.coordinates);

	    return ret;
	  }

	  function multiLineStringToWKTMultiLineString (primitive) {
	    var ret = 'MULTILINESTRING ';

	    if (primitive.coordinates === undefined || primitive.coordinates.length === 0 || primitive.coordinates[0].length === 0) {
	      ret += 'EMPTY';

	      return ret;
	    } else if (primitive.coordinates[0][0].length === 3) {
	      if (primitive.properties && primitive.properties.m === true) {
	        ret += 'M ';
	      } else {
	        ret += 'Z ';
	      }
	    } else if (primitive.coordinates[0][0].length === 4) {
	      ret += 'ZM ';
	    }

	    ret += '(';
	    var parts = [ ];
	    for (var i = 0; i < primitive.coordinates.length; i++) {
	      parts.push(arrayToRing(primitive.coordinates[i]));
	    }

	    ret += parts.join(', ');
	    ret += ')';

	    return ret;
	  }

	  function multiPolygonToWKTMultiPolygon (primitive) {
	    var ret = 'MULTIPOLYGON ';

	    if (primitive.coordinates === undefined || primitive.coordinates.length === 0 || primitive.coordinates[0].length === 0 || primitive.coordinates[0][0].length === 0) {
	      ret += 'EMPTY';

	      return ret;
	    } else if (primitive.coordinates[0][0][0].length === 3) {
	      if (primitive.properties && primitive.properties.m === true) {
	        ret += 'M ';
	      } else {
	        ret += 'Z ';
	      }
	    } else if (primitive.coordinates[0][0][0].length === 4) {
	      ret += 'ZM ';
	    }

	    ret += '(';
	    var inner = [ ];
	    for (var c = 0; c < primitive.coordinates.length; c++) {
	      var it = '(';
	      var parts = [ ];
	      for (var i = 0; i < primitive.coordinates[c].length; i++) {
	        parts.push(arrayToRing(primitive.coordinates[c][i]));
	      }

	      it += parts.join(', ');
	      it += ')';

	      inner.push(it);
	    }

	    ret += inner.join(', ');
	    ret += ')';

	    return ret;
	  }

	  function convert (primitive) {
	    switch (primitive.type) {
	      case 'Point':
	        return pointToWKTPoint(primitive);
	      case 'LineString':
	        return lineStringToWKTLineString(primitive);
	      case 'Polygon':
	        return polygonToWKTPolygon(primitive);
	      case 'MultiPoint':
	        return multiPointToWKTMultiPoint(primitive);
	      case 'MultiLineString':
	        return multiLineStringToWKTMultiLineString(primitive);
	      case 'MultiPolygon':
	        return multiPolygonToWKTMultiPolygon(primitive);
	      case 'GeometryCollection':
	        var ret = 'GEOMETRYCOLLECTION';
	        var parts = [ ];
	        for (i = 0; i < primitive.geometries.length; i++){
	          parts.push(convert(primitive.geometries[i]));
	        }
	        return ret + '(' + parts.join(', ') + ')';
	      default:
	        throw Error ("Unknown Type: " + primitive.type);
	    }
	  }

	  exports.parser  = parser;
	  exports.Parser  = parser.Parser;
	  exports.parse   = parse;
	  exports.convert = convert;

	  return exports;
	}));
} (terraformerWktParser));

// configure proj4 in order to convert GIS coordinates to web mercator
proj4.defs('EPSG:25832', '+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs');
// DE-MV
proj4.defs('EPSG:5650', '+proj=tmerc +lat_0=0 +lon_0=15 +k=0.9996 +x_0=33500000 +y_0=0 +ellps=GRS80 +units=m +no_defs');
// DE-HE
proj4.defs('EPSG:31467', '+proj=tmerc +lat_0=0 +lon_0=9 +k=1 +x_0=3500000 +y_0=0 +ellps=bessel +datum=potsdam +units=m +no_defs');
// DE-SL
proj4.defs('EPSG:31462', '+proj=tmerc +lat_0=0 +lon_0=6 +k=1 +x_0=2500000 +y_0=0 +ellps=bessel +datum=potsdam +units=m +no_defs');
// others
proj4.defs('EPSG:31468', '+proj=tmerc +lat_0=0 +lon_0=12 +k=1 +x_0=4500000 +y_0=0 +ellps=bessel +datum=potsdam +units=m +no_defs');
proj4.defs('EPSG:25833', '+proj=utm +zone=33 +ellps=GRS80 +units=m +no_defs');
proj4.defs('EPSG:4647', '+proj=tmerc +lat_0=0 +lon_0=9 +k=0.9996 +x_0=32500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');

const fromETRS89 = new proj4.Proj('EPSG:25832');
const toWGS84 = new proj4.Proj('WGS84');

// ToDo: Fix lexical binding of this
function getArrayDepth (value) {
  return Array.isArray(value)
    ? 1 + Math.max(...value.map(getArrayDepth))
    : 0
}

function toGeoJSON (gml, projection) {
  // convert gml to json
  const json = xml(gml.replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
  const flatJson = flatten(json);
  const polygonArray = Object.keys(flatJson).map(k => {
    return toCoordinates(flatJson[k], projection)
  }).filter(c => c[0]);
  if (getArrayDepth(polygonArray) === 4) {
    return multiPolygon(polygonArray)
  }
  return polygon(polygonArray)
}

function toPairs (array) {
  return array.reduce((result, value, index, array) => {
    if (index % 2 === 0) { result.push(array.slice(index, index + 2)); }
    return result
  }, [])
}

function coordsToWGS84 (coordPair, projection) {
  if (coordPair.length !== 2) return
  if (!projection) projection = fromETRS89;
  return proj4(projection, toWGS84, coordPair)
}

function toCoordinates (string, projection, keepProjection) {
  const numbers = string.split(/\s+/g).map(s => Number(s)).filter(n => !isNaN(n));
  let coords = toPairs(numbers);
  if (!keepProjection) {
    coords = coords.map(c => coordsToWGS84(c, projection));
  }
  return coords
}

function flatten (ob) {
  const toReturn = {};
  for (const i in ob) {
    if (!(i in ob)) continue
    if ((typeof ob[i]) === 'object') {
      const flatObject = flatten(ob[i]);
      for (const x in flatObject) {
        if (!(x in flatObject)) continue
        toReturn[i + '.' + x] = flatObject[x];
      }
    } else {
      toReturn[i] = ob[i];
    }
  }
  return toReturn
}

function wktToGeoJSON (wkt) {
  let geojson = terraformerWktParser.exports.parse(wkt);
  geojson = reprojectFeature(geojson);
  return geojson
}

function reprojectFeature (feature, projection) {
  if (!projection) projection = fromETRS89;
  coordEach(feature, coord => {
    const p = proj4(projection, toWGS84, coord);
    coord.length = 0;
    coord.push(...p);
  });
  return feature
}

function groupByFLIK (fields) {
  // create an object where each fieldblock the farm operates on is a key
  // with the fields in that fieldblock being the properties
  const groups = groupBy(fields, 'FieldBlockNumber');
  let curNo = 0;
  const reNumberedFields = [];
  Object.keys(groups).forEach(fieldBlock => {
    // if there's only one field in the fieldblock, we just re-assign its field
    // number and go on
    const fieldsInFieldBlock = groups[fieldBlock];
    if (fieldsInFieldBlock.length === 1) {
      fieldsInFieldBlock[0].NumberOfField = curNo;
      fieldsInFieldBlock[0].PartOfField = 0;
      reNumberedFields.push(fieldsInFieldBlock[0]);
      curNo++;
    } else {
      // unfortunately, we cannot be sure if the two fields from a fieldblock
      // are acutally part of a single field, as it may happen that a farmer has
      // two fields in the same fieldblock, while another farmer owns the field
      // in between these other fields.
      // we therefore need to check if the fields would form a union or not
      const union = polygonClipping.union(...fieldsInFieldBlock.map(f => f.SpatialData.geometry.coordinates));
      // the features do not form a single union, we therefore assume they
      // cannot be joined to single field

      if (getSafe(() => union.geometry.length) > 1) {
        fieldsInFieldBlock.forEach(field => {
          field.NumberOfField = curNo;
          field.PartOfField = 0;
          reNumberedFields.push(field);
          curNo++;
        });
      } else {
        fieldsInFieldBlock.forEach((field, i) => {
          field.NumberOfField = curNo;
          field.PartOfField = i;
          reNumberedFields.push(field);
        });
        curNo++;
      }
    }
  });
  return reNumberedFields
}

function groupBy (xs, key) {
  return xs.reduce((rv, x) => {
    (rv[x[key]] = rv[x[key]] || []).push(x);
    return rv
  }, {})
}

function queryComplete (query, requiredProps) {
  return requiredProps.reduce((incomplete, curProp) => {
    if (curProp in query) return ''
    return incomplete + `Missing property ${curProp} for state ${query.state}. `
  }, '')
}

/**
 * Takes a GeoJSON Feature or FeatureCollection and truncates the precision of the geometry.
 *
 * @name truncate
 * @param {GeoJSON} geojson any GeoJSON Feature, FeatureCollection, Geometry or GeometryCollection.
 * @param {Object} [options={}] Optional parameters
 * @param {number} [options.precision=6] coordinate decimal precision
 * @param {number} [options.coordinates=3] maximum number of coordinates (primarly used to remove z coordinates)
 * @param {boolean} [options.mutate=false] allows GeoJSON input to be mutated (significant performance increase if true)
 * @returns {GeoJSON} layer with truncated geometry
 * @example
 * var point = turf.point([
 *     70.46923055566859,
 *     58.11088890802906,
 *     1508
 * ]);
 * var options = {precision: 3, coordinates: 2};
 * var truncated = turf.truncate(point, options);
 * //=truncated.geometry.coordinates => [70.469, 58.111]
 *
 * //addToMap
 * var addToMap = [truncated];
 */
function truncate(geojson, options) {
    if (options === void 0) { options = {}; }
    // Optional parameters
    var precision = options.precision;
    var coordinates = options.coordinates;
    var mutate = options.mutate;
    // default params
    precision =
        precision === undefined || precision === null || isNaN(precision)
            ? 6
            : precision;
    coordinates =
        coordinates === undefined || coordinates === null || isNaN(coordinates)
            ? 3
            : coordinates;
    // validation
    if (!geojson)
        throw new Error("<geojson> is required");
    if (typeof precision !== "number")
        throw new Error("<precision> must be a number");
    if (typeof coordinates !== "number")
        throw new Error("<coordinates> must be a number");
    // prevent input mutation
    if (mutate === false || mutate === undefined)
        geojson = JSON.parse(JSON.stringify(geojson));
    var factor = Math.pow(10, precision);
    // Truncate Coordinates
    coordEach(geojson, function (coords) {
        truncateCoords(coords, factor, coordinates);
    });
    return geojson;
}
/**
 * Truncate Coordinates - Mutates coordinates in place
 *
 * @private
 * @param {Array<any>} coords Geometry Coordinates
 * @param {number} factor rounding factor for coordinate decimal precision
 * @param {number} coordinates maximum number of coordinates (primarly used to remove z coordinates)
 * @returns {Array<any>} mutated coordinates
 */
function truncateCoords(coords, factor, coordinates) {
    // Remove extra coordinates (usually elevation coordinates and more)
    if (coords.length > coordinates)
        coords.splice(coordinates, coords.length);
    // Truncate coordinate decimals
    for (var i = 0; i < coords.length; i++) {
        coords[i] = Math.round(coords[i] * factor) / factor;
    }
    return coords;
}

class Field {
  constructor (properties) {
    this.id = properties.id || 'String';
    this.referenceDate = properties.referenceDate;
    this.NameOfField = properties.NameOfField || `Unbenannt ${properties.NumberOfField}`;
    this.NumberOfField = properties.NumberOfField;
    this.Area = properties.Area;
    this.FieldBlockNumber = properties.FieldBlockNumber;
    this.PartOfField = properties.PartOfField;

    try {
      this.SpatialData = truncate(properties.SpatialData, {
        mutate: true, coordinates: 2
      });
    } catch (e) {
      // in BW geometry ids are replaced with actual geometries later
      this.SpatialData = properties.SpatialData;
    }

    this.LandUseRestriction = properties.LandUseRestriction;
    this.Cultivation = properties.Cultivation;
  }
}

async function bb (query) {
  const incomplete = queryComplete(query, ['xml']);
  if (incomplete) throw new Error(incomplete)
  const data = xml(query.xml);
  const applicationYear = data['fa:flaechenantrag']['fa:xsd_info']['fa:xsd_jahr'];
  const parzellen = data['fa:flaechenantrag']['fa:gesamtparzellen']['fa:gesamtparzelle'];
  let count = 0;
  const plots = parzellen.reduce((acc, p) => {
    // start off with main area of field
    const hnf = p['fa:teilflaechen']['fa:hauptnutzungsflaeche'];
    acc.push(new Field({
      id: `harmonie_${count}_${hnf['fa:flik']}`,
      referenceDate: applicationYear,
      NameOfField: '', // seems to be unavailable in Agrarantrag-BB export files?,
      NumberOfField: Math.floor(hnf['fa:teilflaechennummer']),
      Area: hnf['fa:groesse'] / 10000,
      FieldBlockNumber: hnf['fa:flik'],
      PartOfField: 0,
      SpatialData: toGeoJSON(hnf['fa:geometrie'], 'EPSG:25833'),
      LandUseRestriction: '',
      Cultivation: {
        PrimaryCrop: {
          CropSpeciesCode: hnf['fa:nutzung'],
          Name: ''
        }
      }
    }));
    count++;
    // go on with field (buffer) strips
    const strfFlaechen = p['fa:teilflaechen']['fa:streifen_flaechen'];
    // return only main area if no field strips are defined
    if (!strfFlaechen) return acc
    // convert to array structure if only one buffer strip is defined
    if (!Array.isArray(strfFlaechen['fa:streifen'])) {
      strfFlaechen['fa:streifen'] = [strfFlaechen['fa:streifen']];
    }
    strfFlaechen['fa:streifen'].forEach((stf, j) => {
      count++;
      acc.push(new Field({
        id: `harmonie_${count}_${stf['fa:flik']}`,
        referenceDate: applicationYear,
        NameOfField: '', // seems to be unavailable in Agrarantrag-BB export files?,
        NumberOfField: Math.floor(stf['fa:teilflaechennummer']),
        Area: stf['fa:groesse'] / 10000,
        FieldBlockNumber: stf['fa:flik'],
        PartOfField: j,
        SpatialData: toGeoJSON(stf['fa:geometrie'], 'EPSG:25833'),
        LandUseRestriction: '',
        Cultivation: {
          PrimaryCrop: {
            CropSpeciesCode: stf['fa:nutzung'],
            Name: ''
          }
        }
      }));
    });
    return acc
  }, []);
  // finally, group the parts of fields by their FLIK and check whether they are
  // actually seperate parts of fields
  return groupByFLIK(plots)
}

async function bw (query) {
  const incomplete = queryComplete(query, ['xml', 'shp', 'dbf']);
  if (incomplete) throw new Error(incomplete)
  // parse the shape file information
  const geometries = await shape(query.shp, query.dbf);
  // reproject coordinates into web mercator
  query.prj = query.prj || 'GEOGCS["ETRS89",DATUM["D_ETRS_1989",SPHEROID["GRS_1980",6378137,298.257222101]],PRIMEM["Greenwich",0],UNIT["Degree",0.017453292519943295]]';
  geometries.features = geometries.features.map(f => {
    return truncate(reprojectFeature(f, query.prj), {
      mutate: true, coordinates: 2
    })
  });

  // parse the individual field information
  const data = xml(query.xml);
  let applicationYear, subplotsRawData;
  // try to access the subplots from the xml
  try {
    applicationYear = data['fsv:FSV']['fsv:FSVHeader']['commons:Antragsjahr'];
    subplotsRawData = data['fsv:FSV']['fsv:FSVTable']['fsv:FSVTableRow'];
    // only consider plots that have a geometry attached
    subplotsRawData = subplotsRawData.filter(plot => plot['fsvele:Geometrie']);
  } catch (e) {
    throw new Error('Error in XML data structure. Is this file the correct file from FSV BW?')
  }
  const subplots = subplotsRawData.map((plot, count) => new Field({
    id: `harmonie_${count}_${plot['fsvele:FLIK']}`,
    referenceDate: applicationYear,
    NameOfField: plot['commons:Bezeichnung'],
    NumberOfField: plot['fsvele:SchlagNummer'],
    Area: plot['fsvele:NutzflaecheMitLandschaftselement']['#text'],
    FieldBlockNumber: plot['fsvele:FLIK'],
    PartOfField: '',
    SpatialData: plot['fsvele:GeometrieId'],
    LandUseRestriction: '',
    Cultivation: {
      PrimaryCrop: {
        CropSpeciesCode: plot['fsvele:CodeDerKultur'],
        Name: ''
      }
    }
  }));
  // in BW some fields are having multiple entries in the raw XML, despite only
  // having a single geometry attached
  // we now group the fields by similar geometries and re-evaluate
  const grouped = groupBy(subplots, 'SpatialData');
  const cleanedPlots = [];
  Object.keys(grouped).forEach(geometryId => {
    const fieldsWithSameId = grouped[geometryId];
    if (fieldsWithSameId.length > 1) {
      for (let i = 1; i < fieldsWithSameId.length; i++) {
        fieldsWithSameId[0].Area += fieldsWithSameId[i].Area;
      }
    }
    // replace geometry id with actualy geometry
    fieldsWithSameId[0].SpatialData = geometries.features.find(f => {
      return fieldsWithSameId[0].SpatialData === f.properties.geo_id
    });
    cleanedPlots.push(fieldsWithSameId[0]);
  });
  // finally, group the parts of fields by their FLIK and check whether they are
  // actually seperate parts of fields
  return groupByFLIK(cleanedPlots)
}

async function by (query) {
  const incomplete = queryComplete(query, ['xml']);
  if (incomplete) throw new Error(incomplete)
  const data = xml(query.xml);
  let applicationYear, subplots;
  // try to access the subplots from the xml
  try {
    applicationYear = data.Ergebnis.Abfrage.Jahr;
    subplots = data.Ergebnis.Betriebe.Betrieb.Feldstuecke.Feldstueck;
    // only consider plots that have a geometry attached
    subplots = subplots.filter(plot => plot.Geometrie);
  } catch (e) {
    throw new Error(e, 'Error in XML data structure. Is this file the correct file from iBALIS Bavaria?')
  }

  const plots = subplots.map((plot, count) => new Field({
    id: `harmonie_${count}_${plot['@_FID']}`,
    referenceDate: applicationYear,
    NameOfField: plot.Name || `Unbenannt ${plot.Nummer}`,
    NumberOfField: plot.Nummer,
    Area: plot.Flaeche,
    FieldBlockNumber: plot['@_FID'],
    PartOfField: '',
    SpatialData: wktToGeoJSON(plot.Geometrie),
    LandUseRestriction: '',
    Cultivation: {
      PrimaryCrop: {
        // only return the first crop found in the Nutzungen property (in case
        // of multiple crops), as we don't have any spatial information
        // about where the crops are cultivated
        CropSpeciesCode: getSafe(() => plot.Nutzungen.Nutzung.Code) || getSafe(() => plot.Nutzungen.Nutzung[0].Code),
        Name: ''
      }
    }
  }));
  // finally, group the parts of fields by their FLIK and check whether they are
  // actually seperate parts of fields
  return groupByFLIK(plots)
}

async function he (query) {
  const incomplete = queryComplete(query, ['shp', 'dbf']);
  if (incomplete) throw new Error(incomplete)
  // parse the shape file information
  const geometries = await shape(query.shp, query.dbf);
  // reproject coordinates into web mercator
  if (!query.prj) {
    query.prj = 'EPSG:31467';
  }
  geometries.features = geometries.features.map(f => reprojectFeature(f, query.prj));

  const subplots = geometries.features.map((plot, count) => new Field({
    id: `harmonie_${count}_${plot.properties.FLIK}`,
    referenceDate: undefined, // duh!
    NameOfField: plot.properties.LAGE_BEZ,
    NumberOfField: count,
    Area: plot.properties.BEANTR_GRO,
    FieldBlockNumber: plot.properties.FLIK,
    PartOfField: '',
    SpatialData: plot,
    Cultivation: {
      PrimaryCrop: {
        CropSpeciesCode: plot.properties.NCODE,
        Name: plot.properties.NUTZUNG
      }
    }
  }));

  // finally, group the parts of fields by their FLIK and check whether they are
  // actually seperate parts of fields
  return groupByFLIK(subplots)
}

async function mv (query) {
  const incomplete = queryComplete(query, ['xml']);
  if (incomplete) throw new Error(incomplete)
  const data = xml(query.xml);
  const applicationYear = data['fa:flaechenantrag']['fa:xsd_info']['fa:xsd_jahr'];
  const parzellen = data['fa:flaechenantrag']['fa:gesamtparzellen']['fa:gesamtparzelle'];
  let count = 0;
  const plots = parzellen.reduce((acc, p) => {
    // start off with main area of field
    const hnf = p['fa:teilflaechen']['fa:hauptnutzungsflaeche'];
    acc.push(new Field({
      id: `harmonie_${count}_${hnf['fa:flik']}`,
      referenceDate: applicationYear,
      NameOfField: '', // seems to be unavailable in Agrarantrag-BB export files?,
      NumberOfField: Math.floor(hnf['fa:teilflaechennummer']),
      Area: hnf['fa:groesse'] / 10000,
      FieldBlockNumber: hnf['fa:flik'],
      PartOfField: 0,
      SpatialData: toGeoJSON(hnf['fa:geometrie'], 'EPSG:5650'),
      LandUseRestriction: '',
      Cultivation: {
        PrimaryCrop: {
          CropSpeciesCode: hnf['fa:nutzung'],
          Name: ''
        }
      }
    }));
    count++;
    // go on with field (buffer) strips
    const strfFlaechen = p['fa:teilflaechen']['fa:streifen_flaechen'];
    // return only main area if no field strips are defined
    if (!strfFlaechen) return acc
    // convert to array structure if only one buffer strip is defined
    if (!Array.isArray(strfFlaechen['fa:streifen'])) {
      strfFlaechen['fa:streifen'] = [strfFlaechen['fa:streifen']];
    }
    strfFlaechen['fa:streifen'].forEach((stf, j) => {
      count++;
      acc.push(new Field({
        id: `harmonie_${count}_${stf['fa:flik']}`,
        referenceDate: applicationYear,
        NameOfField: '', // seems to be unavailable in Agrarantrag-BB export files?,
        NumberOfField: Math.floor(stf['fa:teilflaechennummer']),
        Area: stf['fa:groesse'] / 10000,
        FieldBlockNumber: stf['fa:flik'],
        PartOfField: j,
        SpatialData: toGeoJSON(stf['fa:geometrie']),
        LandUseRestriction: '',
        Cultivation: {
          PrimaryCrop: {
            CropSpeciesCode: stf['fa:nutzung'],
            Name: ''
          }
        }
      }));
    });
    return acc
  }, []);
  // finally, group the parts of fields by their FLIK and check whether they are
  // actually seperate parts of fields
  return groupByFLIK(plots)
}

async function ni (query) {
  const incomplete = queryComplete(query, ['shp', 'dbf']);
  if (incomplete) throw new Error(incomplete)
  // if a projection was passed, check if it is supported
  const supportedProjs = ['EPSG:25832', 'EPSG:5650', 'EPSG:31467', 'EPSG:31462', 'EPSG:31468', 'EPSG:25833', 'EPSG:4647'];
  if (query.projection && !query.prj) {
    if (supportedProjs.indexOf(query.projection) === -1) {
      throw new Error(`Projection ${query.projection} is not supported by harmonie. The supported projections are: ${supportedProjs}`)
    }
    query.prj = query.projection;
  }
  // parse the shape file information
  const geometries = await shape(query.shp, query.dbf);
  // reproject coordinates into web mercator
  geometries.features = geometries.features.map(f => reprojectFeature(f, query.prj));

  // as we don't know anything about the structure of the shape files,
  // we just make some assumptions based on the following information
  //
  const subplots = geometries.features.map((plot, count) => new Field({
    id: `harmonie_${count}_${plot.properties.FLIK}`,
    referenceDate: plot.properties.ANTJAHR,
    NameOfField: '',
    NumberOfField: count,
    Area: plot.properties.AKT_FL,
    FieldBlockNumber: plot.properties.FLIK,
    PartOfField: '',
    SpatialData: plot,
    Cultivation: {
      PrimaryCrop: {
        CropSpeciesCode: plot.properties.KC_GEM,
        Name: undefined
      }
    }
  }));

  // finally, group the parts of fields by their FLIK and check whether they are
  // actually seperate parts of fields
  return groupByFLIK(subplots)
}

async function nw (query) {
  const incomplete = queryComplete(query, ['xml', 'gml']);
  if (incomplete) throw new Error(incomplete)
  const data = dataExperts(query.xml, query.gml);

  const plots = data.map((f, i) => new Field({
    id: `harmonie_${i}_${f.feldblock}`,
    referenceDate: f.applicationYear,
    NameOfField: f.schlag.bezeichnung,
    NumberOfField: f.schlag.nummer,
    Area: f.nettoflaeche / 10000,
    FieldBlockNumber: f.feldblock,
    PartOfField: f.teilschlag,
    SpatialData: f.geometry,
    Cultivation: {
      PrimaryCrop: {
        CropSpeciesCode: f.nutzungaj.code,
        Name: f.nutzungaj.bezeichnung
      },
      CatchCrop: {
        // eslint-disable-next-line eqeqeq
        CropSpeciesCode: f.greeningcode == '1' ? 50 : '',
        // eslint-disable-next-line eqeqeq
        Name: f.greeningcode == '1' ? 'Mischkulturen Saatgutmischung' : ''
      },
      PrecedingCrop: {
        CropSpeciesCode: f.nutzungvj.code,
        Name: f.nutzungvj.bezeichnung
      }
    }
  }));
  // finally, group the parts of fields by their FLIK and check whether they are
  // actually seperate parts of fields
  return groupByFLIK(plots)
}

async function sl (query) {
  const incomplete = queryComplete(query, ['shp', 'dbf']);
  if (incomplete) throw new Error(incomplete)
  // parse the shape file information
  const geometries = await shape(query.shp, query.dbf);
  // reproject coordinates into web mercator
  query.prj = query.prj || 'EPSG:31462';
  geometries.features = geometries.features.map(f => reprojectFeature(f, query.prj));

  const subplots = geometries.features.map((plot, count) => new Field({
    id: `harmonie_${count}_${plot.properties.FLIK}`,
    referenceDate: plot.properties.JAHR,
    NameOfField: plot.properties.LAGE_BEZ,
    NumberOfField: count,
    Area: plot.properties.GR,
    FieldBlockNumber: plot.properties.FLIK,
    PartOfField: '',
    SpatialData: plot,
    Cultivation: {
      PrimaryCrop: {
        CropSpeciesCode: plot.properties.NCODE,
        Name: plot.properties.CODE_BEZ
      }
    }
  }));

  // finally, group the parts of fields by their FLIK and check whether they are
  // actually seperate parts of fields
  return groupByFLIK(subplots)
}

async function th (query) {
  const incomplete = queryComplete(query, ['shp', 'dbf']);
  if (incomplete) throw new Error(incomplete)
  // parse the shape file information
  const geometries = await shape(query.shp, query.dbf);
  // reproject coordinates into web mercator
  geometries.features = geometries.features.map(f => reprojectFeature(f, query.prj));

  const subplots = geometries.features.map((plot, count) => new Field({
    id: `harmonie_${count}_${plot.properties.FBI}`,
    referenceDate: undefined, // duh!
    NameOfField: '',
    NumberOfField: count,
    Area: plot.properties.FL,
    FieldBlockNumber: plot.properties.FBI,
    PartOfField: '',
    SpatialData: plot,
    Cultivation: {
      PrimaryCrop: {
        CropSpeciesCode: undefined, // duh!
        Name: undefined
      }
    }
  }));

  // finally, group the parts of fields by their FLIK and check whether they are
  // actually seperate parts of fields
  return groupByFLIK(subplots)
}

function harmonie (query) {
  const state = query.state;
  if (!state) {
    throw new Error('No property "state" given, required to be in ' +
     'ISO 3166-2 UTF-8 string format (e.g. "DE-NW")')
  }
  switch (state) {
    case 'DE-BB':
      return bb(query)
    case 'DE-BE':
      return bb(query)
    case 'DE-BW':
      return bw(query)
    case 'DE-BY':
      return by(query)
    case 'DE-HB':
      return ni(query)
    case 'DE-HE':
      return he(query)
    case 'DE-HH':
      return ni(query)
    case 'DE-MV':
      return mv(query)
    case 'DE-NI':
      return ni(query)
    case 'DE-NW':
      return nw(query)
    case 'DE-RP':
      return ni(query)
    case 'DE-SH':
      return ni(query)
    case 'DE-SL':
      return sl(query)
    case 'DE-SN':
      return ni(query)
    case 'DE-ST':
      return ni(query)
    case 'DE-TH':
      return th(query)
    default:
      throw new Error(`No such state as "${state}" according to ISO 3166-2 in Germany."`)
  }
}

export { harmonie as default };
