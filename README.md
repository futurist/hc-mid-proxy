# hc-mid-proxy

[honeycomb](https://github.com/node-honeycomb) middleware for proxy request.


## Install

```
npm i -S hc-mid-proxy
```

## Usage

In your `config_default.js`, add below line:

```js
config = {
    middleware: {
        proxy: {
            enable: true,
            module: 'hc-mid-proxy',
            config: {                
                prefix: '/api/proxy/abc/',
                endpoint: 'http://backend.host:8888/abc/',
                headerExtension: [],
                api: ['*']
            }
        }
    }
}
```

Default value of `headerExtension` is `[]`, and `api` is `['*']`, when omitted.

When want to proxy many routes, using `routes` format as below:

```js
config = {
    middleware: {
        proxy: {
            enable: true,
            module: 'hc-mid-proxy',
            config: { 
                routes: [
                    {
                        prefix: '/api/proxy1',
                        endpoint: 'http://backend.host:8888',
                    },
                    {
                        prefix: '/api/proxy2',
                        endpoint: 'http://backend.host:9999',
                    },
                ]
            }
        }
    }
}
```

Notice both `prefix` and `endpoint` can omit the suffix `/`.
