# Covid-19 Stats Bot

This is a demo project that will automatically post Covid-19 stats to mastadon (toot).

[https://mastodon.cloud/@covid_stats](https://mastodon.cloud/@covid_stats)

[GitLab](https://gitlab.com/comster/covid19_stats) | [GitHub](https://github.com/comster/covid19_stats)

## 1) Automated toots

Using the code example from my [quick_toot](https://github.com/comster/quick_toot) project, we will setup automated tooting of text and an image.

- Create app
- Get token
- Test toot 
- https://mastodon.cloud/web/accounts/731776

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


## 6) Line chart showing 7 day moving average of both deaths and cases

- Parse historical data into 7 day moving average
- Render into multi-line chart for both deaths and cases
- Include dependancies for headless chrome in docker


## 7) Line chart

- 7-day rolling average
- Deaths
- Cases
- 2 y axis labels
- Color coated


## 8) Deployment docker deps

- Chrome headless docker deps
- GitLab CICD


## 9) Region / Locations

- Countries
- US State


# TODO

- [x] Chart moving average
- Local stats
- Tweet
