const emojiFlags = require('emoji-flags');

const utils = {}

utils.replaceAll = (str, find, replace) => str.split(find).join(replace)

utils.capitalizeFirstLetter = (string) => string.charAt(0).toUpperCase() + string.slice(1)

utils.wait = async (dur) => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve()
        }, dur)
    })
}

utils.getStateEmoji = (code) => {
    
    let ccFlag = emojiFlags.countryCode(code)
    
    if(ccFlag && ccFlag.emoji) {
        return ccFlag.emoji
    }
    
    if(code === 'Arizona') return '🌵';
    if(code === 'California') return '🏄';
    if(code === 'Florida') return '🍊';
    if(code === 'Texas') return '🐍';
    if(code === 'Massachusetts') return '🏛';
    if(code === 'New York') return '🗽';
    if(code === 'Oregon') return '🌲';
    if(code === 'Washington') return '🌲';
    if(code === 'all') return '🌐';
    if(code === 'US') return '🇺🇸';
    if(code === 'BR') return '🇧🇷';
    if(code === 'RU') return '🇷🇺';
    
    return '🏴'
}

utils.getCountryCodeName = country => {
    return utils.capitalizeFirstLetter(country.name) + ' ' + utils.getStateEmoji(country.iso2)
}

module.exports = utils