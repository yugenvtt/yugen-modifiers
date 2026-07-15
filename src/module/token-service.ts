/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file src/module/token-service.ts
 * handles re-evaluating and updating token images based on equipped item state.
 **/

import { is_item_equipped } from './utils.js';

/**
 * re-evaluates the actor's equipped items and updates prototype and scene tokens.
 **/
export async function reevaluate_token_image( actor: any ): Promise<void> 
{
	if ( !actor ) 
	{
		return;
	}

	/**
	 * check if token configurations are enabled
	 **/
	if ( !( game as any ).settings.get( 'yugen-modifiers', 'enable-token-configurations' ) ) 
	{
		return;
	}

	let default_img = ( globalThis as any ).yugen_utils.get_flag( actor, 'yugen-modifiers', 'default_image' );
	if ( !default_img ) 
	{
		default_img = actor.prototypeToken?.texture?.src || '';
		/** save current prototype token image as default reference **/
		await ( globalThis as any ).yugen_utils.set_flag( actor, 'yugen-modifiers', 'default_image', default_img, { yugen_modifier_update: true } );
	}

	const configs = ( globalThis as any ).yugen_utils.get_flag( actor, 'yugen-modifiers', 'configurations' ) || [ ];
	const last_equipped_id = ( globalThis as any ).yugen_utils.get_flag( actor, 'yugen-modifiers', 'last_equipped_id' );

	/** filter configured items that are currently equipped **/
	const equipped_configs = configs.filter( ( c: any ) => 
	{
		const item = actor.items.get( c.itemId );
		return item && is_item_equipped( item );
	} );

	let target_img = default_img;

	if ( equipped_configs.length > 0 ) 
	{
		/** look for the latest equipped item configuration **/
		let selected_config = equipped_configs.find( ( c: any ) => 
		{
			return c.itemId === last_equipped_id;
		} );

		if ( !selected_config ) 
		{
			/** fallback to the first equipped item configuration **/
			selected_config = equipped_configs[ 0 ];
		}

		target_img = selected_config.imagePath || default_img;
	}

	const current_proto_img = actor.prototypeToken?.texture?.src;

	/** update prototype token if image changed **/
	if ( target_img && current_proto_img !== target_img ) 
	{
		/** update actor prototype token texture path **/
		await actor.update( { 'prototypeToken.texture.src': target_img }, { yugen_modifier_update: true } );
	}

	/** update all active tokens in the current scene **/
	const tokens = actor.getActiveTokens( );
	for ( const token of tokens ) 
	{
		const current_token_img = token.document.texture?.src;
		if ( target_img && current_token_img !== target_img ) 
		{
			/** update scene token texture path **/
			await token.document.update( { 'texture.src': target_img } );
		}
	}
}
