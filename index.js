const fs = require('fs')
// const request = require('request');
const got = require('got');
const moment = require('moment');
const Mastodon = require('mastodon-api')

const d3 = require('d3-node')().d3;
const d3nLine = require('./d3node-linechart.js');
const output = require('./d3node-output.js');
// API 
const API_URL = "https://corona.lmao.ninja/v2/all"
const API_URL_HISTORICAL = (countryCode="US", days=90) => "https://disease.sh/v3/covid-19/historical/"+countryCode+"?lastdays="+days

const ROLLING_DAYS = 7
const DATA_START_DATE = '2020-03-01'
const DAYS_OF_DATA = moment().diff(moment(DATA_START_DATE), 'days')

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

const fetchStats = async () => 
    await got(API_URL).json()


const getMsgFromStats = function(stats) {
    let today = (new Date().toDateString())
    let msg = 'Coronavirus COVID-19 current stats for '+today+'\n\n'
                + 'World 🌐\n'
    
    msg += 'Cases: '+stats['cases'].toLocaleString() + '\n'
    msg += 'Deaths: '+stats['deaths'].toLocaleString() + '\n'
    msg += 'Recovered: '+stats['recovered'].toLocaleString() + '\n'
    msg += 'Active: '+stats['active'].toLocaleString() + '\n'
    
    return msg
}

const renderPie = function(data) {
    const D3Node = require('d3-node')
    const d3 = require('d3')
    const canvasModule = require('canvas')
    let d3n = new D3Node({ canvasModule });
    
    let canvas = d3n.createCanvas(500, 300)
    
    let context = canvas.getContext('2d')
    
    let width = canvas.width
    let height = canvas.height
    let radius = Math.min(width, height) / 2
    
    // active // deaths // recovered
    let colors = ["#000099", "#990000", "#009900"]
    
    var arc = d3.arc()
      .outerRadius(radius - 10)
      .innerRadius(0)
      .context(context)
    
    var labelArc = d3.arc()
      .outerRadius(radius - 40)
      .innerRadius(radius - 40)
      .context(context)
    
    var pie = d3.pie()
      .sort(null)
      .value(function (d) { return d.value })
        
    context.translate(width / 2, height / 2)
    
    var arcs = pie(data)
        
    arcs.forEach(function (d, i) {
      context.beginPath()
      arc(d)
      context.fillStyle = colors[i]
      context.fill()
    })
    
    context.beginPath()
    arcs.forEach(arc)
    context.strokeStyle = '#000'
    context.stroke()
    
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillStyle = '#fff'
    context.font = "bold 18pt Courier";
    
    arcs.forEach(function (d) {
      var c = labelArc.centroid(d)
    //   if(d.index === 1) { // deaths
    //       c[1] = c[1] + 30 // offset this to avoid overlap
    //   }
      context.fillText(d.data.name, c[0], c[1])
    })
    
    return new Promise((resolve, reject) => {
        resolve(canvas.toDataURL());
    })
}


const parseTime = d3.timeParse("%m/%d/%y")

const fetchRollingAvg = async (countryCode, days) => {
    let data = await got(API_URL_HISTORICAL(countryCode, days)).json()
    
    // console.log(data)
    
    let timeline = data.timeline
    let keys = ['cases', 'deaths']
    
    let vals = {} // { "cases": [{key: Date, value: int}...], "deaths": [...]}
    let rollingAverages = {} // { "cases": [...], "deaths": [...]}
    
    keys.forEach(k => {
        // console.log(k)
        // console.log(timeline[k])
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
        // console.log(vals)
        
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
        // console.log(rollingAverages)
    })
    
    return rollingAverages
}


const renderLineChart = (stats, sourceName) => {

    // console.log(stats)
    // stats = {deaths: [], cases: []}
    
    let chartData = []
    chartData.allKeys = stats.deaths.map(o => o.key)
    chartData.push(stats.deaths)
    chartData.push(stats.cases)
    // console.log(chartData)
    
    let chartTitle = sourceName+' covid <span style="color: maroon;">deaths</span> and <span style="color: steelblue;">cases</span> '+ROLLING_DAYS+'-day rolling average'
    return new Promise((resolve, reject) => {
        output(
            "./output/chart",
            d3nLine({
                data: chartData,
                margin: { top: 10, right: 70, bottom: 55, left: 45 },
                lineWidth: 6,
                isCurve: true,
                width: 500,
                height: 300,
                lineColor: '#ff0000',
                lineColors: ['maroon', 'steelblue'],
                container: `
                    <div id="container">
                        <h3 style="padding: 0 0; margin: 0 0;">${chartTitle}</h3>
                        <div id="chart"></div>
                    </div>
                `
            }),
            { 
                width: 500,
                height: 300,
            },
            function(){
                resolve('./output/chart.png')
            }
        );
    })
}

const run = async () => {
    let stats = await fetchStats()
    let tootMsg = getMsgFromStats(stats)
    // console.log(tootMsg)
    
    let rollingAvgStats = await fetchRollingAvg("US", DAYS_OF_DATA)
    let pngPath = await renderLineChart(rollingAvgStats, "US")
    console.log("PNG path: "+pngPath)
    
    let t = await toot(tootMsg, pngPath)
    // console.log('DONE!')
    // process.exit(0)
    
    // post media
    // toot
}
run()
// fetchStats().then((stats)=>{
    // let tootMsg = getMsgFromStats(stats)
    // renderPie([
    //     {"name": "Active", "value": stats['active']},
    //     {"name": "Deaths", "value": stats['deaths']},
    //     {"name": "Recovered", "value": stats['recovered']},
    // ]).then(tootMedia => {
        // toot(tootMsg, tootMedia).then(t => {
        //     console.log('DONE!')
        //     process.exit(0)
        // })
    // })
// })
