# vite-plugin-atomizer

Export computed variables from less / sass / css-modules automatically

## Usage

##### Install

- `npm i -D vite-plugin-atomizer`

##### Vite config

In `vite.config.js` :
```javascript
import { atomizer } from "vite-plugin-atomizer"
export default defineConfig({
	root: 'src/',
	// ...
	plugins: [
		// ...
		atomizer({
			// Files is a glob selector from config's root property
			// Will target any .module.less file into src/
			files: ['**/*.module.less']
		})
	]
})
```

##### Supported file types

- `.module.less`
- `.module.scss`
- `.module.sass`


##### Default options

```
atomizer() // files: ['**/*.module.less', '**/*.module.sass', '**/*.module.scss']
```

## How it works

File `src/atoms/breakpoints.atom.module.less`

```less
@breakpointLaptop: 230px
```

Will be transformed into

```less
@breakpointLaptop: 230px;
:export {
	breakpointLaptop: @breakpointLaptop
}
```

> You cannot see the transformation in the actual file, it's made in memory before `post-css`

So in your JS you can do something like : 

```tsx
import S from "./atoms/breakpoints.atom.module.less"

function Component () {
	const breakpointLaptop = S.breakpointLaptop
	// = "230px"
	return <div></div>
}
```

## Computed values

Values in modules that are computations, are computed before export :

```less
@minSize: 500px;
@componentSize: 200px;
@margin: 20px;
@containerSize: @minSize + @componentSize + @margin * 2;
```

```tsx
S.minSize // = "500px"
S.componentSize // = "200px"
S.margin // = "20px"
S.containerSize // = "740px"
```

> Colors are also computed even with functions like lighten()

## Root vars

Atomizer will only export root vars :
```less
@publicProperty: blue; // exported
._test {
  @_privateProperty: red; // not exported
  // Because :
  // 1. It has indentation
  // 2. It starts with an underscore
}
```

## Exports

If your css-module already have exports, it will append variables to it.

## Roadmap

[ ] Made it works with types automatically ( exports .d.ts ?, typescript plugin ? )
