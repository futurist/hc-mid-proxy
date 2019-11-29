const assert = require('assert')
const proxy = require('http-proxy-middleware')
const debug = require('debug')('hc-mid-proxy')
const pathToRegexp = require('path-to-regexp')

module.exports = (app, config) => {
    let { prefix: appPrefix } = app.options
    appPrefix = appPrefix === '/' ? '' : appPrefix

    let {routes} = config
    if(!Array.isArray(routes)) {
        routes = [{...config}]
    }
    const middlewareRoutes = routes.map(config=>{
        config = {
            headerExtension: [],
            api: ['*'],
            ...config
        }
        const {prefix, endpoint, api} = config

        assert.ok(prefix && endpoint, `[hc-proxy-middleware]: route ${prefix} - both "prefix" and "endpoint" cannot be empty!`)

        const filter = function(pathname, req) {
            if(!req.path.startsWith(prefix)) {
                return
            }
            const testPath = ensureSlash(req.path.replace(prefix, ''))
            const match = getMatchedPath(api, testPath)
            // console.log('match path:', testPath, match)
            return match
        }

        const middleware = proxy(filter, {
            ws: true,
            // ignorePath: true,
            changeOrigin: true,
            pathRewrite: function (path, req) {
                const base = appPrefix + prefix
                const targetUrl = path.replace(base, '')
                return targetUrl
            },
            onProxyReq: function onProxyReq(proxyReq, req, res) {
                const headers = calculateHeaderExtension(req, config)
                Object.keys(headers).map(k => {
                    const v = headers[k]
                    if(v==null) {
                        proxyReq.removeHeader(k)
                    } else {
                        proxyReq.setHeader(k, v)
                    }
                })
                debug('Proxy:', proxyReq.method, endpoint, proxyReq.path)
                debug('Headers:', proxyReq.getHeaders())
            },
            target: endpoint
        })
        return {
            config,
            filter,
            middleware
        }
    })

    return (req, res, next) => {
        const matchedRoute = middlewareRoutes.find(({filter})=>filter(req.path, req))
        if(matchedRoute) {
            debug(matchedRoute.config.prefix, '=>', req.path)
            matchedRoute.middleware(req, res)
        } else {
            next()
        }
    }
}

function ensureSlash(pathname){
    return pathname[0] === '/' ? pathname : '/' + pathname
}

function getMatchedPath(testArray, testPath) {
    let match
    const entry = testArray.find(entry => {
      if (!entry) return
      match = pathToRegexp(entry).exec(testPath)
      return match
    })
    return entry
}

function calculateHeaderExtension(req, serviceCfg) {
    const headers = {};
    if (serviceCfg.remoteApp) {
      headers['X-Remote-App'] = serviceCfg.remoteApp;
    }
    if (serviceCfg.rid) {
      headers['EagleEye-TraceId'] = serviceCfg.rid;
    }
  
    serviceCfg.headerExtension.forEach(e => {
      // 1. 如果是函数，直接执行
      // 2. 如果是string，加载内置的模块
      // 3. 如果是object，merge到headers
      if (typeof e === 'function') {
        Object.assign(headers, e(req, serviceCfg));
      } else if (typeof e === 'string') {
        try {
          const m = require('hc-service-client/lib/extension/' + e)
          Object.assign(headers, m(req, serviceCfg));
        } catch (e) {
          serviceCfg.log.error(e);
        }
      } else if (e && typeof e === 'object') {
        Object.assign(headers, e);
      }
    });
  
    return headers;
}
