// d3.js line graph with dual Y axes
// https://bl.ocks.org/d3noob/e34791a32a54e015f57d

const D3Node = require('d3-node');

function line({
  data,
  selector: _selector = '#chart',
  container: _container = `
    <div id="container">
      <h2>Line Chart</h2>
      <div id="chart"></div>
    </div>
  `,
  style: _style = '',
  width: _width = 960,
  height: _height = 500,
  margin: _margin = { top: 20, right: 20, bottom: 60, left: 30 },
  lineWidth: _lineWidth = 1.5,
  lineColor: _lineColor = 'steelblue',
  lineColors: _lineColors = ['maroon', 'steelblue', 'SeaGreen'],
  isCurve: _isCurve = true,
  tickSize: _tickSize = 5,
  tickPadding: _tickPadding = 5,
} = {}) {
  const d3n = new D3Node({
    selector: _selector,
    svgStyles: _style,
    container: _container,
  });

  const d3 = d3n.d3;

  const width = _width - _margin.left - _margin.right;
  const height = _height - _margin.top - _margin.bottom;

  const svg = d3n.createSVG(_width, _height)
        // Use SVG viewbox for scaling nicely in html
        .attr('viewBox', "0 0 "+_width+" "+_height)
        .attr('width', null)
        .attr('height', null)
        
        .append('g')
        .attr('transform', `translate(${_margin.left}, ${_margin.top})`);

  const g = svg.append('g');

  const { allKeys } = data;
  
  const xScale = d3.scaleLinear()
      .domain(allKeys ? d3.extent(allKeys) : d3.extent(data, d => d.key))
      .rangeRound([0, width]);
      
  const yScale = d3.scaleLinear()
      .domain(
        d3.extent(data[0], d => d.value)
      )
      .rangeRound([height, 0]);
  const yScale2 = d3.scaleLinear()
      .domain(
        d3.extent(data[1], d => d.value)
      )
      .rangeRound([height, 0]);
      
  const yScaleDoses = d3.scaleLinear()
      .domain(
        d3.extent(data[2], d => d.value)
      )
      .rangeRound([height, 0]);
     
  const xAxis = d3.axisBottom(xScale)
        .tickSize(_tickSize)
        .tickPadding(_tickPadding)
        .tickFormat(d3.timeFormat("%m/%d"));
  const yAxis = d3.axisLeft(yScale)
        .tickSize(_tickSize)
        .tickPadding(_tickPadding);
  const yAxisRight = d3.axisRight(yScale2)
        .tickSize(_tickSize)
        .tickPadding(_tickPadding);

  const lineChart = d3.line()
    .x(d => xScale(d.key))
    .y(d => yScale(d.value));

  const lineChartTwo = d3.line()
    .x(d => xScale(d.key))
    .y(d => yScale2(d.value));
      
  const dosesChart = d3.line()
    .x(d => xScale(d.key))
    .y(d => yScaleDoses(d.value));

  if (_isCurve) lineChart.curve(d3.curveBasis);
  if (_isCurve) lineChartTwo.curve(d3.curveBasis);
  if (_isCurve) dosesChart.curve(d3.curveBasis);

  g.append('g')
    .attr('transform', `translate(0, ${height})`)
    .call(xAxis);

  g.append('g').style("color", _lineColors[0]).call(yAxis);
  g.append('g').attr("transform", "translate(" + width + " ,0)").style("color", '#4682b4').call(yAxisRight);

  g.append('g')
    .attr('fill', 'none')
    .attr('stroke-width', _lineWidth) 
    .append("path")
    .attr('stroke', "SeaGreen")
    .attr('d', dosesChart(data[2]))
    
    
  //line labels

  g.append('g')
  .classed('labels-group', true)
  .selectAll('text')
  .data(data[2])
  .enter()

  .append('text')
  .filter(function(d, i) { return i === (data[2].length - 1) })
  .classed('label',true)

  .attr("x", function(d) { return xScale(d.key); })
  .attr("y", function(d) { return yScaleDoses(d.value); })

  .attr("text-anchor", "end")
  .attr('fill', "SeaGreen")
  // .attr('style', "color: SeaGreen;")
  .attr('font-size', 10)
  .attr('font-family', "sans-serif")
  
  .text(function(d,i){
    return d3.format(".4s")(d.value);
  })
  .attr("transform", "translate(" + -15 + "," + 14 + ")") 


  g.append('g')
    .attr('fill', 'none')
    .attr('stroke-width', _lineWidth) 
    .append("path")
    .attr('stroke', _lineColors[1])
    .attr('d', lineChartTwo(data[1]))

  g.append('g')
    .attr('fill', 'none')
    .attr('stroke-width', _lineWidth)
    // .selectAll('path')
    // .data(allKeys ? data : [data])
    // .enter().append("path")
    // .attr('stroke', (d, i) => i < _lineColors.length ? _lineColors[i] : _lineColor)
    // .attr('d', lineChartTwo);
    
    // .data(data[0])
    // .enter()
    .append("path")
    .attr('stroke', _lineColors[0])
    .attr('d', lineChart(data[0]))
    
  return d3n;
}

module.exports = line;