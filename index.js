const fs = require('fs')
const _ = require('lodash')
const got = require('got')
const moment = require('moment')
const Mastodon = require('mastodon-api')
const cheerio = require('cheerio')

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
const API_URL_COUNTRY_DOSES = (countryCode="US", days="all") => 
    countryCode == 'all'
    ? "https://disease.sh/v3/covid-19/vaccine/coverage?lastdays="+days
    : "https://disease.sh/v3/covid-19/vaccine/coverage/countries/"+countryCode+"?lastdays="+days
// const API_URL_STATE_DOSES = (state, days="all") => "http://127.0.0.1:3000/v3/covid-19/vaccine/coverage/states/"+state+"?lastdays="+days
const API_URL_STATE_DOSES = (state, days="all") => "https://disease.sh/v3/covid-19/vaccine/coverage/states/"+state+"?lastdays="+days
// const API_URL_GLOBAL_DOSES = (days="all") => "https://disease.sh/v3/covid-19/vaccine/coverage?lastdays=all"

const ROLLING_DAYS = 7
const DATA_START_DATE = process.env.DATA_START_DATE || '2020-03-01'
const DAYS_OF_DATA = moment().diff(moment(DATA_START_DATE), 'days')
const MAX_COUNTRIES = process.env.DO_STATIC ? 9999 : process.env.MAX_COUNTRIES || 52
const MEDIA_WAIT_TIME = process.env.DO_STATIC ? 1100 : process.env.MEDIA_WAIT_TIME || 60 * 1000
const DO_MASTODON_REPLY = true

const ELEVENTY_DIR = "static"
const STATIC_SITE_DOMAIN = "covid.yanoagenda.com"
const STATIC_SITE_URL = "https://"+STATIC_SITE_DOMAIN+"/"
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID
const S3_ACCESS_KEY_SECRET = process.env.S3_ACCESS_KEY_SECRET

let mastodon_api = false
let mastodon_lists = []

const getMastodonApi = () => {
    if(!mastodon_api) {
        mastodon_api = new Mastodon({
          access_token: process.env.MASTADON_ACCESS_TOKEN,
          api_url: process.env.MASTADON_API_URL
        })
    }
    return mastodon_api
}

const getMastodonLists = () => {
    let M = getMastodonApi()
    return new Promise((resolve, reject) => {
        if(mastodon_lists.length !== 0) {
            resolve(mastodon_lists)
            return;
        }
        M.get('lists', function(err, data, response){
            // console.log('get lists...')
            // console.log(err)
            // console.log(data)
            mastodon_lists = data
            resolve(mastodon_lists)
        })
    })
}

const makeMastodonListName = (listName) => {
    let M = getMastodonApi()
    return new Promise((resolve, reject) => {
        M.post('lists', {
            title: listName
        }, function(err, data, response){
            resolve(data);
        })
    })
}

const getMastodonListByName = (listName, make) => {
    return new Promise((resolve, reject) => {
        getMastodonLists().then(()=>{
            let listWithName = _.find(mastodon_lists, { 'title': listName });
            if(listWithName) {
                resolve(listWithName)
            } else if(make) {
                // make list and return it
                makeMastodonListName(listName).then(listWithName => {
                    // mastodon_lists = []
                    mastodon_lists.push(listWithName)
                    resolve(listWithName)
                })
            } else {
                resolve(false)
            }
        })
    })
}

const getMastodonListUsers = list => {
    // TODO max 40 users
    let M = getMastodonApi()
    return new Promise((resolve, reject) => {
        M.get('lists/'+list.id+'/accounts', function(err, data, response){
            // console.log('get list accounts...')
            // console.log(err)
            // console.log(data)
            if(err) {
                resolve([]);
            } else {
                resolve(data)
            }
        })
    })
}

const getSubscribedUsers = async (country) => {
    // country.iso2
    let hashedCountry = getHashFriendlyStr(country.iso2)
    let users = [] // users with @
    return new Promise(async (resolve, reject) => {
        
        // Get from list by the name of 
        getMastodonListByName(hashedCountry).then(list => {
            if(list) {
                
                getMastodonListUsers(list).then(users => {
                    resolve(users)
                })
                
            } else {
                resolve(users)
            }
        })
    })
}

const addUserToMastodonList = async (user_id, list_id) => {
    // 
    let M = getMastodonApi()
    return new Promise(async (resolve, reject) => {
        M.post('lists/'+list_id+'/accounts', {account_ids: [ user_id ]}, function(err, data, response){
            console.log('added user to list '+list_id)
            // console.log(err)
            // console.log(data)
            resolve(data)
        })
    });
}

const removeUserToMastodonList = async (user_id, list_id) => {
    // 
    let M = getMastodonApi()
    return new Promise(async (resolve, reject) => {
        M.delete('lists/'+list_id+'/accounts', {account_ids: [ user_id ]}, function(err, data, response){
            console.log('removed user from list '+list_id)
            // console.log(err)
            // console.log(data)
            resolve(data)
        })
    });
}

const parseTootForText = function(content) {
    // console.log('parseTootForText', content)
    
    let $ = cheerio.load(content);
    
    let text = $.text()
    
    console.log(text)
    
    // let i = text.indexOf('@'+TOOTER_HANDLE+' ')
    
    // if(i !== -1) {
    //     text = text.substr(i);
    //     text = text.replace('@'+TOOTER_HANDLE, '').trim();
    // }
    
    return text;
}

const subscribeMastodonUserToRegion = async (account, regionCode) => {
    return new Promise(async (resolve, reject) => {
        let list = await getMastodonListByName(regionCode, true);
        // console.log(account);
        // console.log(list);
        await followMastodonAccount(account.id);
        await addUserToMastodonList(account.id, list.id);
        resolve()
    })
}

const unsubscribeMastodonUserToRegion = async (account, regionCode) => {
    return new Promise(async (resolve, reject) => {
        let list = await getMastodonListByName(regionCode);
        // console.log(account);
        // console.log(list);
        // await followMastodonAccount(account.id);
        await removeUserToMastodonList(account.id, list.id);
        resolve()
    })
}

const getRegionFromMastodonToot = async (in_reply_to_id) => {
    let M = getMastodonApi()
    return new Promise((resolve, reject) => {
        console.log("Get status "+in_reply_to_id)
        M.get('statuses/'+in_reply_to_id, function(err, data, response){
            // console.log('status...')
            // console.log(err)
            // console.log(data)
            
            if(err) {
                resolve(false);
                return;
            }
            
            let statusMsg = parseTootForText(data.content);
            let i =statusMsg.indexOf('#covid_');
            if(i !== -1) {
                let hashRegion = statusMsg.substr(i);
                // console.log('hashRegion')
                // console.log(hashRegion)
                hashRegion = hashRegion.substr(7, hashRegion.indexOf('https')-7);
                console.log(hashRegion)
                resolve(hashRegion)
            } else {
                resolve(false)
            }
        })
    })
}

const handleNotification = async (notification) => {
    return new Promise(async (resolve, reject) => {
        // console.log('handle notification')
        // console.log(notification)
        
        if(notification.type === 'mention') {
            let account = notification.account;
            let statusMsg = notification.status.content;
            let in_reply_to_id = notification.status.in_reply_to_id;
            
            statusMsg = parseTootForText(statusMsg);
            if(statusMsg.indexOf('unsub') !== -1) {
                console.log("USER WANTS TO UNSUBSCRIBE")
                console.log(account)
                console.log(in_reply_to_id)
                let regionCode = await getRegionFromMastodonToot(in_reply_to_id);
                if(regionCode) {
                    console.log('unsubscribeMastodonUserToRegion '+regionCode);
                    
                    await unsubscribeMastodonUserToRegion(account, regionCode);
                    resolve()
                } else {
                    console.log('missing region from replied to toot');
                }
            } else if(statusMsg.indexOf('sub') !== -1) {
                // Add this use to the list for the region name
                console.log("USER WANTS TO SUBSCRIBE")
                console.log(account)
                // console.log(in_reply_to_id)
                let regionCode = await getRegionFromMastodonToot(in_reply_to_id);
                if(regionCode) {
                    console.log('subscribeMastodonUserToRegion '+regionCode);
                    
                    await subscribeMastodonUserToRegion(account, regionCode);
                    resolve()
                } else {
                    console.log('missing region from replied to toot');
                }
            } else {
                resolve()
            }
        } else {
            resolve()
        }
    });
}

const getMastodonNotifications = async () => {
    let M = getMastodonApi()
    return new Promise((resolve, reject) => {
        M.get('notifications', {
            limit: 40,
            exclude_types: ['follow', 'favourite', 'reblog', 'poll', 'follow_request'] // mention // only get mentions
        }, async function(err, data, response){
            // console.log('notifications...')
            // console.log(err)
            // console.log(data)
            
            for(let d in data) {
                let notification = data[d];
                await handleNotification(notification);
            }
            
            resolve(data)
        })
    })
}

const followMastodonAccount = async (account_id) => {
    let M = getMastodonApi()
    return new Promise(async (resolve, reject) => {
        M.post('accounts/'+account_id+'/follow', function(err, data, response){
            // console.log('follow...')
            // console.log(err)
            // console.log(data)
            resolve(data)
        })
    })
}

const tootMedia = function(file) {
    let M = getMastodonApi()
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

const toot = function(status, media, country) {
    let M = getMastodonApi()
    return new Promise((resolve, reject) => {
        getSubscribedUsers(country).then(users => {
            tootMedia(media).then(media_id => {
                
                // TODO if this makes the toot too long, split it up
                console.log('users')
                console.log(users)
                if(users && users.length > 0) {
                    status = status + '\n\n'
                    status = status + _.map(users, function(user){
                        return '@'+user.acct;
                    }).join(' ');
                }
                
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

const fetchDoses = async (region) => {
    let regionCode = region.iso2
    if(region.state) {
        let url = API_URL_STATE_DOSES(regionCode);
        try {
            let json = await got(url).json()
            if(json.hasOwnProperty('timeline')) {
                json = json.timeline;
            }
            return json;
        } catch(e) {
            console.log('Failed to fetch state doses stats for '+regionCode+' at '+url)
            // console.log(e);
        }
        return false;
    }
    let url = API_URL_COUNTRY_DOSES(regionCode)
    try {
        let json = await got(url).json()
        if(json.hasOwnProperty('timeline')) {
            json = json.timeline
        }
        return json
    } catch(e) {
        console.log('Failed to fetch doses stats for '+regionCode+' at '+url)
        // console.log(e);
    }
}

const getHashFriendlyStr = countryIso2 => utils.replaceAll(countryIso2.toLocaleLowerCase(), ' ', '_');

const getMsgFromStats = function(country, stats, exclude_tag, doseStats) {
    // let name = country.name
    let today = (new Date().toDateString())
    let msg = ''
    
    if(!exclude_tag) {
        msg += utils.getCountryCodeName(country) + ' COVID-19 current stats for ' + today + '\n\n'
    }
    
    msg += 'Cases: '+stats['cases'].toLocaleString() + '\n'
    msg += 'Deaths: '+stats['deaths'].toLocaleString() + '\n'
    msg += 'Recovered: '+stats['recovered'].toLocaleString() + '\n'
    msg += 'Active: '+stats['active'].toLocaleString() + '\n'
    msg += 'Tests: '+stats['tests'].toLocaleString() + '\n'
    
    if(doseStats && doseStats.length > 0) {
        // console.log(doseStats)
        msg += 'Doses: '+doseStats[doseStats.length - 1].value.toLocaleString() + '\n'
    }

    if(!exclude_tag) {
        msg += '\n'
        msg += '#covid_'+getHashFriendlyStr(country.iso2)
        
        // Add link to static site
        msg += '\n'
        msg += STATIC_SITE_URL+(country.state ? 'states' : 'countries')+'/'+encodeURIComponent(country.iso2)
    }
    
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
        return false; // No data found!
    }
    let timeline
    if(country.state) {
        timeline = parse_state_counties(data)
    } else if(countryCode == 'all') {
        timeline = data
    } else {
        if(!data || !data.timeline) {
            console.log('Data not found for '+url)
            return false; // No data found!
        }
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

const IMG_HEIGHT = process.env.DO_STATIC ? 335*2 : 335 // 300
const IMG_WIDTH = process.env.DO_STATIC ? 600*2 : 600 // 500

const getChartTitle = (sourceName, dosesStats) => sourceName+' covid '+
    ((dosesStats.length > 0) ? '<span style="color: seagreen;">doses</span>, ' : '') +
    '<span style="color: maroon;">deaths</span>, <span style="color: steelblue;">cases</span> '+ROLLING_DAYS+'-day rolling average'
const getFlagImg = (flagUrl) => '<img class="flag-img" src="'+flagUrl+'" style="position:fixed; top: 0; left: 0; opacity:0.12; min-height: 100%; min-width: 500px; width: 100%; height: auto;" />'

const getChartMargin = () => {
    if(process.env.DO_STATIC) {
        return { top: 10, right: 120, bottom: 55, left: 120 }
    }
    return { top: 10, right: 70, bottom: 55, left: 45 }
}

const renderLineChart = (stats, sourceName, flagUrl, dosesStats) => {
    let chartData = []
    chartData.allKeys = stats.deaths.map(o => o.key)
    chartData.push(stats.deaths)
    chartData.push(stats.cases)
    chartData.push(dosesStats)
    
    // console.log(chartData)
    
    let chartTitle = getChartTitle(sourceName, dosesStats)
    let chartBg = flagUrl ? getFlagImg(flagUrl) : ''
    return new Promise((resolve, reject) => {
        output(
            "./output/chart",
            d3nLine({
                data: chartData,
                margin: getChartMargin(),
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

const writeStatic = async (country, stats, pngPath, tootMsg, doseStats) => {
    // console.log('Write static file as md')
    // console.log(country)
    // console.log(stats)
    let region_bucket = country.state ? 'states' : 'countries'
    // Move pngPath to ./static/img
    let static_img_path = 'img/'+country.iso2+'.png'
    
    fs.renameSync(pngPath, './static/'+static_img_path)
    
    let svg_txt = fs.readFileSync(pngPath.replace('.png', '.svg'))
    
    let chart_title = getChartTitle(country.name, doseStats)
    
    let date = moment().format('YYYY-MM-DD')
    
    let dosesGiven = '';
    if(doseStats && doseStats.length > 0) {
        dosesGiven = doseStats[doseStats.length - 1].value.toLocaleString()
    }
    
    let mdContents = `---
title: ${utils.getCountryCodeName(country)}
date: ${date}
stats_cases: ${stats.cases}
stats_today_cases: ${stats.todayCases}
stats_deaths: ${stats.deaths}
stats_today_deaths: ${stats.todayDeaths}
stats_recovered: ${stats.recovered}
stats_active: ${stats.active}
stats_cases_per_one_million: ${stats.casesPerOneMillion}
stats_deaths_per_one_million: ${stats.deathsPerOneMillion}
stats_tests: ${stats.tests}
stats_tests_per_one_million: ${stats.testsPerOneMillion}
stats_population: ${stats.population}
stats_doses: ${dosesGiven}
image: ${static_img_path}
layout: layouts/post.njk
---

<h4 style="text-align: center;">${chart_title}</h4>

<div class="chart-container">
${getFlagImg(country.flag)}
${svg_txt}
</div>
`
// ![Chart](/${static_img_path})

    fs.writeFileSync('./static/'+region_bucket+'/'+country.iso2+'.md', mdContents);
}

const generateRegionChart = async (country, days) => {
    console.log('Region: '+country.iso2)
    let stats = await fetchStats(country)
    if(stats) {
        let doseData = await fetchDoses(country)
        let doseStats = []
        if(doseData) {
            for(var d in doseData) {
                doseStats.push({
                    key: new Date(d),
                    value: doseData[d],
                });
            }
        }
        
        // console.log(doseStats)
        let tootMsg = getMsgFromStats(country, stats, process.env.DO_STATIC, doseStats)
        console.log(tootMsg)
        let rollingAvgStats = await fetchRollingAvg(country, days)
        
        if(rollingAvgStats) {
            let pngPath = await renderLineChart(rollingAvgStats, country.name, country.flag, doseStats)
            console.log("PNG PATH: "+pngPath)
            if(process.env.DO_STATIC) {
                let s = await writeStatic(country, stats, pngPath, tootMsg, doseStats)
            } else {
                if(!process.env.EXCLUDE_TOOT) {
                    let t = await toot(tootMsg, pngPath, country)
                }
                if(process.env.DO_TWEET) {
                    let t = await tweet(tootMsg, pngPath)
                }
            }
        } else {
            // no data found
        }
    } else {
        // failed to get stats
    }
}

const fetchCountries = async max => {
    try {
        let countries = await got(API_URL_COUNTRIES()).json()
        return countries.map(o => {
            let c = o.countryInfo
            c.name = o.country
            // console.log(c)
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
        || s === 'American Samoa'
    ) return false
    return true
}

const deploy_static_site = () => {
    return new Promise((resolve, reject) => {
        const { exec } = require("child_process");
        exec("npm run build", {"cwd": ELEVENTY_DIR}, (error, stdout, stderr) => {
            if (error) {
                console.log(`error: ${error.message}`);
                // return;
            }
            if (stderr) {
                console.log(`stderr: ${stderr}`);
                // return;
            }
            console.log(`stdout: ${stdout}`);
            
            exec("aws s3 sync ./"+ELEVENTY_DIR+"/_site s3://"+STATIC_SITE_DOMAIN+"/", {
                // "cwd": ELEVENTY_DIR,
                "env": {
                    "AWS_ACCESS_KEY_ID": S3_ACCESS_KEY_ID,
                    "AWS_SECRET_ACCESS_KEY": S3_ACCESS_KEY_SECRET,
                    "AWS_DEFAULT_REGION": "us-west-2"
                }
            }, (error, stdout, stderr) => {
                if (error) {
                    console.log(`error: ${error.message}`);
                    // return;
                }
                if (stderr) {
                    console.log(`stderr: ${stderr}`);
                    // return;
                }
                console.log(`stdout: ${stdout}`);
            
                console.log('Done publishing site.')
                
                // Sync to S3
                resolve()
            });
        });
    });
}

const RUN_WORLD = !process.env.EXCLUDE_WORLD ? true : false
const RUN_COUNTRIES = !process.env.EXCLUDE_COUNTRIES ? true : false
const RUN_STATES = !process.env.EXCLUDE_STATES ? true : false

const run = async () => {
    if(!process.env.EXCLUDE_TOOT && !process.env.DO_STATIC) {
        if(DO_MASTODON_REPLY) {
            getMastodonNotifications();
        }
    }
    
    // WORLD
    if(RUN_WORLD) {
        await generateRegionChart({iso2: 'all', flag: 'https://upload.wikimedia.org/wikipedia/commons/6/60/Earth_from_Space.jpg', name: 'World'}, DAYS_OF_DATA)
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
    
    if(process.env.DO_STATIC) {
        await deploy_static_site()
    }
    
    process.exit(0)
}

run();
// generateRegionChart({iso2: 'all', flag: 'https://upload.wikimedia.org/wikipedia/commons/6/60/Earth_from_Space.jpg', name: 'World'}, DAYS_OF_DATA).then(()=>{
//  process.exit(0)
// })

// getMastodonNotifications();
// getSubscribedUsers({iso2: 'asb'})
// getRegionFromMastodonToot("105888743075751916").then(()=>{
// })

// fetchStates().then(async states => {
// for(let i in states) {
//     console.log(states[i])
//     if(states[i].iso2 === 'Washington' || states[i].iso2 === 'Oregon') {
//         await generateRegionChart(states[i], DAYS_OF_DATA)
//         await utils.wait(MEDIA_WAIT_TIME)
//     }
// }
// })