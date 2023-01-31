# Fingerprinting

## Context

Fingerprinting is the process that appends any asset( JS but also JSON, SVG, PNF, and font files …) produced with a unique hash. For instance `my-image.png` into `my-image-342b0f87ea609e6d349c7925d86bd597.png`. It also updates, in the codebase, any usage to pinpoint the renamed assets.
That way the browser knows it's a different asset from the previous version it has in the cache.

Before moving to Embroider, this mechanism was mainly implemented through 2 addons:

- [broccoli-asset-rev](https://github.com/ember-cli/broccoli-asset-rev) to fingerprint all the assets and produce an assetMap.json file

- [ember-cli-ifa](https://github.com/adopted-ember-addons/ember-cli-ifa) to create an `assetMap` tag and a helper so that the locales manager service gets the actual URL of the JSON file.

To enable tree-shaking and allow different packagers to work with it, Embroider won’t be supporting the `broccoli-asset-rev` mechanism
([as explained in the RFC](https://github.com/emberjs/rfcs/blob/asset-importing-spec/text/0763-asset-importing-spec.md#motivation)).

More practically, the `assetMap.json` file is not produced and non-JS/CSS assets are not pushed to Webpack nor fingerprinted.

In short, we need to find a new way to get our assets fingerprinted.

## JSON Assets

One common case for JSON assets is translations. As opposed to images, it is essential to make sure visitors gets the latest version of it and it is often subject to updates between releases.

For Ember, typically, we would fetch them based on the current locale and inject them to `ember-intl` service[See this example](https://ember-intl.github.io/ember-intl/docs/guide/asynchronously-loading-translations).

Translations JSON files can be treated as regular JS modules. Thanks to [Ember-auto-import](https://github.com/ef4/ember-auto-import), we're now capable to import them dynamically.

```diff
-import ENV from 'my-app/config/environment';
-
-let translationPath = `translations/${lang}.json`;
-
-if (ENV.environment === 'production') {
-  const response = await fetch('/assets/assetMap.json');
-  const assetMap = await response.json();
-
-  translationPath = assetMap.assets[translationPath];
-}
-
-const response = await fetch(`/${translationPath}`);
-const translations = await response.json();

+ const translations = await import(`translations/${lang}.json`);
```

ESmodule are a bit bigger but that's negligible considering the size of translation files.

## Assets loaded from the template

Ideally, we'd like to reuse the same principle and "import" our asset so that Webpack knows this asset belongs to the bundle and that it gets fingerprinted.
A first approach would be to do it from the component :

```js
//hero/component.js
import Component from '@glimmer/component';
import heroUrl from '../images/hero.png';
export default class HeroComponent extends Component {
  heroUrl = heroUrl;
}
```

```diff
/// hero/template.hbs
 <img
-    src="/images/hero.png"
+    src={{this.heroUrl}}
    />
```

That works, given that assetModules are defined so that Webpack knows how to handle images. Also we've moved under the `app/` folder to not mix it up with `public` folder assets.

Though, we must improve the solution so we can template-only components and ease the migration.

Using [importSync](https://github.com/embroider-build/embroider/tree/aa97453277272f533c97db174f6d4b1851e77f9d/packages/macros#importsync), we can create a helper dedicated to handling imports and avoid tackling the async import.

```jsx
// app/helpers/import-asset.js
import { helper } from '@ember/component/helper';

import { importSync } from '@embroider/macros';

export function importAsset([asset]) {
  return importSync(`/static/${asset}`).default;
}

export default helper(importAsset);
```

```diff
/// hero/template.hbs
 <img
-    src="/images/hero.png"
+   src={{import-asset "/images/hero.png"}}
    />
```

### Assets imported from CSS

We'd like also to be capable of fingerprinting fonts and background images from the CSS :

```css
.foo {
  background-image: url('../static/icon/bar.svg');
}
```

[Embroider's webpack configuration](https://github.com/embroider-build/embroider/blob/main/packages/webpack/src/ember-webpack.ts#L576-L584) already setups some configuration for `css-loader`. Though it resolve only the URL but does not do the import
