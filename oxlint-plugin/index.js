import { eslintCompatPlugin } from '@oxlint/plugins'

import paddingAroundMultilineStatements from './rules/padding-around-multiline-statements.js'

/**
 * @public
 * @see https://github.com/zoonk/zoonk/blob/main/packages/oxlint-plugin/index.js
 */
export default eslintCompatPlugin({
  meta: { name: 'oxlint-plugin' },
  rules: {
    'padding-around-multiline-statements': paddingAroundMultilineStatements,
  },
})
