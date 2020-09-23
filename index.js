const fs = require('fs')
const got = require('got')
const moment = require('moment')
const Mastodon = require('mastodon-api')

const utils = require('./utils')

const d3 = require('d3-node')().d3
const d3nLine = require('./d3node-linechart.js')
const output = require('./d3node-output.js')

// API 
const API_URL = (countryCode) => countryCode == 'all' ? "https://corona.lmao.ninja/v2/all" : "https://corona.lmao.ninja/v3/covid-19/countries/"+countryCode
const API_URL_HISTORICAL = (countryCode="US", days=90) => "https://disease.sh/v3/covid-19/historical/"+countryCode+"?lastdays="+days
const API_URL_COUNTRIES = () => "https://disease.sh/v3/covid-19/countries?sort=cases"
const API_URL_STATE = (stateCode) => "https://disease.sh/v3/covid-19/states/"+stateCode
const API_URL_STATES = () => "https://disease.sh/v3/covid-19/states"
const API_URL_HISTORICAL_STATE = (s, days=3) => 'https://corona.lmao.ninja/v3/covid-19/historical/usacounties/'+s+'?lastdays='+days
const API_URL_STATE_FLAG = (state) => "https://raw.githubusercontent.com/CivilServiceUSA/us-states/master/images/flags/"+utils.replaceAll(state, ' ', '-').toLocaleLowerCase()+"-large.png"
const API_URL_STATE_LANDSCAPE = (state) => "https://raw.githubusercontent.com/CivilServiceUSA/us-states/master/images/backgrounds/640x360/landscape/"+state.toLocaleLowerCase()+".jpg"

const ROLLING_DAYS = 7
const DATA_START_DATE = '2020-03-01'
const DAYS_OF_DATA = moment().diff(moment(DATA_START_DATE), 'days')
const MAX_COUNTRIES = 52
const MEDIA_WAIT_TIME = 60 * 1000

const M = new Mastodon({
  access_token: process.env.MASTADON_ACCESS_TOKEN,
  api_url: process.env.MASTADON_API_URL
})

const tootMedia = function(file) {
    return new Promise((resolve, reject) => {
        if(file) {
            M.post('media', { file: fs.createReadStream(file) }).then(resp => {
                resolve(resp.data.id)
            })
        } else {
            resolve()
        }
    })
}

const toot = function(status, media) {
    return new Promise((resolve, reject) => {
        tootMedia(media).then(media_id => {
            let statusOpts = {
                status: status
            }
            if(media_id) {
                statusOpts.media_ids = [media_id]
            }
            M.post('statuses', statusOpts, function(err, t){
                if(err) {
                    console.log('Err tooting.')
                    console.log(err)
                    reject(err)
                } else {
                    console.log('Tooted!')
                    // console.log(toot)
                    resolve(t)
                }
            })
        })
    })
}

let twitterClient;
if(process.env.DO_TWEET) {
    const Twitter = require('twitter');
    // twitterClient = new Twitter({
    //   consumer_key: process.env.TWITTER_KEY,
    //   consumer_secret: process.env.TWITTER_SECRET,
    //   bearer_token: process.env.TWITTER_TOKEN
    // });
    twitterClient = new Twitter({
      consumer_key: process.env.TWITTER_KEY,
      consumer_secret: process.env.TWITTER_SECRET,
      access_token_key: process.env.TWITTER_ACCESS_TOKEN,
      access_token_secret: process.env.TWITTER_ACCESS_SECRET
    });
}

const tweet = async (statusTxt, filename) => {
    return new Promise((resolve, reject) => {
        // Load your image
        var data = require('fs').readFileSync(filename);
        // Make post request on media endpoint. Pass file data as media parameter
        twitterClient.post('media/upload', {media: data}, function(error, media, response) {
          if (!error) {
            // If successful, a media object will be returned.
            // console.log(media);
            // Lets tweet it
            var status = {
              status: statusTxt,
              media_ids: media.media_id_string // Pass the media id string
            }
            twitterClient.post('statuses/update', status, function(error, tweet, response) {
              if (!error) {
                // console.log(tweet);
                console.log('Tweeted!')
              }
              resolve()
            });
          } else {
              console.log(error);
              reject()
          }
        });
    });
}

const fetchStats = async (region) => {
    let regionCode = region.iso2
    let url = region.state ? API_URL_STATE(regionCode) : API_URL(regionCode)
    try {
        return await got(url).json()
    } catch(e) {
        console.log('Failed to fetch stats for '+regionCode+' at '+url)
        console.log(e);
    }
}

const getMsgFromStats = function(country, stats) {
    let name = country.name
    let today = (new Date().toDateString())
    let msg = utils.getCountryCodeName(country)+' COVID-19 current stats for '+today+'\n\n'
    
    msg += 'Cases: '+stats['cases'].toLocaleString() + '\n'
    msg += 'Deaths: '+stats['deaths'].toLocaleString() + '\n'
    msg += 'Recovered: '+stats['recovered'].toLocaleString() + '\n'
    msg += 'Active: '+stats['active'].toLocaleString() + '\n'

    msg += '\n'
    msg += '#covid_'+utils.replaceAll(country.iso2.toLocaleLowerCase(), ' ', '_')
    
    return msg
}

// const renderPie = function(data) {
//     const D3Node = require('d3-node')
//     const d3 = require('d3')
//     const canvasModule = require('canvas')
//     let d3n = new D3Node({ canvasModule });
//     let canvas = d3n.createCanvas(500, 300)
//     let context = canvas.getContext('2d')
//     let width = canvas.width
//     let height = canvas.height
//     let radius = Math.min(width, height) / 2
//     // active // deaths // recovered
//     let colors = ["#000099", "#990000", "#009900"]
//     var arc = d3.arc()
//       .outerRadius(radius - 10)
//       .innerRadius(0)
//       .context(context)
//     var labelArc = d3.arc()
//       .outerRadius(radius - 40)
//       .innerRadius(radius - 40)
//       .context(context)
//     var pie = d3.pie()
//       .sort(null)
//       .value(function (d) { return d.value })
//     context.translate(width / 2, height / 2)
//     var arcs = pie(data)
//     arcs.forEach(function (d, i) {
//       context.beginPath()
//       arc(d)
//       context.fillStyle = colors[i]
//       context.fill()
//     })
//     context.beginPath()
//     arcs.forEach(arc)
//     context.strokeStyle = '#000'
//     context.stroke()
//     context.textAlign = 'center'
//     context.textBaseline = 'middle'
//     context.fillStyle = '#fff'
//     context.font = "bold 18pt Courier";
//     arcs.forEach(function (d) {
//       var c = labelArc.centroid(d)
//     //   if(d.index === 1) { // deaths
//     //       c[1] = c[1] + 30 // offset this to avoid overlap
//     //   }
//       context.fillText(d.data.name, c[0], c[1])
//     })
//     return new Promise((resolve, reject) => {
//         resolve(canvas.toDataURL());
//     })
// }
// renderPie([
//     {"name": "Active", "value": stats['active']},
//     {"name": "Deaths", "value": stats['deaths']},
//     {"name": "Recovered", "value": stats['recovered']},
// ])

const parse_state_counties = function(json) {
    // Sum up all the counties
    let newJson = {
        "cases": {},
        "deaths": {},
        "recovered": {},
    }
    
    for(let i in json) {
        let timeline = json[i].timeline;
        for(let t in timeline) {
            // t is cases, deaths, recovered
            for(let d in timeline[t]) {
                // d is date
                let v = timeline[t][d]; // number value
                
                if(!newJson[t].hasOwnProperty(d)) {
                    newJson[t][d] = v;
                } else {
                    newJson[t][d] += v;
                }
            }
        }
    }
    return newJson
}

const parseTime = d3.timeParse("%m/%d/%y")

const fetchRollingAvg = async (country, days) => {
    let countryCode = country.iso2
    let url = country.state ? API_URL_HISTORICAL_STATE(countryCode.toLocaleLowerCase(), days) : API_URL_HISTORICAL(countryCode, days)
    let data
    try {
        data = await got(url).json()
    } catch(e) {
        console.log('Failed to get historical data for '+countryCode+' via '+url)
    }
    let timeline
    if(country.state) {
        timeline = parse_state_counties(data)
    } else if(countryCode == 'all') {
        timeline = data
    } else {
        timeline = data.timeline
    }
    let keys = ['cases', 'deaths']
    let vals = {} // { "cases": [{key: Date, value: int}...], "deaths": [...]}
    let rollingAverages = {} // { "cases": [...], "deaths": [...]}
    
    keys.forEach(k => {
        if(!vals.hasOwnProperty(k)) {
            vals[k] = []
        }
        let prevVal = false
        let diffs = {}
        for(let date in timeline[k]) {
            
            let value = timeline[k][date]
            if(prevVal !== false) {
                diffs[date] = value - prevVal
                vals[k].push({
                    key: parseTime(date),
                    value: diffs[date]
                })
            }
            prevVal = value
        }
        
        if(!rollingAverages.hasOwnProperty(k)) {
            rollingAverages[k] = []
        }
        for(let i in vals[k]) {
            if(i >= ROLLING_DAYS-1) {
                let v = vals[k][i]
                let avg = v.value
                let x = 1
                while(x < ROLLING_DAYS) {
                    avg = avg + vals[k][i - x].value
                    x++
                }
                avg = avg / ROLLING_DAYS
                rollingAverages[k].push({
                    key: v.key,
                    value: avg
                })
            }
        }
    })
    
    return rollingAverages
}

const IMG_HEIGHT = 335 // 300
const IMG_WIDTH = 600 // 500

const renderLineChart = (stats, sourceName, flagUrl) => {
    let chartData = []
    chartData.allKeys = stats.deaths.map(o => o.key)
    chartData.push(stats.deaths)
    chartData.push(stats.cases)
    
    let chartTitle = sourceName+' covid <span style="color: maroon;">deaths</span> and <span style="color: steelblue;">cases</span> '+ROLLING_DAYS+'-day rolling average'
    let chartBg = flagUrl ? '<img src="'+flagUrl+'" style="position:fixed; top: 0; left: 0; opacity:0.12; min-height: 100%; min-width: 500px; width: 100%; height: auto;" />' : ''
    return new Promise((resolve, reject) => {
        output(
            "./output/chart",
            d3nLine({
                data: chartData,
                margin: { top: 10, right: 70, bottom: 55, left: 45 },
                lineWidth: 6,
                isCurve: true,
                width: IMG_WIDTH,
                height: IMG_HEIGHT,
                lineColor: '#ff0000',
                lineColors: ['maroon', 'steelblue'],
                container: `
                    <div id="container">
                        <h3 style="padding: 0 0; margin: 0 0;text-align:center;">${chartTitle}</h3>
                        ${chartBg}
                        <div id="chart"></div>
                    </div>
                `
            }),
            { 
                width: IMG_WIDTH,
                height: IMG_HEIGHT,
            },
            function(){
                resolve('./output/chart.png')
            }
        );
    })
}

const generateRegionChart = async (country, days) => {
    let stats = await fetchStats(country)
    let tootMsg = getMsgFromStats(country, stats)
    
    console.log(tootMsg)
    
    let rollingAvgStats = await fetchRollingAvg(country, days)
    let pngPath = await renderLineChart(rollingAvgStats, country.name, country.flag)
    
    if(!process.env.EXCLUDE_TOOT) {
        let t = await toot(tootMsg, pngPath)
    }
    if(process.env.DO_TWEET) {
        let t = await tweet(tootMsg, pngPath)
    }
}

const fetchCountries = async max => {
    try {
        let countries = await got(API_URL_COUNTRIES()).json()
        return countries.map(o => {
            let c = o.countryInfo
            c.name = o.country
            console.log(c)
            return c
        }).slice(0, max)
    } catch(e) {
        console.log('Failed to fetch countries')
        console.log(e);
    }
}

const fetchStates = async () => {
    try {
        let states = await got(API_URL_STATES()).json()
        return states.map(o => {
            return {
                iso2: o.state,
                name: o.state,
                state: true,
                flag: API_URL_STATE_FLAG(o.state)
            }
        }).filter(isStateIncluded)
    } catch(e) {
        console.log('Failed to fetch states')
        console.log(e);
    }
}

const isStateIncluded = (state) => {
    let s = state.iso2
    if(
        s === 'Navajo Nation'
        || s === 'Federal Prisons'
        || s === 'Veteran Affairs'
        || s === 'United States Virgin Islands'
        || s === 'Grand Princess Ship'
        || s === 'Wuhan Repatriated'
        || s === 'Diamond Princess Ship'
        || s === 'Northern Mariana Islands'
        || s === 'Guam'
        || s === 'Puerto Rico'
        || s === 'US Military'
    ) return false
    return true
}

const RUN_WORLD = !process.env.EXCLUDE_WORLD ? true : false
const RUN_COUNTRIES = !process.env.EXCLUDE_COUNTRIES ? true : false
const RUN_STATES = !process.env.EXCLUDE_STATES ? true : false

const run = async () => {
    // WORLD
    if(RUN_WORLD) {
        await generateRegionChart({iso2: 'all', flag: false, name: 'World'}, DAYS_OF_DATA)
        await utils.wait(MEDIA_WAIT_TIME)
    }
    
    // US STATES
    if(RUN_STATES) {
        let states = await fetchStates()
        for(let i in states) {
            await generateRegionChart(states[i], DAYS_OF_DATA)
            await utils.wait(MEDIA_WAIT_TIME)
        }
    }
    // await generateRegionChart({
    //     iso2: 'Arizona', flag: false, name: 'Arizona', state: true
    // }, DAYS_OF_DATA)
    
    // COUNTRIES
    if(RUN_COUNTRIES) {
        let countries = await fetchCountries(MAX_COUNTRIES)
        for(let i in countries) {
            await generateRegionChart(countries[i], DAYS_OF_DATA)
            await utils.wait(MEDIA_WAIT_TIME)
        }
    }
    // await generateRegionChart('all', DAYS_OF_DATA)
    // await generateRegionChart('US', DAYS_OF_DATA)
    
    process.exit(0)
}

run()
