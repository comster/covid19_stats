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
    
    if(code === 'Alaska') return '🦅';
    if(code === 'Arizona') return '🌵';
    if(code === 'Arkansas') return '💎';
    if(code === 'California') return '🏄';
    if(code === 'Colorado') return '🏔️';
    if(code === 'Connecticut') return '🍂';
    if(code === 'Delaware') return '🏴󠁵󠁳󠁤󠁥󠁿';
    if(code === 'District Of Columbia') return '⭐';
    if(code === 'Florida') return '🍊';
    if(code === 'Georgia') return '🍑';
    if(code === 'Hawaii') return '🌴';
    if(code === 'Idaho') return '🥔';
    if(code === 'Kansas') return '👨‍🌾';
    if(code === 'Kentucky') return '🏇';
    if(code === 'Tennessee') return '✨';
    if(code === 'Texas') return '🐍';
    if(code === 'Maine') return '🏠';
    if(code === 'Maryland') return '🦀';
    if(code === 'Massachusetts') return '🏛';
    if(code === 'Michigan') return '🧤';
    if(code === 'Minnesota') return '🌨️';
    if(code === 'Montana') return '🤠';
    if(code === 'Nebraska') return '🐝';
    if(code === 'Nevada') return '🎰';
    if(code === 'New Mexico') return '🌞';
    if(code === 'New York') return '🗽';
    if(code === 'North Carolina') return '🌟';
    if(code === 'Ohio') return '🦌';
    if(code === 'Oklahoma') return '🚜';
    if(code === 'Oregon') return '🌲';
    if(code === 'Pennsylvania') return '🔑';
    if(code === 'Rhode Island') return '⚓';
    if(code === 'South Carolina') return '🌙';
    if(code === 'Utah') return '🏂';
    if(code === 'Virginia') return '🔱';
    if(code === 'Washington') return '⛰️';
    if(code === 'West Virginia') return '🐻';
    if(code === 'Wisconsin') return '🐄';
    if(code === 'Wyoming') return '🐃';
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