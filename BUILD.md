# Building From Source

This repository contains a hot-reloading sandbox for developing the `upload-js` NPM package.

## Prerequisites

`node` and `npm` are required — we actively support the following versions:

| Package | Version  |
| ------- | -------- |
| Node    | v12.22.0 |
| NPM     | v6.14.11 |

## Repository Structure

This repository comprises 3 packages:

- The `/` package (contains dev tooling like `prettier`).
- The `/lib` package (contains the `upload-js` library itself).
- The `/examples` package (provides a hot-reloading sandbox for developing the `upload-js` library).

## How To Build & Run

### 1. Clone

```shell
git clone git@github.com:upload-js/upload-js.git
cd upload-js
```

### 2. Install Dependencies

```shell
npm install
(cd lib && npm install)
(cd examples && npm install)
```

### 3. Run The Examples

```shell
(cd examples && npm start)
```

The above launches a **hot-reloading** server on `http://127.0.0.1:3020` that uses `upload-js` from source.

_Please ensure nothing else is running on TCP port `3020`_.
