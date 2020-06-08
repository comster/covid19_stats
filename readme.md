# Covid-19 Stats Bot

This is a demo project that will automatically post Covid-19 stats to mastadon (toot).

## 1) Automated toots

Using the code example from my [quick_toot](https://github.com/comster/quick_toot) project, we will setup automated tooting of text and an image.

- Create app
- Get token
- Test toot 


## 2) Create our node.js project

- Create index.js
- Create package.json


## 3) Fetch Covid stats

From [this API](https://corona.lmao.ninja/), we will grab the latest coronoa stats.

- Global: https://corona.lmao.ninja/v2/all
- United States: https://corona.lmao.ninja/v2/countries/us
- Format data into text to toot


## 4) Render a Pie Chart

Using the stats fetched, let's create a pie chart using D3, rendered using canvas

- https://observablehq.com/@d3/pie-chart
- https://github.com/d3-node/d3-node/blob/1864fef68877168a400f99115a8086e8601121a4/examples/pie-canvas.js


## 5) Schedule to run every day with GitLab

Using gitlab CI/CD, let's schedule this to run every day for our [project](https://gitlab.com/comster/covid19_stats)

- Create .gitignore
- Create Dockerfile
- Create .gitlab-ci.yml
- Git Push
- Setup schedule


## 6) TODO

- Local stats
- Tweet
- Show rate of change (day over day)
- Chart moving average?