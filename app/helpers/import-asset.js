import { helper } from '@ember/component/helper';

import { importSync } from '@embroider/macros';

export function importAsset([asset]) {
  return importSync(`/static/${asset.replace(/^\//, '')}`).default;
}

export default helper(importAsset);
