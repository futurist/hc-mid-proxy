# hc-mid-proxy

[honeycomb](https://github.com/node-honeycomb) middleware for proxy request.


## Install

```
npm i -S hc-mid-proxy
```

## Usage

**NOTICE**: this middleware should be placed BEFORE body-parser

**SEE**: https://github.com/chimurai/http-proxy-middleware/issues/40

In your `config_default.js`, add below line:

```js
config = {
    middleware: {
        bodyParser: {
            deps: 'proxy'
        },
        proxy: {
            enable: true,
            module: 'hc-mid-proxy',
            config: {                
                prefix: '/api/proxy/abc/',
                endpoint: 'http://backend.host:8888/abc/',
                headerExtension: [],
                api: ['/abc']
            }
        }
    }
}
```

Default value of `headerExtension` is `[]`, and `api` is `[]`, when omitted.

When want to proxy many routes, using `routes` format as below:

```js
config = {
    middleware: {
        proxy: {
            enable: true,
            module: 'hc-mid-proxy',
            config: { 
                routes: {
                    proxy1: {
                        prefix: '/api/proxy1',
                        endpoint: 'http://backend.host:8888',
                        api: [
                            '/abc'
                        ]
                    },
                    proxy2: {
                        prefix: '/api/proxy2',
                        endpoint: 'http://backend.host:9999',
                        api: [
                            '/abc'
                        ]
                    },
                }
            }
        }
    }
}
```

Notice both `prefix` and `endpoint` can omit the suffix `/`.

The `api: []` can include below format:

```js
{
    path: '/abc',
    method: 'get|post',
    onRequest: req=>{
        // Throw error when validate failed
        throw 'Validate failed'
    }
}
```

