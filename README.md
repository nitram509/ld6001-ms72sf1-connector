# ld6001-ms72sf1-connector

compatible and tested with
* ld6001a
* ms72sf1

## How to run tool?

The connector is web applicaton, which requires modern web browser.
Also, you need to run a web server. You can use Python's built-in web server.
```shell
# requires Python 3.x
python -m http.server 8000
```
Then you can access the web application by opening http://localhost:8000/index.html

## Minify Javascript files

```shell
esbuild --minify --loader=js < index.js > index.min.js 
esbuild --minify --loader=js < ld6001-parser.js > ld6001-parser.min.js 
esbuild --minify --loader=js < ld6001-ringbuffer.js > ld6001-ringbuffer.min.js 
```
