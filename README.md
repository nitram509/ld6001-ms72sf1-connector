# ld6001-ms72sf1-connector

compatible and tested with
* ld6001a
* ms72sf1

## Usage

The connector is a web application, which requires a modern web browser to be used.
Also, you need to run a web server. You can use Python's built-in web server within this repository's root folder:
```shell
# requires Python 3.x
python -m http.server 8000
```
Then you can access the web application by opening http://localhost:8000/index.html

## Development hints

### Run tests

```shell
node test-ld6001-connector.js
```

### Minify Javascript files

```shell
esbuild --minify --loader=js < index.js > index.min.js 
esbuild --minify --loader=js < ld6001a-parser.js > ld6001-parser.min.js 
esbuild --minify --loader=js < ringbuffer.js > ld6001-ringbuffer.min.js 
```
