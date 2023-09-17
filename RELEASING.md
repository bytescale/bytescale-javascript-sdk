# Releasing

To release a new version:

1.  `gco main`

2.  Set `x.y.z` into `package.json`

3.  `gcmsg 'Release x.y.z'`

4.  `gp`

The CI process will automatically `git tag` and `npm publish`.

(It does this by matching on `^Release (\S+)` commit messages on the `main` branch.)
