/**
 * @file src/hooks/init.ts
 * registers settings and initializes the module.
 **/

import { RollParser } from '../module/roll-parser.js';

export const init_hook = ( ) => 
{
	/** initialize the module **/
	Hooks.once( 'init', async ( ) => 
	{
		register_settings( );
		RollParser.activate_listeners( );
	} );
};

const register_settings = ( ) => 
{
	/** register setting for debug logging **/
	( game as any ).settings.register( 'yugen-modifiers', 'debug-mode', 
	{
		name: 'yugen-modifiers.settings.debug-mode.name',
		hint: 'yugen-modifiers.settings.debug-mode.hint',
		scope: 'world',
		config: true,
		type: Boolean,
		default: false
	} );

	/** register setting for tooltip display delay **/
	( game as any ).settings.register( 'yugen-modifiers', 'tooltip-delay', 
	{
		name: 'yugen-modifiers.settings.tooltip-delay.name',
		hint: 'yugen-modifiers.settings.tooltip-delay.hint',
		scope: 'client',
		config: true,
		type: Number,
		default: 150
	} );

	/** register setting for enabling tooltip pinning **/
	( game as any ).settings.register( 'yugen-modifiers', 'enable-pinning', 
	{
		name: 'yugen-modifiers.settings.enable-pinning.name',
		hint: 'yugen-modifiers.settings.enable-pinning.hint',
		scope: 'client',
		config: true,
		type: Boolean,
		default: true
	} );
};
