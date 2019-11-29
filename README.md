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

