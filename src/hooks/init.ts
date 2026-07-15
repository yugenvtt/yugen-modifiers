/**
 * @file src/hooks/init.ts
 * registers settings and initializes the module.
 **/

import { RollParser } from '../module/roll-parser.js';
import { hover_token_hook } from './hover-token.js';
import { get_scene_control_buttons_hook } from './get-scene-control-buttons.js';
import { update_item_hook } from './update-item.js';
import { delete_item_hook } from './delete-item.js';
import { update_actor_hook } from './update-actor.js';
import { update_token_hook } from './update-token.js';

export const init_hook = ( ) => 
{
	/** initialize the module **/
	Hooks.once( 'init', async ( ) => 
	{
		register_settings( );
		RollParser.activate_listeners( );
		hover_token_hook( );
		get_scene_control_buttons_hook( );
		update_item_hook( );
		delete_item_hook( );
		update_actor_hook( );
		update_token_hook( );
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

	/** register setting for enabling token hover effects **/
	( game as any ).settings.register( 'yugen-modifiers', 'enable-token-hover-effects', 
	{
		name: 'yugen-modifiers.settings.enable-token-hover-effects.name',
		hint: 'yugen-modifiers.settings.enable-token-hover-effects.hint',
		scope: 'client',
		config: true,
		type: Boolean,
		default: true
	} );

	/**
	 * register setting for enabling token configurations
	 **/
	( game as any ).settings.register( 'yugen-modifiers', 'enable-token-configurations', 
	{
		name: 'yugen-modifiers.settings.enable-token-configurations.name',
		hint: 'yugen-modifiers.settings.enable-token-configurations.hint',
		scope: 'world',
		config: true,
		type: Boolean,
		default: true
	} );

	/** register setting for showing non-physical weapons **/
	( game as any ).settings.register( 'yugen-modifiers', 'show-non-physical-weapons', 
	{
		name: 'yugen-modifiers.settings.show-non-physical-weapons.name',
		hint: 'yugen-modifiers.settings.show-non-physical-weapons.hint',
		scope: 'world',
		config: true,
		type: Boolean,
		default: false
	} );

	/** register setting for showing equipped armor **/
	( game as any ).settings.register( 'yugen-modifiers', 'show-equipped-armor', 
	{
		name: 'yugen-modifiers.settings.show-equipped-armor.name',
		hint: 'yugen-modifiers.settings.show-equipped-armor.hint',
		scope: 'world',
		config: true,
		type: Boolean,
		default: true
	} );

	/** register setting for hiding token name **/
	( game as any ).settings.register( 'yugen-modifiers', 'hide-token-name', 
	{
		name: 'yugen-modifiers.settings.hide-token-name.name',
		hint: 'yugen-modifiers.settings.hide-token-name.hint',
		scope: 'client',
		config: true,
		type: Boolean,
		default: true
	} );

	/** register setting for showing token race **/
	( game as any ).settings.register( 'yugen-modifiers', 'show-token-race', 
	{
		name: 'yugen-modifiers.settings.show-token-race.name',
		hint: 'yugen-modifiers.settings.show-token-race.hint',
		scope: 'client',
		config: true,
		type: Boolean,
		default: false
	} );

	/** register setting for enabling health condition **/
	( game as any ).settings.register( 'yugen-modifiers', 'enable-health-condition', 
	{
		name: 'yugen-modifiers.settings.enable-health-condition.name',
		hint: 'yugen-modifiers.settings.enable-health-condition.hint',
		scope: 'client',
		config: true,
		type: Boolean,
		default: true
	} );

	/** register setting for 100% health label **/
	( game as any ).settings.register( 'yugen-modifiers', 'health-label-100', 
	{
		name: 'yugen-modifiers.settings.health-label-100.name',
		hint: 'yugen-modifiers.settings.health-label-100.hint',
		scope: 'world',
		config: true,
		type: String,
		default: 'Healthy'
	} );

	/** register setting for 75% health label **/
	( game as any ).settings.register( 'yugen-modifiers', 'health-label-75', 
	{
		name: 'yugen-modifiers.settings.health-label-75.name',
		hint: 'yugen-modifiers.settings.health-label-75.hint',
		scope: 'world',
		config: true,
		type: String,
		default: 'Injured'
	} );

	/** register setting for 50% health label **/
	( game as any ).settings.register( 'yugen-modifiers', 'health-label-50', 
	{
		name: 'yugen-modifiers.settings.health-label-50.name',
		hint: 'yugen-modifiers.settings.health-label-50.hint',
		scope: 'world',
		config: true,
		type: String,
		default: 'Wounded'
	} );

	/** register setting for 25% health label **/
	( game as any ).settings.register( 'yugen-modifiers', 'health-label-25', 
	{
		name: 'yugen-modifiers.settings.health-label-25.name',
		hint: 'yugen-modifiers.settings.health-label-25.hint',
		scope: 'world',
		config: true,
		type: String,
		default: 'Severely Wounded'
	} );

	/** register setting for 10% health label **/
	( game as any ).settings.register( 'yugen-modifiers', 'health-label-10', 
	{
		name: 'yugen-modifiers.settings.health-label-10.name',
		hint: 'yugen-modifiers.settings.health-label-10.hint',
		scope: 'world',
		config: true,
		type: String,
		default: 'Near Death'
	} );

	/** register setting for 0% health label **/
	( game as any ).settings.register( 'yugen-modifiers', 'health-label-0', 
	{
		name: 'yugen-modifiers.settings.health-label-0.name',
		hint: 'yugen-modifiers.settings.health-label-0.hint',
		scope: 'world',
		config: true,
		type: String,
		default: 'Dead'
	} );
};
