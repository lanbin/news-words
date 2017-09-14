const request = require('request'),
  cheerio = require('cheerio'),
  iconv = require('iconv-lite'),
  fs = require('fs'),
  conf = require('./conf.js'),
  headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.65 Safari/537.36'
  }

var MAX_DEPATH = 200,
  current_depth = 0,
  prefix = conf.prefix,
  urlStart = conf.newsURL,
  urlMaps = {},
  wordMaps = {},
  st = Date.now()

function getPureURL($el) {
  return $el.attr('href').replace(/#(.*)/, '')
}

function getPage(_url, current_depth) {
  // 判断是否完成搜索
  if (current_depth >= MAX_DEPATH) {
    var wordSort = [],
    urlMapsLen = 0
    for(var key in wordMaps) {
      wordSort.push([key, wordMaps[key]])
    }
    for(var k in urlMaps) {
      ++urlMapsLen
    }

    wordSort.sort(function(pre, next){
      return next[1] - pre[1]
    })

    fs.writeFile('wordResult.json', JSON.stringify(wordSort), function(err) {
      console.log('wordResult.json write ' + (err ? 'fail' : 'success'))
    })
    fs.writeFile('urlResult.json', JSON.stringify(urlMaps, null, 4), function(err) {
      console.log('urlResult.json write ' + (err ? 'fail' : 'success'))
    })

    console.log('探索了', urlMapsLen , '个页面，','总共耗时：', Date.now() - st, 'ms')
    return
  }

  // 开始请求
  request({
    url: _url,
    encoding: null,
    headers: headers
  }, function(err, res, body) {
    // 输出当前搜索的页面
    console.log('Analyzing: ', _url)
      // 错误判断
    if (err) {
      console.log(_url, ' has no body!')
      return
    }
    // 解析返回的html
    var $ = cheerio.load(iconv.decode(body, 'gb2312'), {
        decodeEntities: false
      }),
      textarea = $("#endText"),
      realContent = textarea.text().replace(/^[\s|\\n|\\r]+/g, ''),
      realContentLen = realContent.length

    // 记录字的出现次数
    for (var index = 0; index < realContentLen; index++) {
      var char = realContent[index]
      if (char.match(/\s/)) {
        continue;
      }
      wordMaps[char] = (~~wordMaps[char]) + 1
    }

    // 分析下一个链接
    var aTags = $('a')
    if (aTags && aTags.length) {
      var urlIndex = 0,
        isNewsUrl = true
        // 是新闻url
      while (urlIndex < aTags.length) {
        var someOne = $(aTags[urlIndex]) || null,
          someUrl = someOne ? someOne.attr('href') : ''

        if ((someOne && typeof someUrl != 'string') ||
          someUrl.indexOf(prefix) < 0 ||
          urlMaps[getPureURL(someOne)]) {
          ++urlIndex
          continue
        } else {
          break
        }
      }

      // 如果当前页面有符合要求的url时
      if (urlIndex < aTags.length) {
        var url = getPureURL($(aTags[urlIndex]))
        if (url) {
          urlMaps[url] = (~~urlMaps[url]) + 1
          getPage(url, current_depth + 1)
        }
      } else {
        console.log('No news link in this page!')
        getPage(url, MAX_DEPATH)
      }
    }
  })
}


console.log(' ---- What is the most frequent word appears!  ---- \n')
getPage(urlStart, current_depth)