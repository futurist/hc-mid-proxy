const _ = require('lodash')
const url = require('url')
const assert = require('assert')
const proxy = require('http-proxy-middleware')
const debug = require('debug')('hc-mid-proxy')
const pathToRegexp = require('path-to-regexp')

/**
 * NOTICE: this middleware should be placed BEFORE body-parser
 * SEE: https://github.com/chimurai/http-proxy-middleware/issues/40
 */

module.exports = (app, config) => {
    let { prefix: appPrefix } = app.options
    appPrefix = appPrefix === '/' ? '' : appPrefix

    let {routes, init} = config
    const middlewareRoutes = _.map(routes, config=>{
        config = {
            _debugMode: false,
            headerExtension: [],
            api: [],
            ...config
        }
        const {prefix, endpoint, api, proxyOptions} = config

        assert.ok(prefix && endpoint, `[hc-mid-proxy]: route ${prefix} - both "prefix" and "endpoint" cannot be empty!`)

        const filter = config.filter || function(path, req) {
            const {pathname} = url.parse(req.url)
            if(!pathname.startsWith(prefix)) {
                return
            }
            const testPath = ensureSlash(pathname.replace(prefix, ''))
            try {
                const match = getMatchedPath(api, req, testPath, config)
                // console.log('match path:', testPath, match)
                return match
            } catch(e) {
                console.log('[hc-mid-proxy]match path error: ', e)
            }
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
            target: endpoint,
            ...proxyOptions
        })
        return {
            config,
            filter,
            middleware
        }
    })

    if(init) {
        init(middlewareRoutes, config)
    }

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

function getMatchedPath(testArray, req, testPath, config) {
    let match
    const entry = testArray.find(entry => {
      if (!entry) return
      if(_.isObject(entry)) {
          entry = entry.path
      }
      match = pathToRegexp(entry).exec(testPath)
      return match
    })
    if(_.isObject(entry)) {
        let {method = '*', onRequest} = entry
        if(typeof method === 'string') {
            method = method.split(/\s*\|\s*/)
        }
        const allowMethods = [].concat(method).map(v => String(v).toLowerCase())
        const allowAllMethods = config._debugMode && allowMethods.indexOf('*') > 0
        if(allowAllMethods) {
            console.warn(`WARNING: _debugMode enabled for ${config.prefix}!\nShould be removed in production!`)
        }
        if(!allowAllMethods && allowMethods.indexOf(req.method.toLowerCase()) < 0) {
            return
        }
        onRequest && onRequest(req)
    }
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
