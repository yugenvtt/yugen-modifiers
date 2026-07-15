/**
 * @file src/index.ts
 * entry point for the yugen-modifiers module.
 **/

import { init_hook } from './hooks/init.js';

/** initialize the module hooks **/
init_hook( );

/** export the configuration class for external sheet or macro access **/
export { EquipConfig } from './module/equip-config.js';
