# Supported Browsers

- Chrome `21+`
- ChromeAndroid `21+`
- Edge `12+`
- Explorer `11+`
- Firefox `28+`
- FirefoxAndroid `28+`
- iOS `7+`
- Opera `12.1+`
- OperaMobile `12.1+`
- QQAndroid `9.0+`
- Safari `6.1+`
- Samsung `4+`
- UCAndroid `10.7+`
- kaios `2.5+`

## Polyfills Required

Modern browsers do not require polyfills.

Older browsers will require some of the below polyfills.

The host application must include the correct polyfills based on the browsers it intends to support. Below is an exhaustive list of every `core-js@3` polyfill that would be required by this library (and its transitive dependencies) if _all_ the above browsers were to be supported.

- core-js/modules/es.symbol
- core-js/modules/es.symbol.description
- core-js/modules/es.symbol.iterator
- core-js/modules/es.symbol.to-string-tag
- core-js/modules/es.array.concat
- core-js/modules/es.array.every
- core-js/modules/es.array.filter
- core-js/modules/es.array.for-each
- core-js/modules/es.array.from
- core-js/modules/es.array.index-of
- core-js/modules/es.array.iterator
- core-js/modules/es.array.join
- core-js/modules/es.array.last-index-of
- core-js/modules/es.array.map
- core-js/modules/es.array.reduce
- core-js/modules/es.array.slice
- core-js/modules/es.array.some
- core-js/modules/es.array.splice
- core-js/modules/es.function.name
- core-js/modules/es.json.to-string-tag
- core-js/modules/es.map
- core-js/modules/es.math.to-string-tag
- core-js/modules/es.object.assign
- core-js/modules/es.object.get-own-property-descriptor
- core-js/modules/es.object.get-own-property-descriptors
- core-js/modules/es.object.get-own-property-names
- core-js/modules/es.object.get-prototype-of
- core-js/modules/es.object.keys
- core-js/modules/es.object.set-prototype-of
- core-js/modules/es.object.to-string
- core-js/modules/es.promise
- core-js/modules/es.reflect.construct
- core-js/modules/es.regexp.exec
- core-js/modules/es.regexp.to-string
- core-js/modules/es.string.ends-with
- core-js/modules/es.string.iterator
- core-js/modules/es.string.replace
- core-js/modules/es.string.split
- core-js/modules/es.string.starts-with
- core-js/modules/es.string.trim
- core-js/modules/web.dom-collections.for-each
- core-js/modules/web.dom-collections.iterator

## No Transpiling Required

All NPM modules distributed by this repository have been transpiled to a version of JS supported by all the above browsers.
