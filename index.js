const fs = require('fs')

const Mastodon = require('mastodon-api')

const M = new Mastodon({
  access_token: process.env.MASTADON_ACCESS_TOKEN,
  api_url: process.env.MASTADON_API_URL
})

const tootMedia = function(file) {
    return new Promise((resolve, reject) => {
        if(file) {
            M.post('media', { file: file }).then(resp => {
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

const API_URL = "https://corona.lmao.ninja/v2/all"

const request = require('request');

const fetchStats = function() {
    return new Promise((resolve, reject) => {
        request.get(API_URL, function (error, response, body) {
          console.error('error:', error); // Print the error if one occurred
          console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
          console.log('body:', body); // Print the HTML for the page.
          
          let jsonData = JSON.parse(body)
          console.log(jsonData)
          
          if(error) {
              reject()
          } else {
            resolve(jsonData)
          }
        })
    })
}

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

fetchStats().then((stats)=>{
    let tootMsg = getMsgFromStats(stats)
    renderPie([
        {"name": "Active", "value": stats['active']},
        {"name": "Deaths", "value": stats['deaths']},
        {"name": "Recovered", "value": stats['recovered']},
    ]).then(tootMedia => {
        toot(tootMsg, tootMedia).then(t => {
            console.log('DONE!')
            process.exit(0)
        })
    })
})

// toot(
//     "TOOT TEST!"
// ).then(t => {
//     process.exit(0)
// })